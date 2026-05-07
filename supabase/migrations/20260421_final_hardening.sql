-- -----------------------------------------------------------------------------
-- 1. HARDEN request_payout_atomic_v3
-- Only the Studio Owner can request a payout. 
-- View-only roles (Manager/Accountant) are strictly blocked from fund withdrawals.
-- Uses auth.uid() directly for tamper-proof verification.
-- -----------------------------------------------------------------------------
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
    v_owner_id UUID;
    v_current_balance NUMERIC;
    v_auth_id UUID := auth.uid();
BEGIN
    -- 1. AUTH CHECK
    IF v_auth_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- 2. GET OWNER
    SELECT owner_id INTO v_owner_id FROM public.studios WHERE id = p_studio_id;
    IF v_owner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Studio not found');
    END IF;

    -- 3. STRICT OWNER ONLY CHECK
    -- Managers and Staff can view reports, but only the Owner can move money.
    IF v_owner_id != v_auth_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only the studio owner can request payouts.');
    END IF;

    -- 4. Check balance (Pessimistic lock)
    SELECT available_balance INTO v_current_balance
    FROM public.profiles WHERE id = v_owner_id
    FOR UPDATE;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- 5. Perform atomic operation
    INSERT INTO public.payout_requests (
        studio_id, user_id, amount, payment_method, account_name, account_number, bank_name, status, idempotency_key
    ) VALUES (
        p_studio_id, v_auth_id, p_amount, p_method, p_account_name, p_account_number, p_bank_name, 'pending', p_idempotency_key
    );

    UPDATE public.profiles SET available_balance = available_balance - p_amount WHERE id = v_owner_id;

    RETURN jsonb_build_object('success', true, 'message', 'Payout request submitted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- -----------------------------------------------------------------------------
-- 2. HARDEN get_studio_earnings_v4
-- Partitioning view so balances are easier to understand
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_studio_earnings_v4(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_owner_id UUID;
    v_available_balance NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_payout_approval_status TEXT;
    v_auth_id UUID := auth.uid();
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- A. AUTH CHECK
    IF v_auth_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Auth required'); END IF;

    SELECT owner_id INTO v_owner_id FROM public.studios WHERE id = p_studio_id;
    
    IF v_owner_id = v_auth_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 
            FROM public.studio_members m
            JOIN public.studio_roles r ON m.role = r.id
            WHERE m.studio_id = p_studio_id 
              AND m.profile_id = v_auth_id
              AND (r.permissions->>'view_sales')::BOOLEAN = true
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- B. DATA FETCHING
    SELECT payout_approval_status INTO v_payout_approval_status FROM public.studios WHERE id = p_studio_id;
    SELECT available_balance, pending_balance INTO v_available_balance, v_pending_balance FROM public.profiles WHERE id = v_owner_id;

    RETURN (
        WITH sb AS (
            SELECT 
                b.id as booking_id, b.created_at as booking_created_at, b.updated_at as booking_updated_at,
                b.status::TEXT as booking_status, b.payment_status as booking_payment_status, b.price_breakdown as pb,
                b.origin as tx_origin, s.date as session_date, s.start_time as session_time,
                cp.full_name as client_name, ip.full_name as instructor_name, b.outlet_id
            FROM public.bookings b
            LEFT JOIN public.slots s ON b.slot_id = s.id
            JOIN public.profiles cp ON b.client_id = cp.id
            LEFT JOIN public.profiles ip ON b.instructor_id = ip.id
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
            SELECT 
                booking_created_at as tx_date, 'Booking' as type, booking_status as status,
                COALESCE(client_name, 'Client') as client, COALESCE(instructor_name, 'Instructor') as instructor,
                (pb->>'studio_fee')::NUMERIC as amount, session_date, session_time,
                (pb->>'quantity') || ' x ' || (pb->>'equipment') as details, tx_origin as origin, booking_id::TEXT as reference_id
            FROM sb WHERE booking_status != 'cancelled_refunded'
            UNION ALL
            SELECT 
                booking_created_at, 'Refund', 'cancelled_refunded', client_name, instructor_name,
                0, session_date, session_time, 'Refunded session', tx_origin as origin, booking_id::TEXT
            FROM sb WHERE booking_status = 'cancelled_refunded'
            UNION ALL
            SELECT 
                cp.created_at, 'Sale', cp.status::TEXT, cp_profile.full_name, 'System',
                cp.total_amount, NULL::DATE, NULL::TIME, COALESCE(p.name, m.name) || ' Purchase',
                cp.payment_method as origin, cp.id::TEXT
            FROM public.customer_plans cp
            JOIN public.profiles cp_profile ON cp.user_id = cp_profile.id
            LEFT JOIN public.packages p ON cp.package_id = p.id
            LEFT JOIN public.memberships m ON cp.membership_id = m.id
            WHERE cp.studio_id = p_studio_id AND cp.status IN ('active', 'pending_payment')
            AND (p_start_date IS NULL OR cp.created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR cp.created_at::DATE <= p_end_date)
        )
        SELECT jsonb_build_object(
            'transactions', COALESCE((SELECT jsonb_agg(tx ORDER BY tx_date DESC) FROM all_tx tx), '[]'::jsonb),
            'summary', jsonb_build_object(
                'totalEarnings', s.gross, 'totalCompensation', s.compensation, 'totalPenalty', s.penalty,
                'netEarnings', (s.gross + s.compensation - s.penalty),
                'availableBalance', v_available_balance, 'pendingBalance', v_pending_balance,
                'payoutApprovalStatus', v_payout_approval_status
            )
        )
        FROM stats s
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- 3. HARDEN request_payout_instructor_v1
-- Secure version for instructors.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION request_payout_instructor_v1(
    p_amount NUMERIC,
    p_method TEXT,
    p_account_name TEXT,
    p_account_number TEXT,
    p_bank_name TEXT,
    p_idempotency_key TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance NUMERIC;
    v_auth_id UUID := auth.uid();
BEGIN
    IF v_auth_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Pessimistic lock
    SELECT available_balance INTO v_current_balance
    FROM public.profiles WHERE id = v_auth_id
    FOR UPDATE;

    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    INSERT INTO public.payout_requests (
        user_id, amount, payment_method, account_name, account_number, bank_name, status, idempotency_key
    ) VALUES (
        v_auth_id, p_amount, p_method, p_account_name, p_account_number, p_bank_name, 'pending', p_idempotency_key
    );

    UPDATE public.profiles SET available_balance = available_balance - p_amount WHERE id = v_auth_id;

    RETURN jsonb_build_object('success', true, 'message', 'Payout request submitted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean up old versions
DROP FUNCTION IF EXISTS public.request_payout_atomic_v2(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.request_payout_atomic_v3(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_studio_earnings_v3(UUID, DATE, DATE, UUID, UUID);

-- -----------------------------------------------------------------------------
-- 4. FIX waiver_consents RLS
-- Allow both Owners and authorized Studio Members (Staff/Instructors) to view consents.
-- This is critical so instructors can verify if a client has signed their waiver.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Studio owners can view their customers waivers" ON public.waiver_consents;
CREATE POLICY "Studio staff and owners can view waivers"
    ON public.waiver_consents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios s
            WHERE s.id = public.waiver_consents.studio_id
            AND (
                s.owner_id = auth.uid()
                OR 
                EXISTS (
                    SELECT 1 FROM public.studio_members m
                    WHERE m.studio_id = s.id AND m.profile_id = auth.uid()
                )
            )
        )
    );

NOTIFY pgrst, 'reload schema';
