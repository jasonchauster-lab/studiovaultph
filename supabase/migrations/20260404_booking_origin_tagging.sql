-- Migration: Add booking origin tagging for Marketplace vs Private Site
-- Date: 2026-04-04

-- 1. Add origin column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'marketplace';
COMMENT ON COLUMN public.bookings.origin IS 'Source of the booking: marketplace or studio (storefront)';

-- 2. Update book_slot_atomic RPC to include origin
CREATE OR REPLACE FUNCTION book_slot_atomic(
    p_slot_id UUID,
    p_instructor_id UUID,
    p_client_id UUID,
    p_equipment_key TEXT,
    p_quantity INT,
    p_db_price NUMERIC,
    p_price_breakdown JSONB,
    p_wallet_deduction NUMERIC = 0,
    p_req_start_time TIME = NULL,
    p_req_end_time TIME = NULL,
    p_origin TEXT = 'marketplace' -- New Parameter
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_slot RECORD;
    v_parent_equipment JSONB;
    v_parent_quantity INT;
    v_extracted_slot_id UUID;
    v_final_slot_id UUID;
    v_booking_id UUID;
    v_available_qty INT;
    v_new_equipment JSONB;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Lock the parent slot to prevent race conditions
    SELECT * INTO v_parent_slot 
    FROM slots 
    WHERE id = p_slot_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent slot not found (ID: %)', p_slot_id;
    END IF;

    IF NOT v_parent_slot.is_available THEN
         RAISE EXCEPTION 'Slot is no longer available';
    END IF;

    -- 1.1 Prevents Instructor Double-Booking Race Condition
    IF EXISTS (
        SELECT 1 
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id
          AND (
            b.status = 'approved'
            OR (b.status = 'pending' AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP))
          )
          AND s.date = v_parent_slot.date
          AND (
            (s.start_time, s.end_time) OVERLAPS (
                COALESCE(p_req_start_time, v_parent_slot.start_time), 
                COALESCE(p_req_end_time, v_parent_slot.end_time)
            )
          )
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this time slot';
    END IF;

    -- 2. Validate and Deduct Inventory
    v_parent_equipment := v_parent_slot.equipment;
    v_parent_quantity := COALESCE(v_parent_slot.quantity, 0);
    
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    
    IF v_available_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient equipment inventory for % (Requested: %, Available: %)', 
            p_equipment_key, p_quantity, v_available_qty;
    END IF;

    v_new_equipment := v_parent_equipment;
    v_new_equipment := jsonb_set(
        v_new_equipment, 
        string_to_array(p_equipment_key, ','), 
        to_jsonb(v_available_qty - p_quantity)
    );

    v_parent_quantity := GREATEST(0, v_parent_quantity - p_quantity);

    IF v_parent_quantity <= 0 THEN
        DELETE FROM slots WHERE id = p_slot_id;
    ELSE
        UPDATE slots 
        SET equipment = v_new_equipment,
            equipment_inventory = v_new_equipment,
            quantity = v_parent_quantity,
            is_available = true
        WHERE id = p_slot_id;
    END IF;

    -- 3. Create Extracted Slot
    INSERT INTO slots (
        studio_id,
        date,
        start_time,
        end_time,
        is_available,
        equipment,
        equipment_inventory,
        quantity
    ) VALUES (
        v_parent_slot.studio_id,
        v_parent_slot.date,
        v_parent_slot.start_time,
        v_parent_slot.end_time,
        false, 
        jsonb_build_object(p_equipment_key, p_quantity),
        jsonb_build_object(p_equipment_key, p_quantity),
        p_quantity
    ) RETURNING id INTO v_extracted_slot_id;

    v_final_slot_id := v_extracted_slot_id;

    -- 4. Handle Time-Splitting
    IF p_req_start_time IS NOT NULL AND p_req_end_time IS NOT NULL THEN
        IF p_req_start_time > v_parent_slot.start_time OR p_req_end_time < v_parent_slot.end_time THEN
            UPDATE slots 
            SET start_time = p_req_start_time, 
                end_time = p_req_end_time
            WHERE id = v_extracted_slot_id;
            
            IF v_parent_slot.start_time < p_req_start_time THEN
                INSERT INTO slots (
                    studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
                ) VALUES (
                    v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, p_req_start_time,
                    true, v_new_equipment, v_new_equipment, v_parent_quantity
                );
            END IF;

            IF p_req_end_time < v_parent_slot.end_time THEN
                INSERT INTO slots (
                    studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
                ) VALUES (
                    v_parent_slot.studio_id, v_parent_slot.date, p_req_end_time, v_parent_slot.end_time,
                    true, v_new_equipment, v_new_equipment, v_parent_quantity
                );
            END IF;
        END IF;
    END IF;

    -- 5. Wallet Deduction
    IF p_wallet_deduction > 0 THEN
        PERFORM deduct_available_balance(p_client_id, p_wallet_deduction);
    END IF;

    -- 6. Insert Booking Record
    v_expires_at := CURRENT_TIMESTAMP + interval '15 minutes';

    INSERT INTO bookings (
        slot_id,
        instructor_id,
        client_id,
        status,
        equipment,
        total_price,
        price_breakdown,
        quantity,
        booked_slot_ids,
        studio_id,
        expires_at,
        origin -- Added column
    ) VALUES (
        v_final_slot_id,
        p_instructor_id,
        p_client_id,
        'pending',
        p_equipment_key,
        p_db_price,
        p_price_breakdown,
        p_quantity,
        ARRAY[v_final_slot_id],
        v_parent_slot.studio_id,
        v_expires_at,
        p_origin -- Added value
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'final_slot_id', v_final_slot_id,
        'parent_slot_id', p_slot_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Atomic booking failed: % %', SQLERRM, SQLSTATE;
        RAISE;
END;
$$;

-- 3. Update book_home_session_atomic RPC to include origin
CREATE OR REPLACE FUNCTION book_home_session_atomic(
    p_instructor_id UUID,
    p_client_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_total_price NUMERIC,
    p_price_breakdown JSONB,
    p_wallet_deduction NUMERIC,
    p_home_address TEXT,
    p_home_lat NUMERIC DEFAULT NULL,
    p_home_lng NUMERIC DEFAULT NULL,
    p_origin TEXT = 'marketplace' -- New Parameter
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Double Booking Check (Instructor)
    IF EXISTS (
        SELECT 1 
        FROM bookings 
        WHERE instructor_id = p_instructor_id 
          AND booking_date = p_date 
          AND status IN ('pending', 'approved')
          AND (booking_start_time, booking_end_time) OVERLAPS (p_start_time, p_end_time)
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this period';
    END IF;

    -- 2. Wallet Deduction
    IF p_wallet_deduction > 0 THEN
        PERFORM deduct_available_balance(p_client_id, p_wallet_deduction);
    END IF;

    -- 3. Create Booking
    v_expires_at := CURRENT_TIMESTAMP + interval '15 minutes';
    
    INSERT INTO bookings (
        instructor_id,
        client_id,
        status,
        total_price,
        location_type,
        home_address,
        home_lat,
        home_lng,
        booking_date,
        booking_start_time,
        booking_end_time,
        price_breakdown,
        expires_at,
        origin -- Added column
    ) VALUES (
        p_instructor_id,
        p_client_id,
        'pending',
        p_total_price,
        'home',
        p_home_address,
        p_home_lat,
        p_home_lng,
        p_date,
        p_start_time,
        p_end_time,
        p_price_breakdown,
        v_expires_at,
        p_origin -- Added parameter
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id
    );
END;
$$;

-- 4. Update get_studio_earnings_v2 RPC to include origin
CREATE OR REPLACE FUNCTION get_studio_earnings_v2(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_owner_id UUID;
    v_available_balance NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_payout_approval_status TEXT;
BEGIN
    -- 1. Get Studio context
    SELECT owner_id, payout_approval_status 
    INTO v_owner_id, v_payout_approval_status
    FROM studios WHERE id = p_studio_id;

    -- 2. Owner Balance
    SELECT available_balance, pending_balance
    INTO v_available_balance, v_pending_balance
    FROM profiles WHERE id = v_owner_id;

    -- 3. Unified Data Fetching
    RETURN (
        WITH sb AS (
            SELECT 
                b.id as booking_id,
                b.created_at as booking_created_at,
                b.updated_at as booking_updated_at,
                b.status::TEXT as booking_status,
                b.payment_status as booking_payment_status,
                b.price_breakdown as pb,
                b.origin as tx_origin, -- Added: Extract origin from bookings table
                s.date as session_date,
                s.start_time as session_time,
                cp.full_name as client_name,
                ip.full_name as instructor_name
            FROM bookings b
            LEFT JOIN slots s ON b.slot_id = s.id
            JOIN profiles cp ON b.client_id = cp.id
            LEFT JOIN profiles ip ON b.instructor_id = ip.id
            WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
            AND (p_start_date IS NULL OR s.date >= p_start_date OR (s.id IS NULL AND b.created_at::DATE >= p_start_date))
            AND (p_end_date IS NULL OR s.date <= p_end_date OR (s.id IS NULL AND b.created_at::DATE <= p_end_date))
            AND (b.status IN ('approved', 'completed', 'cancelled_charged', 'cancelled_refunded') OR b.payment_status = 'submitted')
        ),
        stats AS (
            SELECT
                COALESCE(SUM(CASE WHEN (booking_status IN ('approved', 'completed') OR (booking_status = 'pending' AND booking_payment_status = 'submitted') OR (booking_status = 'cancelled_charged' AND NOT (pb->>'refund_initiator' = 'client'))) THEN (pb->>'studio_fee')::NUMERIC ELSE 0 END), 0) as gross,
                COALESCE(SUM(CASE WHEN (pb->>'penalty_processed')::BOOLEAN = true AND pb->>'refund_initiator' = 'instructor' THEN (pb->>'penalty_amount')::NUMERIC 
                                  WHEN booking_status = 'cancelled_charged' AND pb->>'refund_initiator' = 'client' THEN (pb->>'studio_fee')::NUMERIC
                                  ELSE 0 END), 0) as compensation,
                COALESCE(SUM(CASE WHEN (pb->>'penalty_processed')::BOOLEAN = true AND pb->>'refund_initiator' = 'studio' THEN (pb->>'penalty_amount')::NUMERIC ELSE 0 END), 0) as penalty
            FROM sb
        ),
        all_tx AS (
            SELECT 
                booking_created_at as tx_date,
                'Booking' as type,
                booking_status as status,
                COALESCE(client_name, 'Client') as client,
                COALESCE(instructor_name, 'Instructor') as instructor,
                (pb->>'studio_fee')::NUMERIC as amount,
                session_date,
                session_time,
                (pb->>'quantity') || ' x ' || (pb->>'equipment') as details,
                tx_origin as origin -- Added: Include origin in transaction list
            FROM sb
            WHERE booking_status != 'cancelled_refunded'

            UNION ALL

            SELECT 
                booking_created_at,
                'Refund',
                'cancelled_refunded',
                client_name,
                instructor_name,
                0,
                session_date,
                session_time,
                'Refunded session',
                tx_origin as origin -- Added: Include origin in refunds
            FROM sb
            WHERE booking_status = 'cancelled_refunded'

            UNION ALL

            SELECT 
                booking_updated_at,
                'Compensation',
                'processed',
                client_name,
                instructor_name,
                CASE 
                    WHEN pb->>'refund_initiator' = 'instructor' THEN (pb->>'penalty_amount')::NUMERIC
                    ELSE (pb->>'studio_fee')::NUMERIC
                END,
                session_date,
                session_time,
                'Cancellation compensation',
                tx_origin as origin -- Added: Include origin in compensation
            FROM sb
            WHERE (pb->>'penalty_processed')::BOOLEAN = true AND pb->>'refund_initiator' = 'instructor'
            OR (booking_status = 'cancelled_charged' AND pb->>'refund_initiator' = 'client')

            UNION ALL

            SELECT 
                booking_updated_at,
                'Penalty',
                'processed',
                client_name,
                instructor_name,
                -(pb->>'penalty_amount')::NUMERIC,
                session_date,
                session_time,
                'Late cancellation deduction',
                tx_origin as origin -- Added: Include origin in penalties
            FROM sb
            WHERE (pb->>'penalty_processed')::BOOLEAN = true
            AND pb->>'refund_initiator' = 'studio'

            UNION ALL

            SELECT 
                created_at,
                'Payout',
                status::TEXT,
                'System',
                'Staff',
                -amount,
                NULL::DATE,
                NULL::TIME,
                'Withdrawal via ' || payment_method,
                'studio' as origin -- Withdrawals are always studio-internal
            FROM payout_requests
            WHERE studio_id = p_studio_id
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)
            
            UNION ALL

            SELECT 
                COALESCE(processed_at, updated_at, created_at),
                CASE WHEN type = 'admin_adjustment' THEN 'Adjustment' ELSE 'Top-Up' END,
                status::TEXT,
                'Admin',
                'System',
                amount,
                NULL::DATE,
                NULL::TIME,
                COALESCE(admin_notes, 'Manual balance adjustment'),
                'studio' as origin -- Adjustments are studio-internal
            FROM wallet_top_ups
            WHERE user_id = v_owner_id
            AND status = 'approved'
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)
        )
        SELECT jsonb_build_object(
            'bookings', COALESCE((SELECT jsonb_agg(row_to_json(sb.*)) FROM sb), '[]'::jsonb),
            'payouts', COALESCE((SELECT jsonb_agg(p ORDER BY created_at DESC) FROM payout_requests p WHERE studio_id = p_studio_id), '[]'::jsonb),
            'transactions', COALESCE((SELECT jsonb_agg(tx ORDER BY tx_date DESC) FROM all_tx tx), '[]'::jsonb),
            'summary', jsonb_build_object(
                'totalEarnings', s.gross,
                'totalCompensation', s.compensation,
                'totalPenalty', s.penalty,
                'netEarnings', (s.gross + s.compensation - s.penalty),
                'totalPaidOut', COALESCE((SELECT SUM(amount) FROM payout_requests WHERE studio_id = p_studio_id AND status = 'paid'), 0),
                'pendingPayouts', COALESCE((SELECT SUM(amount) FROM payout_requests WHERE studio_id = p_studio_id AND status IN ('pending', 'approved')), 0),
                'availableBalance', v_available_balance,
                'pendingBalance', v_pending_balance,
                'payoutApprovalStatus', v_payout_approval_status
            )
        )
        FROM stats s
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
