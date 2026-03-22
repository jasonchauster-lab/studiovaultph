-- Fix: Re-backfill studio_id for ALL bookings where it's still NULL
-- This catches any bookings that were missed by the original migration.

-- Step 1: Backfill from slots (the standard path)
UPDATE public.bookings b
SET studio_id = s.studio_id
FROM public.slots s
WHERE b.slot_id = s.id
  AND b.studio_id IS NULL
  AND s.studio_id IS NOT NULL;

-- Step 2: For bookings where the slot was deleted, try to derive studio_id
-- by looking at the instructor's other bookings at the same studio
-- (This is a safety net for edge cases)

-- Step 3: Update the history RPC to also match bookings through the slot join
-- so that even if studio_id is NULL, the booking still appears in history.

DROP FUNCTION IF EXISTS get_studio_rental_history_v2(UUID, DATE, DATE);

-- Recreate get_studio_rental_history_v2 with fallback join
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
    client_medical TEXT[],
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
    LEFT JOIN studios st ON COALESCE(b.studio_id, s.studio_id) = st.id
    LEFT JOIN profiles ip ON b.instructor_id = ip.id
    JOIN profiles cp ON b.client_id = cp.id
    WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
    AND b.status::TEXT IN ('approved', 'completed', 'cancelled_refunded', 'cancelled_charged', 'pending', 'rejected', 'cancelled')
    AND (p_start_date IS NULL OR COALESCE(s.date, b.created_at::DATE) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(s.date, b.created_at::DATE) <= p_end_date)
    ORDER BY COALESCE(s.date, b.created_at::DATE) DESC, s.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP FUNCTION IF EXISTS get_studio_earnings_v2(UUID, DATE, DATE);

-- Also update get_studio_earnings_v2 with the same fallback
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

    -- 3. Unified Data Fetching (single-statement CTE)
    RETURN (
        WITH sb AS (
            SELECT 
                b.id as booking_id,
                b.created_at as booking_created_at,
                b.updated_at as booking_updated_at,
                b.status::TEXT as booking_status,
                b.payment_status as booking_payment_status,
                b.price_breakdown as pb,
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
                (pb->>'quantity') || ' x ' || (pb->>'equipment') as details
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
                'Refunded session'
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
                'Cancellation compensation'
            FROM sb
            WHERE (pb->>'penalty_processed')::BOOLEAN = true AND pb->>'refund_initiator' = 'instructor'
            OR (booking_status = 'cancelled_charged' AND pb->>'refund_initiator' = 'client')

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
                'Withdrawal via ' || payment_method
            FROM payout_requests
            WHERE studio_id = p_studio_id
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


DROP FUNCTION IF EXISTS get_studio_dashboard_stats(UUID, UUID);

-- Also update get_studio_dashboard_stats to use the same fallback
CREATE OR REPLACE FUNCTION get_studio_dashboard_stats(
    p_studio_id UUID, 
    p_owner_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_total_bookings INT;
    v_active_bookings INT;
    v_total_revenue NUMERIC;
    v_pending_revenue NUMERIC;
    v_total_slots INT;
    v_available_balance NUMERIC;
    v_pending_balance NUMERIC;
    v_recent_bookings JSONB;
BEGIN
    -- Total bookings for this studio (with fallback through slots)
    SELECT COUNT(*) INTO v_total_bookings
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
    AND b.status IN ('approved', 'completed', 'pending');

    -- Active (upcoming approved) bookings
    SELECT COUNT(*) INTO v_active_bookings
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
    AND b.status = 'approved'
    AND s.date >= CURRENT_DATE;

    -- Total revenue (from approved/completed bookings)
    SELECT COALESCE(SUM((b.price_breakdown->>'studio_fee')::NUMERIC), 0) INTO v_total_revenue
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
    AND b.status IN ('approved', 'completed');

    -- Pending revenue
    SELECT COALESCE(SUM((b.price_breakdown->>'studio_fee')::NUMERIC), 0) INTO v_pending_revenue
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
    AND b.status = 'pending';

    -- Total slots
    SELECT COUNT(*) INTO v_total_slots
    FROM slots
    WHERE studio_id = p_studio_id AND is_available = true;

    -- Owner balance
    SELECT COALESCE(available_balance, 0), COALESCE(pending_balance, 0) 
    INTO v_available_balance, v_pending_balance
    FROM profiles WHERE id = p_owner_id;

    -- Recent bookings (last 5)
    SELECT COALESCE(jsonb_agg(row_to_json(rb.*) ORDER BY rb.created_at DESC), '[]'::jsonb)
    INTO v_recent_bookings
    FROM (
        SELECT 
            b.id, b.status, b.created_at,
            b.price_breakdown,
            s.date as session_date,
            s.start_time,
            p.full_name as client_name,
            p.avatar_url as client_avatar
        FROM bookings b
        LEFT JOIN slots s ON b.slot_id = s.id
        LEFT JOIN profiles p ON b.client_id = p.id
        WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
        ORDER BY b.created_at DESC
        LIMIT 5
    ) rb;

    RETURN jsonb_build_object(
        'totalBookings', v_total_bookings,
        'activeBookings', v_active_bookings,
        'totalRevenue', v_total_revenue,
        'pendingRevenue', v_pending_revenue,
        'totalSlots', v_total_slots,
        'availableBalance', v_available_balance,
        'pendingBalance', v_pending_balance,
        'recentBookings', v_recent_bookings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
