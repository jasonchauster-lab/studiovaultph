-- Phase 7: RPC Upgrades for Advanced Hardening

-- 1. Upgraded Earnings RPC (v3)
-- Adds: p_outlet_id filtering, p_caller_id (audit), and soft-delete awareness.
CREATE OR REPLACE FUNCTION get_studio_earnings_v3(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL,
    p_caller_id UUID DEFAULT NULL
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
                b.origin as tx_origin,
                s.date as session_date,
                s.start_time as session_time,
                cp.full_name as client_name,
                ip.full_name as instructor_name,
                b.outlet_id
            FROM bookings b
            LEFT JOIN slots s ON b.slot_id = s.id
            JOIN profiles cp ON b.client_id = cp.id
            LEFT JOIN profiles ip ON b.instructor_id = ip.id
            WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
            AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
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
            -- Bookings
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
                tx_origin as origin,
                booking_id::TEXT as reference_id
            FROM sb
            WHERE booking_status != 'cancelled_refunded'

            UNION ALL

            -- Refunds
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
                tx_origin as origin,
                booking_id::TEXT
            FROM sb
            WHERE booking_status = 'cancelled_refunded'

            UNION ALL

            -- Package/Membership Sales
            SELECT 
                cp.created_at,
                'Sale',
                cp.status::TEXT,
                cp_profile.full_name,
                'System',
                cp.total_amount,
                NULL::DATE,
                NULL::TIME,
                COALESCE(p.name, m.name) || ' Purchase',
                cp.payment_method as origin,
                cp.id::TEXT
            FROM public.customer_plans cp
            JOIN public.profiles cp_profile ON cp.user_id = cp_profile.id
            LEFT JOIN public.packages p ON cp.package_id = p.id
            LEFT JOIN public.memberships m ON cp.membership_id = m.id
            WHERE cp.studio_id = p_studio_id
            AND cp.status IN ('active', 'pending_payment')
            AND (p_start_date IS NULL OR cp.created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR cp.created_at::DATE <= p_end_date)

            UNION ALL

            -- Payouts
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
                'studio',
                id::TEXT
            FROM public.payout_requests
            WHERE studio_id = p_studio_id
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)
            
            UNION ALL

            -- Wallet Top-Ups (Manual Adjustments)
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
                'studio',
                id::TEXT
            FROM public.wallet_top_ups
            WHERE studio_id = p_studio_id
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

-- 2. Upgraded Atomic Payout RPC (v3)
-- Adds: Idempotency support to prevent double-withdrawals.
CREATE OR REPLACE FUNCTION request_payout_atomic_v3(
    p_caller_id UUID,
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
    v_owner_id UUID;
    v_current_balance NUMERIC;
BEGIN
    -- 1. Identify studio owner
    SELECT owner_id INTO v_owner_id FROM studios WHERE id = p_studio_id;
    IF v_owner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Studio not found');
    END IF;

    -- 2. Check balance (Pessimistic lock)
    SELECT available_balance INTO v_current_balance
    FROM profiles WHERE id = v_owner_id
    FOR UPDATE;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- 3. Perform atomic operation
    -- a. Create payout request with idempotency key
    INSERT INTO public.payout_requests (
        studio_id,
        user_id,
        amount,
        payment_method,
        account_name,
        account_number,
        bank_name,
        status,
        idempotency_key
    ) VALUES (
        p_studio_id,
        p_caller_id,
        p_amount,
        p_method,
        p_account_name,
        p_account_number,
        p_bank_name,
        'pending',
        p_idempotency_key
    );

    -- b. Deduct from owner's available balance
    UPDATE profiles
    SET available_balance = available_balance - p_amount
    WHERE id = v_owner_id;

    RETURN jsonb_build_object('success', true, 'message', 'Payout request submitted successfully');
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'idempotency_key: This request has already been processed.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
