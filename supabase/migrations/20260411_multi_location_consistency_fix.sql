-- ==========================================
-- SQL Migration: Multi-Location Consistency & Bug Fix
-- Date: 2026-04-11
-- Description:
-- 1. Fixes branch creation error by adding phone/email to outlets.
-- 2. Makes Waitlists branch-aware (outlet_id).
-- 3. Updates Atomic Booking RPCs to preserve branch identity.
-- 4. Enables branch-level earnings filtering.
-- ==========================================

-- 1. SCHEMA UPDATES (Outlets & Waitlist)
ALTER TABLE public.outlets 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_outlet_id ON public.waitlist(outlet_id);
CREATE INDEX IF NOT EXISTS idx_bookings_outlet_id ON public.bookings(outlet_id);

-- 2. UPDATE BOOK_SLOT_ATOMIC (Standard Booking Flow)
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
    p_origin TEXT = 'marketplace',
    p_outlet_id UUID = NULL -- NEW Parameter
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
    v_actual_outlet_id UUID;
BEGIN
    -- 1. Lock and Verify Parent Slot
    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Parent slot not found (ID: %)', p_slot_id; END IF;
    IF NOT v_parent_slot.is_available THEN RAISE EXCEPTION 'Slot is no longer available'; END IF;

    -- Resolve Outlet ID (Parameter takes priority, fallback to slot's parent outlet)
    v_actual_outlet_id := COALESCE(p_outlet_id, v_parent_slot.outlet_id);

    -- 2. Instructor overlap check
    IF EXISTS (
        SELECT 1 FROM bookings b JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id 
          AND (b.status = 'approved' OR (b.status = 'pending' AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP)))
          AND s.date = v_parent_slot.date
          AND (s.start_time, s.end_time) OVERLAPS (COALESCE(p_req_start_time, v_parent_slot.start_time), COALESCE(p_req_end_time, v_parent_slot.end_time))
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this time slot';
    END IF;

    -- 3. Inventory Deduction
    v_parent_equipment := v_parent_slot.equipment;
    v_parent_quantity := COALESCE(v_parent_slot.quantity, 0);
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    
    IF v_available_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient inventory';
    END IF;

    v_new_equipment := jsonb_set(v_parent_equipment, string_to_array(p_equipment_key, ','), to_jsonb(v_available_qty - p_quantity));
    v_parent_quantity := GREATEST(0, v_parent_quantity - p_quantity);

    IF v_parent_quantity <= 0 THEN
        DELETE FROM slots WHERE id = p_slot_id;
    ELSE
        UPDATE slots SET equipment = v_new_equipment, equipment_inventory = v_new_equipment, quantity = v_parent_quantity WHERE id = p_slot_id;
    END IF;

    -- 4. Create Extracted Slot (Preserving Outlet)
    INSERT INTO slots (
        studio_id, outlet_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
    ) VALUES (
        v_parent_slot.studio_id, v_actual_outlet_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time,
        false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity
    ) RETURNING id INTO v_extracted_slot_id;

    v_final_slot_id := v_extracted_slot_id;

    -- 5. Wallet Deduction
    IF p_wallet_deduction > 0 THEN
        PERFORM deduct_available_balance(p_client_id, p_wallet_deduction);
    END IF;

    -- 6. Insert Booking Record (Preserving Outlet)
    v_expires_at := CURRENT_TIMESTAMP + interval '15 minutes';
    INSERT INTO bookings (
        slot_id, instructor_id, client_id, studio_id, outlet_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, expires_at, origin
    ) VALUES (
        v_final_slot_id, p_instructor_id, p_client_id, v_parent_slot.studio_id, v_actual_outlet_id,
        'pending', p_equipment_key, p_db_price, p_price_breakdown, p_quantity, ARRAY[v_final_slot_id], v_expires_at, p_origin
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

-- 3. UPDATE BOOK_SLOT_WITH_PACKAGE_CREDIT (Package Booking Flow)
CREATE OR REPLACE FUNCTION book_slot_with_package_credit(
    p_slot_id UUID,
    p_instructor_id UUID,
    p_client_id UUID,
    p_plan_id UUID,
    p_equipment_key TEXT,
    p_quantity INT,
    p_price_breakdown JSONB,
    p_req_start_time TIME = NULL,
    p_req_end_time TIME = NULL,
    p_origin TEXT DEFAULT 'studio',
    p_outlet_id UUID = NULL -- NEW Parameter
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credit_result JSONB;
    v_parent_slot RECORD;
    v_extracted_slot_id UUID;
    v_booking_id UUID;
    v_available_qty INT;
    v_parent_equipment JSONB;
    v_parent_quantity INT;
    v_new_equipment JSONB;
    v_actual_outlet_id UUID;
BEGIN
    -- 1. Consume the Credit
    v_credit_result := public.consume_package_credit(p_plan_id, p_quantity);
    IF NOT (v_credit_result->>'success')::BOOLEAN THEN RAISE EXCEPTION '%', v_credit_result->>'error'; END IF;

    -- 2. Lock and Verify Parent Slot
    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
    IF NOT v_parent_slot.is_available THEN RAISE EXCEPTION 'Slot no longer available'; END IF;

    v_actual_outlet_id := COALESCE(p_outlet_id, v_parent_slot.outlet_id);

    -- 3. Instructor overlap check
    IF EXISTS (
        SELECT 1 FROM bookings b JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id AND b.status IN ('approved', 'pending')
          AND s.date = v_parent_slot.date
          AND (s.start_time, s.end_time) OVERLAPS (COALESCE(p_req_start_time, v_parent_slot.start_time), COALESCE(p_req_end_time, v_parent_slot.end_time))
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this time slot';
    END IF;

    -- 4. Inventory Deduction
    v_parent_equipment := v_parent_slot.equipment;
    v_parent_quantity := COALESCE(v_parent_slot.quantity, 0);
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    IF v_available_qty < p_quantity THEN RAISE EXCEPTION 'Insufficient equipment inventory'; END IF;

    v_new_equipment := jsonb_set(v_parent_equipment, string_to_array(p_equipment_key, ','), to_jsonb(v_available_qty - p_quantity));
    v_parent_quantity := GREATEST(0, v_parent_quantity - p_quantity);

    IF v_parent_quantity <= 0 THEN
        DELETE FROM slots WHERE id = p_slot_id;
    ELSE
        UPDATE slots SET equipment = v_new_equipment, equipment_inventory = v_new_equipment, quantity = v_parent_quantity WHERE id = p_slot_id;
    END IF;

    -- 5. Create Extracted Slot and Booking (Preserving Outlet)
    INSERT INTO slots (
        studio_id, outlet_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
    ) VALUES (
        v_parent_slot.studio_id, v_actual_outlet_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time,
        false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity
    ) RETURNING id INTO v_extracted_slot_id;

    INSERT INTO bookings (
        slot_id, instructor_id, client_id, studio_id, outlet_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, payment_method, origin
    ) VALUES (
        v_extracted_slot_id, p_instructor_id, p_client_id, v_parent_slot.studio_id, v_actual_outlet_id,
        'approved', p_equipment_key, 0, p_price_breakdown, p_quantity, ARRAY[v_extracted_slot_id], 'credit', p_origin
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

-- 4. UPDATE JOIN_WAITLIST_ATOMIC (Waitlist Flow)
CREATE OR REPLACE FUNCTION join_waitlist_atomic(
    p_slot_id UUID,
    p_client_id UUID,
    p_equipment_key TEXT,
    p_quantity INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_studio_id UUID;
    v_outlet_id UUID;
    v_waitlist_limit INT;
    v_current_count INT;
    v_waitlist_id UUID;
BEGIN
    -- 1. Get context and limit
    SELECT s.studio_id, s.outlet_id, st.waitlist_limit 
    INTO v_studio_id, v_outlet_id, v_waitlist_limit
    FROM slots s
    JOIN studios st ON s.studio_id = st.id
    WHERE s.id = p_slot_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;

    -- 2. Check if already on waitlist
    IF EXISTS (SELECT 1 FROM waitlist WHERE slot_id = p_slot_id AND client_id = p_client_id) THEN
        RAISE EXCEPTION 'You are already on the waitlist for this class';
    END IF;

    -- 3. Check limit
    IF v_waitlist_limit > 0 THEN
        SELECT COUNT(*) INTO v_current_count FROM waitlist WHERE slot_id = p_slot_id AND status = 'waiting';
        IF v_current_count >= v_waitlist_limit THEN RAISE EXCEPTION 'The waitlist for this class is full'; END IF;
    END IF;

    -- 4. Join (Preserving Outlet)
    INSERT INTO waitlist (slot_id, client_id, studio_id, outlet_id, equipment_key, quantity)
    VALUES (p_slot_id, p_client_id, v_studio_id, v_outlet_id, p_equipment_key, p_quantity)
    RETURNING id INTO v_waitlist_id;

    RETURN jsonb_build_object('success', true, 'waitlist_id', v_waitlist_id, 'position', v_current_count + 1);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. UPDATE GET_STUDIO_EARNINGS_V2 (Reporting Flow)
CREATE OR REPLACE FUNCTION get_studio_earnings_v2(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL -- NEW Parameter
)
RETURNS JSONB AS $$
DECLARE
    v_owner_id UUID;
    v_available_balance NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_payout_approval_status TEXT;
BEGIN
    -- 1. Get Studio context
    SELECT owner_id, payout_approval_status INTO v_owner_id, v_payout_approval_status
    FROM studios WHERE id = p_studio_id;

    -- 2. Unified Data Fetching
    RETURN (
        WITH sb AS (
            SELECT 
                b.id as booking_id, b.created_at as booking_created_at, b.updated_at as booking_updated_at,
                b.status::TEXT as booking_status, b.payment_status as booking_payment_status, b.price_breakdown as pb,
                b.origin as tx_origin, s.date as session_date, s.start_time as session_time,
                cp.full_name as client_name, ip.full_name as instructor_name
            FROM bookings b
            LEFT JOIN slots s ON b.slot_id = s.id
            JOIN profiles cp ON b.client_id = cp.id
            LEFT JOIN profiles ip ON b.instructor_id = ip.id
            WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
            AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id) -- BRANCH FILTER
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
                booking_created_at as tx_date, 'Booking' as type, booking_status as status,
                COALESCE(client_name, 'Client') as client, COALESCE(instructor_name, 'Instructor') as instructor,
                (pb->>'studio_fee')::NUMERIC as amount, session_date, session_time,
                (pb->>'quantity') || ' x ' || (pb->>'equipment') as details, tx_origin as origin
            FROM sb WHERE booking_status != 'cancelled_refunded'
            UNION ALL
            SELECT 
                booking_created_at, 'Refund', 'cancelled_refunded', client_name, instructor_name,
                0, session_date, session_time, 'Refunded session', tx_origin as origin
            FROM sb WHERE booking_status = 'cancelled_refunded'
        )
        SELECT jsonb_agg(row_to_json(t)) FROM (
            SELECT 
                (SELECT row_to_json(stats.*) FROM stats) as summary,
                (SELECT jsonb_agg(tx ORDER BY tx_date DESC) FROM all_tx tx) as transactions
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
