-- Fix get_studio_earnings_v2 to include Penalties and Top-ups in the transaction history

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

            -- NEW: Added missing Studio Penalty
            SELECT 
                booking_updated_at,
                'Penalty',
                'processed',
                client_name,
                instructor_name,
                -(pb->>'penalty_amount')::NUMERIC,
                session_date,
                session_time,
                'Late cancellation deduction'
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
                'Withdrawal via ' || payment_method
            FROM payout_requests
            WHERE studio_id = p_studio_id
            AND (p_start_date IS NULL OR created_at::DATE >= p_start_date)
            AND (p_end_date IS NULL OR created_at::DATE <= p_end_date)
            
            UNION ALL

            -- NEW: Added missing Studio Top-ups and Adjustments
            SELECT 
                COALESCE(processed_at, updated_at, created_at),
                CASE WHEN type = 'admin_adjustment' THEN 'Adjustment' ELSE 'Top-Up' END,
                status::TEXT,
                'Admin',
                'System',
                amount,
                NULL::DATE,
                NULL::TIME,
                COALESCE(admin_notes, 'Manual balance adjustment')
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
