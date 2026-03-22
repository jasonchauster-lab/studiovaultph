-- migration: 20260322_history_payout_v2.sql

-- 1. Optimized Payout Request RPC (Supports both Instructor & Studio)
CREATE OR REPLACE FUNCTION request_payout_atomic_v2(
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
    current_balance NUMERIC;
BEGIN
    -- 1. Fetch and lock profile for the user
    SELECT available_balance INTO current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    -- 2. Verify sufficient funds
    IF current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
    END IF;

    -- 3. Deduct from balance
    UPDATE profiles 
    SET available_balance = available_balance - p_amount 
    WHERE id = p_user_id;

    -- 4. Create payout request record
    INSERT INTO payout_requests (
        user_id, 
        studio_id,
        amount, 
        status, 
        payment_method, 
        account_name, 
        account_number, 
        bank_name,
        created_at
    )
    VALUES (
        p_user_id, 
        p_studio_id,
        p_amount, 
        'pending', 
        p_method, 
        p_account_name, 
        p_account_number, 
        p_bank_name,
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Optimized Instructor Earnings RPC
CREATE OR REPLACE FUNCTION get_instructor_earnings_v3(
    p_instructor_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_total_earned NUMERIC := 0;
    v_total_withdrawn NUMERIC := 0;
    v_pending_payouts NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_available_balance NUMERIC := 0;
    v_total_compensation NUMERIC := 0;
    v_total_penalty NUMERIC := 0;
    v_net_earnings NUMERIC := 0;
    v_transactions JSONB;
    v_payouts JSONB;
BEGIN
    -- 1. Basic Profile Stats
    SELECT available_balance, pending_balance 
    INTO v_available_balance, v_pending_balance
    FROM profiles WHERE id = p_instructor_id;

    -- 2. Total Withdrawn & Pending Payouts
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END), 0)
    INTO v_total_withdrawn, v_pending_payouts
    FROM payout_requests 
    WHERE user_id = p_instructor_id;

    -- 3. Unified Data Fetching
    RETURN (
        WITH instructor_bookings AS (
            SELECT 
                b.*,
                s.date as session_date,
                s.start_time as session_time,
                st.name as studio_name,
                cp.full_name as client_name
            FROM bookings b
            LEFT JOIN slots s ON b.slot_id = s.id
            LEFT JOIN studios st ON b.studio_id = st.id
            JOIN profiles cp ON b.client_id = cp.id
            WHERE b.instructor_id = p_instructor_id
            AND (p_start_date IS NULL OR s.date >= p_start_date)
            AND (p_end_date IS NULL OR s.date <= p_end_date)
            AND (b.status IN ('approved', 'completed', 'cancelled_charged') OR b.payment_status = 'submitted')
        ),
        stats AS (
            SELECT
                COALESCE(SUM(CASE WHEN (status IN ('approved', 'completed') OR (status = 'pending' AND payment_status = 'submitted')) THEN (price_breakdown->>'instructor_fee')::NUMERIC ELSE 0 END), 0) as gross,
                COALESCE(SUM(CASE WHEN (price_breakdown->>'penalty_processed')::BOOLEAN = true AND price_breakdown->>'refund_initiator' = 'client' THEN (price_breakdown->>'instructor_fee')::NUMERIC 
                                  WHEN (price_breakdown->>'penalty_processed')::BOOLEAN = true AND price_breakdown->>'refund_initiator' = 'studio' THEN (price_breakdown->>'penalty_amount')::NUMERIC 
                                  ELSE 0 END), 0) as compensation,
                COALESCE(SUM(CASE WHEN (price_breakdown->>'penalty_processed')::BOOLEAN = true AND price_breakdown->>'refund_initiator' = 'instructor' THEN (price_breakdown->>'penalty_amount')::NUMERIC ELSE 0 END), 0) as penalty
            FROM instructor_bookings
        ),
        all_tx AS (
            -- Booking Earnings
            SELECT 
                b.created_at as tx_date,
                b.session_date,
                b.session_time,
                CASE 
                    WHEN b.status = 'cancelled_charged' THEN 'Late Cancellation'
                    WHEN b.status = 'pending' THEN 'Verification'
                    ELSE 'Session'
                END as type,
                b.client_name as client,
                (b.price_breakdown->>'instructor_fee')::NUMERIC as amount,
                b.status::TEXT,
                b.price_breakdown->>'equipment' as details
            FROM instructor_bookings b

            UNION ALL

            -- Compensations (Instructor gets penalty from Client/Studio)
            SELECT 
                b.updated_at,
                b.session_date,
                b.session_time,
                'Compensation',
                b.client_name,
                CASE 
                    WHEN b.price_breakdown->>'refund_initiator' = 'client' THEN (b.price_breakdown->>'instructor_fee')::NUMERIC
                    ELSE (b.price_breakdown->>'penalty_amount')::NUMERIC
                END,
                'processed'::TEXT,
                'Late cancellation payout'
            FROM instructor_bookings b
            WHERE (b.price_breakdown->>'penalty_processed')::BOOLEAN = true
            AND b.price_breakdown->>'refund_initiator' IN ('client', 'studio')

            UNION ALL

            -- Penalties (Instructor pays penalty)
            SELECT 
                b.updated_at,
                b.session_date,
                b.session_time,
                'Penalty',
                b.client_name,
                -(b.price_breakdown->>'penalty_amount')::NUMERIC,
                'processed'::TEXT,
                'Late cancellation deduction'
            FROM instructor_bookings b
            WHERE (b.price_breakdown->>'penalty_processed')::BOOLEAN = true
            AND b.price_breakdown->>'refund_initiator' = 'instructor'

            UNION ALL

            -- Payouts
            SELECT 
                created_at,
                NULL,
                NULL,
                'Payout',
                'System',
                -amount,
                status::TEXT,
                'Withdrawal via ' || payment_method
            FROM payout_requests
            WHERE user_id = p_instructor_id
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)

            UNION ALL

            -- Wallet / Admin Adjustments
            SELECT 
                COALESCE(processed_at, updated_at, created_at),
                NULL,
                NULL,
                CASE WHEN type = 'admin_adjustment' THEN 'Adjustment' ELSE 'Top-Up' END,
                'Admin',
                amount,
                status::TEXT,
                COALESCE(admin_notes, 'Manual balance adjustment')
            FROM wallet_top_ups
            WHERE user_id = p_instructor_id
            AND status = 'approved'
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)
        )
        SELECT jsonb_build_object(
            'totalEarned', s.gross,
            'totalWithdrawn', v_total_withdrawn,
            'pendingPayouts', v_pending_payouts,
            'availableBalance', v_available_balance,
            'pendingBalance', v_pending_balance,
            'totalCompensation', s.compensation,
            'totalPenalty', s.penalty,
            'netEarnings', (s.gross + s.compensation - s.penalty),
            'recentTransactions', COALESCE((SELECT jsonb_agg(tx ORDER BY tx_date DESC) FROM all_tx tx), '[]'::jsonb),
            'payouts', COALESCE((SELECT jsonb_agg(p ORDER BY created_at DESC) FROM payout_requests p WHERE user_id = p_instructor_id), '[]'::jsonb)
        )
        FROM stats s
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Optimized Studio Earnings RPC
CREATE OR REPLACE FUNCTION get_studio_earnings_v2(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_owner_id UUID;
    v_total_earned NUMERIC := 0;
    v_total_withdrawn NUMERIC := 0;
    v_pending_payouts NUMERIC := 0;
    v_available_balance NUMERIC := 0;
    v_pending_balance NUMERIC := 0;
    v_total_compensation NUMERIC := 0;
    v_total_penalty NUMERIC := 0;
    v_net_earnings NUMERIC := 0;
    v_payout_approval_status TEXT;
    v_transactions JSONB;
    v_bookings_data JSONB;
    v_payout_data JSONB;
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
        WITH studio_bookings AS (
            SELECT 
                b.*,
                s.date as session_date,
                s.start_time as session_time,
                st.name as studio_name,
                cp.full_name as client_name,
                ip.full_name as instructor_name
            FROM bookings b
            LEFT JOIN slots s ON b.slot_id = s.id
            LEFT JOIN studios st ON b.studio_id = st.id
            JOIN profiles cp ON b.client_id = cp.id
            LEFT JOIN profiles ip ON b.instructor_id = ip.id
            WHERE b.studio_id = p_studio_id
            AND (p_start_date IS NULL OR s.date >= p_start_date OR (s.id IS NULL AND b.created_at::DATE >= p_start_date))
            AND (p_end_date IS NULL OR s.date <= p_end_date OR (s.id IS NULL AND b.created_at::DATE <= p_end_date))
            AND (b.status IN ('approved', 'completed', 'cancelled_charged', 'cancelled_refunded') OR b.payment_status = 'submitted')
        ),
        stats AS (
            SELECT
                COALESCE(SUM(CASE WHEN (status IN ('approved', 'completed') OR (status = 'pending' AND payment_status = 'submitted') OR (status = 'cancelled_charged' AND NOT (price_breakdown->>'refund_initiator' = 'client'))) THEN (price_breakdown->>'studio_fee')::NUMERIC ELSE 0 END), 0) as gross,
                COALESCE(SUM(CASE WHEN (price_breakdown->>'penalty_processed')::BOOLEAN = true AND price_breakdown->>'refund_initiator' = 'instructor' THEN (price_breakdown->>'penalty_amount')::NUMERIC 
                                  WHEN status = 'cancelled_charged' AND price_breakdown->>'refund_initiator' = 'client' THEN (price_breakdown->>'studio_fee')::NUMERIC
                                  ELSE 0 END), 0) as compensation,
                COALESCE(SUM(CASE WHEN (price_breakdown->>'penalty_processed')::BOOLEAN = true AND price_breakdown->>'refund_initiator' = 'studio' THEN (price_breakdown->>'penalty_amount')::NUMERIC ELSE 0 END), 0) as penalty
            FROM studio_bookings
        ),
        all_transactions AS (
            -- Bookings
            SELECT 
                b.created_at as tx_date,
                'Booking' as type,
                b.status::TEXT,
                COALESCE(b.client_name, 'Client') as client,
                COALESCE(b.instructor_name, 'Instructor') as instructor,
                (b.price_breakdown->>'studio_fee')::NUMERIC as amount,
                b.session_date,
                b.session_time,
                (b.price_breakdown->>'quantity') || ' x ' || (b.price_breakdown->>'equipment') as details
            FROM studio_bookings b
            WHERE b.status != 'cancelled_refunded'

            UNION ALL

            -- Refunds (Zero actual payout but record for audit)
            SELECT 
                b.created_at,
                'Refund',
                'cancelled_refunded'::TEXT,
                b.client_name,
                b.instructor_name,
                0,
                b.session_date,
                b.session_time,
                'Refunded session'
            FROM studio_bookings b
            WHERE b.status = 'cancelled_refunded'

            UNION ALL

            -- Compensations
            SELECT 
                b.updated_at,
                'Compensation',
                'processed'::TEXT,
                b.client_name,
                b.instructor_name,
                CASE 
                    WHEN b.price_breakdown->>'refund_initiator' = 'instructor' THEN (b.price_breakdown->>'penalty_amount')::NUMERIC
                    ELSE (b.price_breakdown->>'studio_fee')::NUMERIC
                END,
                b.session_date,
                b.session_time,
                'Cancellation compensation'
            FROM studio_bookings b
            WHERE (b.price_breakdown->>'penalty_processed')::BOOLEAN = true AND b.price_breakdown->>'refund_initiator' = 'instructor'
            OR (b.status = 'cancelled_charged' AND b.price_breakdown->>'refund_initiator' = 'client')

            UNION ALL

            -- Payouts
            SELECT 
                created_at,
                'Payout',
                status::TEXT,
                'System',
                'Staff',
                -amount,
                NULL,
                NULL,
                'Withdrawal via ' || payment_method
            FROM payout_requests
            WHERE studio_id = p_studio_id
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)
        )
        SELECT jsonb_build_object(
            'bookings', COALESCE((SELECT jsonb_agg(b ORDER BY created_at DESC) FROM studio_bookings b), '[]'::jsonb),
            'payouts', COALESCE((SELECT jsonb_agg(p ORDER BY created_at DESC) FROM payout_requests p WHERE studio_id = p_studio_id), '[]'::jsonb),
            'transactions', COALESCE((SELECT jsonb_agg(tx ORDER BY tx_date DESC) FROM all_transactions tx), '[]'::jsonb),
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


-- 4. Optimized Studio History RPC
CREATE OR REPLACE FUNCTION get_studio_rental_history_v2(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    status TEXT,
    price_breakdown JSONB,
    instructor_checked_in_at TIMESTAMPTZ,
    client_id UUID,
    instructor_id UUID,
    slot_id UUID,
    session_date DATE,
    start_time TIME,
    end_time TIME,
    equipment JSONB,
    studio_name TEXT,
    instructor_name TEXT,
    instructor_avatar TEXT,
    client_name TEXT,
    client_avatar TEXT,
    client_email TEXT,
    client_medical TEXT,
    client_other_medical TEXT,
    client_bio TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.created_at,
        b.status::TEXT,
        b.price_breakdown,
        b.instructor_checked_in_at,
        b.client_id,
        b.instructor_id,
        b.slot_id,
        COALESCE(s.date, b.created_at::DATE) as session_date,
        s.start_time,
        s.end_time,
        s.equipment,
        st.name as studio_name,
        ip.full_name as instructor_name,
        ip.avatar_url as instructor_avatar,
        cp.full_name as client_name,
        cp.avatar_url as client_avatar,
        cp.email as client_email,
        cp.medical_conditions as client_medical,
        cp.other_medical_condition as client_other_medical,
        cp.bio as client_bio
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    LEFT JOIN studios st ON b.studio_id = st.id
    LEFT JOIN profiles ip ON b.instructor_id = ip.id
    JOIN profiles cp ON b.client_id = cp.id
    WHERE b.studio_id = p_studio_id
    AND b.status::TEXT IN ('approved', 'completed', 'cancelled_refunded', 'cancelled_charged', 'pending', 'rejected', 'cancelled')
    AND (p_start_date IS NULL OR s.date >= p_start_date OR (s.id IS NULL AND b.created_at::DATE >= p_start_date))
    AND (p_end_date IS NULL OR s.date <= p_end_date OR (s.id IS NULL AND b.created_at::DATE <= p_end_date))
    ORDER BY COALESCE(s.date, b.created_at::DATE) DESC, s.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
