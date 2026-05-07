-- Migration: 20260419_security_lockdown.sql
-- Goal: Fix Red Flags #1, #5, and #17 (Ownership Gating & Wallet Refunds)

-- 1. Update release_booking_atomic to handle Wallet Refunds (Red Flag #17)
CREATE OR REPLACE FUNCTION public.release_booking_atomic(p_booking_id UUID, p_new_status TEXT DEFAULT 'expired')
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_slot RECORD;
    v_parent_slot RECORD;
    v_equipment_key TEXT;
    v_quantity INT;
    v_refund_amount NUMERIC;
BEGIN
    -- Lock booking
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;

    -- Only allow release if not already processed
    IF v_booking.status IN ('approved', 'completed', 'cancelled_charged', 'cancelled_refunded', 'expired') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking already finalized');
    END IF;

    -- 1. Process Wallet Refund (Red Flag #17 Fix)
    v_refund_amount := COALESCE((v_booking.price_breakdown->>'wallet_deduction')::NUMERIC, 0);
    
    IF v_refund_amount > 0 AND (v_booking.price_breakdown->>'refund_processed')::BOOLEAN IS NOT TRUE THEN
        -- Refund to Marketplace or Studio Wallet based on source
        IF (v_booking.price_breakdown->>'wallet_source') = 'studio' THEN
            UPDATE public.customer_memberships
            SET available_balance = available_balance + v_refund_amount, updated_at = now()
            WHERE user_id = v_booking.client_id AND studio_id = v_booking.studio_id;
        ELSE
            UPDATE public.profiles
            SET available_balance = available_balance + v_refund_amount, updated_at = now()
            WHERE id = v_booking.client_id;
        END IF;

        -- Log Refund in wallet_top_ups for audit trail
        INSERT INTO public.wallet_top_ups (
            user_id, studio_id, amount, status, type, admin_notes, created_at
        ) VALUES (
            v_booking.client_id, 
            CASE WHEN (v_booking.price_breakdown->>'wallet_source') = 'studio' THEN v_booking.studio_id ELSE NULL END,
            v_refund_amount, 
            'approved', 
            'refund', 
            'Automatic refund for ' || p_new_status || ' booking',
            now()
        );

        -- Mark as refunded in price_breakdown to prevent double-refunds (Idempotency)
        UPDATE public.bookings 
        SET price_breakdown = price_breakdown || jsonb_build_object('refund_processed', true, 'refund_amount', v_refund_amount)
        WHERE id = p_booking_id;
    END IF;

    -- 2. Lock slot and Re-merge
    SELECT * INTO v_slot FROM slots WHERE id = v_booking.slot_id FOR UPDATE;
    
    IF v_slot.parent_slot_id IS NOT NULL THEN
        SELECT * INTO v_parent_slot FROM slots WHERE id = v_slot.parent_slot_id FOR UPDATE;
        
        IF FOUND THEN
            v_equipment_key := v_booking.equipment;
            v_quantity := v_booking.quantity;
            
            UPDATE slots 
            SET quantity = quantity + v_quantity,
                equipment = jsonb_set(equipment, ARRAY[v_equipment_key], to_jsonb(COALESCE((equipment->>v_equipment_key)::INT, 0) + v_quantity)),
                equipment_inventory = jsonb_set(equipment_inventory, ARRAY[v_equipment_key], to_jsonb(COALESCE((equipment_inventory->>v_equipment_key)::INT, 0) + v_quantity)),
                is_available = true
            WHERE id = v_slot.parent_slot_id;
            
            -- Delete the extracted slot to clean up
            DELETE FROM slots WHERE id = v_booking.slot_id;
        ELSE
            UPDATE slots SET is_available = true WHERE id = v_booking.slot_id;
        END IF;
    ELSE
        UPDATE slots SET is_available = true WHERE id = v_booking.slot_id;
    END IF;

    -- Update booking status
    UPDATE bookings SET status = p_new_status, updated_at = NOW() WHERE id = p_booking_id;

    RETURN jsonb_build_object('success', true, 'refunded', v_refund_amount > 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update get_studio_earnings_v2 with Ownership Gating (Red Flag #1)
CREATE OR REPLACE FUNCTION public.get_studio_earnings_v3(
    p_studio_id UUID,
    p_caller_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_owner_id UUID;
    v_available_balance NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_payout_approval_status TEXT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Authorization Check (Owner or Staff)
    SELECT owner_id, payout_approval_status 
    INTO v_owner_id, v_payout_approval_status
    FROM public.studios WHERE id = p_studio_id;

    IF v_owner_id = p_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.studio_members 
            WHERE studio_id = p_studio_id AND profile_id = p_caller_id
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not have access to this studio';
    END IF;

    -- 2. Owner Balance
    SELECT available_balance, pending_balance
    INTO v_available_balance, v_pending_balance
    FROM public.profiles WHERE id = v_owner_id;

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
                b.origin as tx_origin,
                s.date as session_date,
                s.start_time as session_time,
                cp.full_name as client_name,
                ip.full_name as instructor_name
            FROM public.bookings b
            LEFT JOIN public.slots s ON b.slot_id = s.id
            JOIN public.profiles cp ON b.client_id = cp.id
            LEFT JOIN public.profiles ip ON b.instructor_id = ip.id
            WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
            AND (p_start_date IS NULL OR s.date >= p_start_date OR (s.id IS NULL AND b.created_at::DATE >= p_start_date))
            AND (p_end_date IS NULL OR s.date <= p_end_date OR (s.id IS NULL AND b.created_at::DATE <= p_end_date))
            AND (b.status IN ('approved', 'completed', 'cancelled_charged', 'cancelled_refunded') OR b.status = 'pending')
        ),
        stats AS (
            SELECT
                (
                    COALESCE(SUM(CASE WHEN (booking_status IN ('approved', 'completed') OR (booking_status = 'pending' AND booking_payment_status = 'submitted') OR (booking_status = 'cancelled_charged' AND NOT (pb->>'refund_initiator' = 'client'))) THEN (pb->>'studio_fee')::NUMERIC ELSE 0 END), 0) +
                    COALESCE((SELECT SUM(total_amount) FROM public.customer_plans WHERE studio_id = p_studio_id AND status IN ('active', 'pending_payment')), 0)
                ) as gross,
                COALESCE(SUM(CASE WHEN (pb->>'penalty_processed')::BOOLEAN = true AND pb->>'refund_initiator' = 'instructor' THEN (pb->>'penalty_amount')::NUMERIC 
                                  WHEN booking_status = 'cancelled_charged' AND pb->>'refund_initiator' = 'client' THEN (pb->>'studio_fee')::NUMERIC
                                  ELSE 0 END), 0) as compensation,
                COALESCE(SUM(CASE WHEN (pb->>'penalty_processed')::BOOLEAN = true AND pb->>'refund_initiator' = 'studio' THEN (pb->>'penalty_amount')::NUMERIC ELSE 0 END), 0) as penalty
            FROM sb
        ),
        all_tx AS (
            -- Bookings, Refunds, Sales, Payouts, Top-Ups (Unified)
            SELECT tx_date, type, status, client, instructor, amount, session_date, session_time, details, origin, reference_id FROM (
                SELECT booking_created_at as tx_date, 'Booking' as type, booking_status as status, client_name as client, instructor_name as instructor, (pb->>'studio_fee')::NUMERIC as amount, session_date, session_time, (pb->>'quantity') || ' x ' || (pb->>'equipment') as details, tx_origin as origin, booking_id::TEXT as reference_id FROM sb WHERE booking_status != 'cancelled_refunded'
                UNION ALL
                SELECT booking_created_at, 'Refund', 'cancelled_refunded', client_name, instructor_name, 0, session_date, session_time, 'Refunded session', tx_origin as origin, booking_id::TEXT FROM sb WHERE booking_status = 'cancelled_refunded'
                UNION ALL
                SELECT cp.created_at, 'Sale', cp.status::TEXT, cp_profile.full_name, 'System', cp.total_amount, NULL, NULL, COALESCE(p.name, m.name) || ' Purchase', cp.payment_method, cp.id::TEXT FROM public.customer_plans cp JOIN public.profiles cp_profile ON cp.user_id = cp_profile.id LEFT JOIN public.packages p ON cp.package_id = p.id LEFT JOIN public.memberships m ON cp.membership_id = m.id WHERE cp.studio_id = p_studio_id AND cp.status IN ('active', 'pending_payment')
                UNION ALL
                SELECT created_at, 'Payout', status::TEXT, 'System', 'Staff', -amount, NULL, NULL, 'Withdrawal via ' || payment_method, 'studio', id::TEXT FROM public.payout_requests WHERE studio_id = p_studio_id
                UNION ALL
                SELECT COALESCE(processed_at, updated_at, created_at), CASE WHEN type = 'admin_adjustment' THEN 'Adjustment' ELSE 'Top-Up' END, status::TEXT, 'Admin', 'System', amount, NULL, NULL, COALESCE(admin_notes, 'Manual balance adjustment'), 'studio', id::TEXT FROM public.wallet_top_ups WHERE studio_id = p_studio_id AND status = 'approved'
            ) t
        )
        SELECT jsonb_build_object(
            'bookings', COALESCE((SELECT jsonb_agg(row_to_json(sb.*)) FROM sb), '[]'::jsonb),
            'payouts', COALESCE((SELECT jsonb_agg(p ORDER BY created_at DESC) FROM public.payout_requests p WHERE studio_id = p_studio_id), '[]'::jsonb),
            'transactions', COALESCE((SELECT jsonb_agg(tx ORDER BY tx_date DESC) FROM all_tx tx), '[]'::jsonb),
            'summary', jsonb_build_object(
                'totalEarnings', s.gross,
                'totalCompensation', s.compensation,
                'totalPenalty', s.penalty,
                'netEarnings', (s.gross + s.compensation - s.penalty),
                'totalPaidOut', COALESCE((SELECT SUM(amount) FROM public.payout_requests WHERE studio_id = p_studio_id AND status = 'paid'), 0),
                'pendingPayouts', COALESCE((SELECT SUM(amount) FROM public.payout_requests WHERE studio_id = p_studio_id AND status IN ('pending', 'approved')), 0),
                'availableBalance', v_available_balance,
                'pendingBalance', v_pending_balance,
                'payoutApprovalStatus', v_payout_approval_status
            )
        )
        FROM stats s
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update request_payout_atomic_v2 with Ownership Validation (Red Flag #5)
CREATE OR REPLACE FUNCTION public.request_payout_atomic_v3(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_account_name TEXT,
    p_account_number TEXT,
    p_bank_name TEXT DEFAULT NULL,
    p_studio_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance NUMERIC;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Authorization Check (Red Flag #5 Fix)
    -- If p_studio_id is provided, the user must be the owner of that studio
    IF p_studio_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = p_user_id
        ) INTO v_is_authorized;
        
        IF NOT v_is_authorized THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not own this studio');
        END IF;
    END IF;

    -- 2. Fetch and lock profile for the user
    SELECT available_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    -- 3. Verify sufficient funds
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
    END IF;

    -- 4. Deduct from balance
    UPDATE public.profiles 
    SET available_balance = available_balance - p_amount 
    WHERE id = p_user_id;

    -- 5. Create payout request record
    INSERT INTO public.payout_requests (
        user_id, studio_id, amount, status, payment_method, account_name, account_number, bank_name, created_at
    ) VALUES (
        p_user_id, p_studio_id, p_amount, 'pending', p_method, p_account_name, p_account_number, p_bank_name, NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Update get_studio_dashboard_stats with Ownership Gating (Red Flag #1)
CREATE OR REPLACE FUNCTION public.get_studio_dashboard_stats_v2(
    p_studio_id UUID, 
    p_caller_id UUID,
    p_last_30_days_date DATE,
    p_week_start DATE,
    p_week_end DATE,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_revenue NUMERIC;
    v_top_instructor_name TEXT;
    v_total_spots INT;
    v_booked_spots INT;
    v_revenue_trends JSONB;
    v_is_authorized BOOLEAN := FALSE;
    v_owner_id UUID;
BEGIN
    -- 1. Authorization Check (Owner or Staff)
    SELECT owner_id INTO v_owner_id FROM public.studios WHERE id = p_studio_id;

    IF v_owner_id = p_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.studio_members 
            WHERE studio_id = p_studio_id AND profile_id = p_caller_id
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized: Caller does not have access to this studio';
    END IF;

    -- 1. Monthly Revenue (Last 30 Days)
    SELECT COALESCE(SUM((price_breakdown->>'studio_fee')::NUMERIC), 0)
    INTO v_revenue
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
      AND b.status IN ('approved', 'completed', 'cancelled_charged')
      AND s.date >= p_last_30_days_date;

    -- 2. Top Instructor Name (Last 30 Days)
    SELECT p.full_name
    INTO v_top_instructor_name
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    JOIN profiles p ON b.instructor_id = p.id
    WHERE b.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
      AND b.status IN ('approved', 'completed', 'cancelled_charged')
      AND s.date >= p_last_30_days_date
    GROUP BY p.id, p.full_name
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- 3. Weekly Occupancy (Current Week)
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_total_spots
    FROM slots
    WHERE studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR outlet_id = p_outlet_id)
      AND date >= p_week_start
      AND date <= p_week_end;

    SELECT COUNT(*)
    INTO v_booked_spots
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
      AND b.status IN ('approved', 'pending', 'completed')
      AND s.date >= p_week_start
      AND s.date <= p_week_end;

    -- 4. Revenue Trends (Last 14 Days)
    SELECT jsonb_agg(sub) INTO v_revenue_trends
    FROM (
        SELECT 
            d.date::DATE as date,
            COALESCE(SUM((b.price_breakdown->>'studio_fee')::NUMERIC), 0) as amount,
            COUNT(b.id) as count
        FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d(date)
        LEFT JOIN bookings b ON b.studio_id = p_studio_id 
            AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
            AND b.status IN ('approved', 'completed', 'cancelled_charged')
            AND EXISTS(SELECT 1 FROM slots s WHERE s.id = b.slot_id AND s.date = d.date::DATE)
        GROUP BY d.date
        ORDER BY d.date ASC
    ) sub;

    RETURN jsonb_build_object(
        'revenue', v_revenue,
        'top_instructor', COALESCE(v_top_instructor_name, 'N/A'),
        'total_spots', v_total_spots,
        'booked_spots', v_booked_spots,
        'occupancy_rate', CASE WHEN v_total_spots > 0 THEN ROUND((v_booked_spots::NUMERIC / v_total_spots::NUMERIC) * 100) ELSE 0 END,
        'revenue_trends', COALESCE(v_revenue_trends, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
