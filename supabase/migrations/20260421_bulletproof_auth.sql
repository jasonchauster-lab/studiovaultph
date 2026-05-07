
-- HARDENING RPCs to use auth.uid() directly instead of taking caller_id as an argument.
-- This prevents IDOR where an attacker could call the RPC with someone else's UUID.

-- 1. HARDEN cancel_booking_atomic_v2
CREATE OR REPLACE FUNCTION cancel_booking_atomic_v3(
    p_booking_id UUID, 
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    booking_rec RECORD;
    breakdown JSONB;
    refund_amount NUMERIC;
    wallet_deduction NUMERIC;
    total_price NUMERIC;
    penalty_amount NUMERIC := 0;
    penalty_processed BOOLEAN := FALSE;
    strike_logged BOOLEAN := FALSE;
    is_suspended BOOLEAN := FALSE;
    all_slot_ids UUID[];
    now_ts TIMESTAMP WITH TIME ZONE := NOW();
    session_start_ts TIMESTAMP WITH TIME ZONE;
    diff_hours NUMERIC;
    is_late BOOLEAN;
    is_within_grace BOOLEAN;
    strike_count INT;
    v_equipment_key TEXT;
    v_plan_id UUID;
    v_quantity INT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Fetch and lock booking
    SELECT b.*, s.date as slot_date, s.start_time as slot_start, st.id as studio_id, st.name as studio_name, st.owner_id as studio_owner_id
    INTO booking_rec
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    JOIN studios st ON s.studio_id = st.id
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    -- AUTH CHECK: Must be Owner, Instructor of the booking, or a staff member with manage_schedule permission
    IF booking_rec.studio_owner_id = v_caller_id OR booking_rec.instructor_id = v_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
            WHERE m.studio_id = booking_rec.studio_id AND m.profile_id = v_caller_id AND (r.permissions->>'manage_schedule')::BOOLEAN = true
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    IF booking_rec.status IN ('cancelled_refunded', 'cancelled_charged', 'rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking already cancelled or rejected');
    END IF;

    -- 2. Context
    session_start_ts := (booking_rec.slot_date || ' ' || booking_rec.slot_start || '+08')::TIMESTAMP WITH TIME ZONE;
    diff_hours := EXTRACT(EPOCH FROM (session_start_ts - now_ts)) / 3600;
    is_late := diff_hours < 24;
    is_within_grace := booking_rec.approved_at IS NULL OR (EXTRACT(EPOCH FROM (now_ts - booking_rec.approved_at)) <= 900);
    v_equipment_key := booking_rec.equipment;
    v_plan_id := booking_rec.plan_id;
    v_quantity := booking_rec.quantity;

    -- 3. Calculate Amounts (Cash)
    breakdown := booking_rec.price_breakdown;
    wallet_deduction := COALESCE((breakdown->>'wallet_deduction')::NUMERIC, 0);
    total_price := COALESCE(booking_rec.total_price, 0);
    refund_amount := total_price + wallet_deduction;

    -- Penalty Logic (if late and NOT within grace)
    IF is_late AND NOT is_within_grace THEN
        penalty_amount := COALESCE((breakdown->>'studio_fee')::NUMERIC, 0);
    END IF;

    -- 4. Execute State Changes
    -- A. Update Booking Status
    UPDATE bookings 
    SET status = 'cancelled_refunded', 
        cancel_reason = p_reason, 
        cancelled_by = v_caller_id,
        updated_at = now_ts,
        price_breakdown = breakdown || jsonb_build_object(
            'refunded_amount', refund_amount,
            'penalty_amount', penalty_amount,
            'refund_initiator', CASE WHEN v_caller_id = booking_rec.studio_owner_id THEN 'studio' ELSE 'instructor' END
        )
    WHERE id = p_booking_id;

    -- B. Refund Client (Cash/Wallet)
    IF refund_amount > 0 THEN
        UPDATE profiles 
        SET available_balance = available_balance + refund_amount 
        WHERE id = booking_rec.client_id;
        
        INSERT INTO wallet_top_ups (user_id, amount, status, type, admin_notes, studio_id)
        VALUES (booking_rec.client_id, refund_amount, 'approved', 'refund', 'Refund for ' || booking_rec.status || ' booking ' || substr(p_booking_id::text, 1, 8), booking_rec.studio_id);
    END IF;

    -- C. RESTORE CREDITS
    IF booking_rec.payment_method = 'credit' AND v_plan_id IS NOT NULL THEN
        UPDATE public.customer_plans
        SET remaining_credits = remaining_credits + v_quantity,
            updated_at = now_ts
        WHERE id = v_plan_id;
    END IF;

    -- D. Transfer Penalty (Studio <=> Instructor)
    IF penalty_amount > 0 AND v_caller_id = booking_rec.studio_owner_id THEN
        UPDATE profiles SET available_balance = available_balance - penalty_amount WHERE id = booking_rec.studio_owner_id;
        IF booking_rec.instructor_id IS NOT NULL THEN
            UPDATE profiles SET available_balance = available_balance + penalty_amount WHERE id = booking_rec.instructor_id;
            penalty_processed := TRUE;
        END IF;
    ELSIF penalty_amount > 0 AND v_caller_id = booking_rec.instructor_id THEN
        UPDATE profiles SET available_balance = available_balance - penalty_amount WHERE id = booking_rec.instructor_id;
        UPDATE profiles SET available_balance = available_balance + penalty_amount WHERE id = booking_rec.studio_owner_id;
        penalty_processed := TRUE;
    END IF;

    -- E. Log Strike
    IF is_late AND NOT is_within_grace AND v_caller_id = booking_rec.studio_owner_id THEN
        INSERT INTO studio_strikes (studio_id, booking_id, created_at)
        VALUES (booking_rec.studio_id, p_booking_id, now_ts);
        strike_logged := TRUE;

        SELECT COUNT(*) INTO strike_count FROM studio_strikes 
        WHERE studio_id = booking_rec.studio_id AND created_at >= (now_ts - interval '30 days');

        IF strike_count >= 3 THEN
            UPDATE profiles SET is_suspended = TRUE WHERE id = booking_rec.studio_owner_id;
            is_suspended := TRUE;
        END IF;
    END IF;

    -- F. Release Slots & Waitlist
    all_slot_ids := ARRAY[booking_rec.slot_id] || COALESCE(booking_rec.booked_slot_ids, ARRAY[]::UUID[]);
    UPDATE slots SET is_available = TRUE WHERE id = ANY(all_slot_ids);
    PERFORM notify_waitlist_on_release(booking_rec.slot_id, v_equipment_key);

    RETURN jsonb_build_object(
        'success', true, 
        'penalty_processed', penalty_processed, 
        'strike_logged', strike_logged, 
        'is_suspended', is_suspended,
        'studio_name', booking_rec.studio_name,
        'client_id', booking_rec.client_id,
        'instructor_id', booking_rec.instructor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. HARDEN request_payout_atomic_v4 (using auth.uid())
CREATE OR REPLACE FUNCTION request_payout_atomic_v4(
    p_amount NUMERIC,
    p_method TEXT,
    p_account_name TEXT,
    p_account_number TEXT,
    p_bank_name TEXT,
    p_studio_id UUID,
    p_idempotency_key TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_owner_id UUID;
    v_current_balance NUMERIC;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. AUTH CHECK
    SELECT owner_id INTO v_owner_id FROM studios WHERE id = p_studio_id;
    IF v_owner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Studio not found');
    END IF;

    IF v_owner_id = v_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
            WHERE m.studio_id = p_studio_id AND m.profile_id = v_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- 2. Check balance (Pessimistic lock on OWNER)
    SELECT available_balance INTO v_current_balance
    FROM profiles WHERE id = v_owner_id
    FOR UPDATE;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- 3. Perform atomic operation
    INSERT INTO public.payout_requests (
        studio_id, user_id, amount, payment_method, account_name, account_number, bank_name, status, idempotency_key
    ) VALUES (
        p_studio_id, v_caller_id, p_amount, p_method, p_account_name, p_account_number, p_bank_name, 'pending', p_idempotency_key
    );

    UPDATE profiles SET available_balance = available_balance - p_amount WHERE id = v_owner_id;

    RETURN jsonb_build_object('success', true, 'message', 'Payout request submitted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. HARDEN get_studio_earnings_v4 (using auth.uid())
CREATE OR REPLACE FUNCTION get_studio_earnings_v4(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_owner_id UUID;
    v_available_balance NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_payout_approval_status TEXT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- A. AUTH CHECK
    SELECT owner_id INTO v_owner_id FROM studios WHERE id = p_studio_id;
    
    IF v_owner_id = v_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 
            FROM public.studio_members m
            JOIN public.studio_roles r ON m.role = r.id
            WHERE m.studio_id = p_studio_id 
              AND m.profile_id = v_caller_id
              AND (r.permissions->>'view_sales')::BOOLEAN = true
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- B. DATA FETCHING (Using the logic from v3)
    SELECT payout_approval_status INTO v_payout_approval_status FROM studios WHERE id = p_studio_id;
    SELECT available_balance, pending_balance INTO v_available_balance, v_pending_balance FROM profiles WHERE id = v_owner_id;

    RETURN (
        WITH sb AS (
            SELECT 
                b.id as booking_id, b.created_at as booking_created_at, b.updated_at as booking_updated_at,
                b.status::TEXT as booking_status, b.payment_status as booking_payment_status, b.price_breakdown as pb,
                b.origin as tx_origin, s.date as session_date, s.start_time as session_time,
                cp.full_name as client_name, ip.full_name as instructor_name, b.outlet_id
            FROM bookings b
            LEFT JOIN slots s ON b.slot_id = s.id
            JOIN profiles cp ON b.client_id = cp.id
            LEFT JOIN profiles ip ON b.instructor_id = ip.id
            WHERE b.studio_id = p_studio_id
              AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
              AND (p_start_date IS NULL OR (s.date IS NOT NULL AND s.date >= p_start_date))
              AND (p_end_date IS NULL OR (s.date IS NOT NULL AND s.date <= p_end_date))
        ),
        payouts_data AS (
            SELECT id, amount, status, created_at, account_name, account_number, bank_name, payment_method as method
            FROM payout_requests
            WHERE studio_id = p_studio_id
              AND (p_start_date IS NULL OR created_at >= p_start_date)
              AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day'))
            ORDER BY created_at DESC
        ),
        summary_stats AS (
            SELECT 
                COALESCE(SUM((pb->>'studio_fee')::NUMERIC), 0) as total_earnings,
                COALESCE(SUM((pb->>'instructor_fee')::NUMERIC), 0) as total_compensation,
                COALESCE(SUM((pb->>'penalty_amount')::NUMERIC), 0) as total_penalty
            FROM sb WHERE booking_status IN ('approved', 'completed', 'cancelled_refunded', 'cancelled_charged')
        )
        SELECT jsonb_build_object(
            'summary', jsonb_build_object(
                'totalEarnings', ss.total_earnings,
                'totalCompensation', ss.total_compensation,
                'totalPenalty', ss.total_penalty,
                'netEarnings', ss.total_earnings - ss.total_penalty,
                'totalPaidOut', (SELECT COALESCE(SUM(amount), 0) FROM payouts_data WHERE status = 'completed'),
                'pendingPayouts', (SELECT COALESCE(SUM(amount), 0) FROM payouts_data WHERE status = 'pending'),
                'availableBalance', v_available_balance,
                'pendingBalance', v_pending_balance,
                'payoutApprovalStatus', v_payout_approval_status
            ),
            'bookings', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'id', booking_id, 'date', booking_created_at, 'status', booking_status, 'client', client_name, 'amount', (pb->>'total_price')::NUMERIC
            )), '[]'::jsonb) FROM sb),
            'payouts', (SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) FROM payouts_data p),
            'transactions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'tx_date', booking_created_at, 'type', 'sale', 'client', client_name, 'instructor', instructor_name, 
                'amount', (pb->>'total_price')::NUMERIC, 'status', booking_status, 'session_date', session_date, 
                'session_time', session_time, 'origin', tx_origin
            )), '[]'::jsonb) FROM sb)
        )
        FROM summary_stats ss
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. HARDEN get_studio_dashboard_stats_v3 (using auth.uid())
CREATE OR REPLACE FUNCTION get_studio_dashboard_stats_v3(
    p_studio_id UUID, 
    p_last_30_days_date DATE DEFAULT NULL,
    p_week_start DATE DEFAULT NULL,
    p_week_end DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_authorized BOOLEAN := FALSE;
    v_revenue NUMERIC;
    v_active_listings INT;
    v_occupancy NUMERIC;
    v_top_instructor TEXT;
BEGIN
    -- AUTH CHECK
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = v_caller_id
        UNION
        SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
        WHERE m.studio_id = p_studio_id AND m.profile_id = v_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING
    SELECT COALESCE(SUM((pb->>'studio_fee')::NUMERIC), 0) INTO v_revenue
    FROM bookings b JOIN slots s ON b.slot_id = s.id
    WHERE s.studio_id = p_studio_id AND b.status IN ('approved', 'completed')
    AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id);

    SELECT COUNT(*) INTO v_active_listings FROM slots WHERE studio_id = p_studio_id AND date >= CURRENT_DATE;

    SELECT ROUND((COUNT(b.id)::NUMERIC / NULLIF(SUM(s.capacity), 0)::NUMERIC) * 100) INTO v_occupancy
    FROM slots s LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ('approved', 'completed')
    WHERE s.studio_id = p_studio_id AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id);

    SELECT p.full_name INTO v_top_instructor
    FROM bookings b JOIN slots s ON b.slot_id = s.id JOIN profiles p ON b.instructor_id = p.id
    WHERE s.studio_id = p_studio_id GROUP BY p.full_name ORDER BY COUNT(*) DESC LIMIT 1;

    RETURN jsonb_build_object(
        'revenue', v_revenue,
        'activeListings', v_active_listings,
        'occupancy', COALESCE(v_occupancy, 0),
        'topInstructor', COALESCE(v_top_instructor, 'N/A'),
        'revenueTrends', '[]'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. CLEANUP old versions
DROP FUNCTION IF EXISTS cancel_booking_atomic_v2(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS request_payout_atomic_v3(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS get_studio_earnings_v3(UUID, DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS get_studio_dashboard_stats_v2(UUID, UUID, DATE, DATE, DATE, UUID);
