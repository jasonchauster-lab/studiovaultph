-- -----------------------------------------------------------------------------
-- 1. HARDEN check_studio_access
-- Now handles UUID roles and checks permissions directly if needed.
CREATE OR REPLACE FUNCTION public.check_studio_access(
    target_studio_id UUID,
    target_profile_id UUID,
    allowed_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role_id UUID;
    v_role_name TEXT;
BEGIN
    -- A. Owners always have access
    IF EXISTS (SELECT 1 FROM public.studios WHERE id = target_studio_id AND owner_id = target_profile_id) THEN
        RETURN TRUE;
    END IF;

    -- B. Get user role
    SELECT role INTO v_role_id FROM public.studio_members
    WHERE studio_id = target_studio_id AND profile_id = target_profile_id;

    IF v_role_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- C. Basic membership check
    IF allowed_roles IS NULL THEN
        RETURN TRUE;
    END IF;

    -- D. Named role check (joining studio_roles since it stores UUIDs now)
    SELECT name INTO v_role_name FROM public.studio_roles WHERE id = v_role_id;
    
    IF v_role_name = ANY(allowed_roles) THEN
        RETURN TRUE;
    END IF;

    -- E. Support legacy role names (if any remain)
    IF v_role_id::TEXT = ANY(allowed_roles) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- -----------------------------------------------------------------------------
-- 2. HARDEN get_studio_earnings_v3
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
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- A. AUTH CHECK
    SELECT owner_id INTO v_owner_id FROM studios WHERE id = p_studio_id;
    
    IF v_owner_id = p_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 
            FROM public.studio_members m
            JOIN public.studio_roles r ON m.role = r.id
            WHERE m.studio_id = p_studio_id 
              AND m.profile_id = p_caller_id
              AND (r.permissions->>'view_sales')::BOOLEAN = true
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied: view_sales required');
    END IF;

    -- B. DATA FETCHING (Preserving existing logic)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 3. HARDEN get_studio_reports
CREATE OR REPLACE FUNCTION get_studio_reports(p_studio_id UUID, p_caller_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
    v_revenue_growth JSONB;
    v_occupancy_rates JSONB;
    v_new_customers INT;
    v_retention_rate NUMERIC;
    v_peak_day TEXT;
BEGIN
    -- AUTH CHECK
    IF p_caller_id IS NULL THEN RAISE EXCEPTION 'Caller ID is required'; END IF;
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = p_caller_id
        UNION
        SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
        WHERE m.studio_id = p_studio_id AND m.profile_id = p_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING
    SELECT jsonb_agg(sub.amount) INTO v_revenue_growth FROM (
        SELECT COALESCE(SUM((b.price_breakdown->>'studio_fee')::NUMERIC), 0) as amount
        FROM generate_series(CURRENT_DATE - INTERVAL '6 weeks', CURRENT_DATE, INTERVAL '1 week') d(week_start)
        LEFT JOIN bookings b ON b.studio_id = p_studio_id AND b.status IN ('approved', 'completed', 'cancelled_charged')
            AND EXISTS (SELECT 1 FROM slots s WHERE s.id = b.slot_id AND s.date >= d.week_start AND s.date < d.week_start + INTERVAL '7 days')
        GROUP BY d.week_start ORDER BY d.week_start ASC
    ) sub;

    SELECT jsonb_agg(jsonb_build_object('label', sub.session_type, 'value', sub.rate)) INTO v_occupancy_rates FROM (
        SELECT s.session_type, ROUND((COUNT(b.id)::NUMERIC / NULLIF(SUM(s.capacity), 0)::NUMERIC) * 100) as rate
        FROM slots s LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ('approved', 'completed')
        WHERE s.studio_id = p_studio_id AND s.date >= CURRENT_DATE - INTERVAL '30 days' GROUP BY s.session_type
    ) sub;

    SELECT COUNT(DISTINCT client_id) INTO v_new_customers FROM bookings b
    WHERE b.studio_id = p_studio_id AND b.status != 'cancelled'
      AND b.client_id NOT IN (SELECT client_id FROM bookings b2 WHERE b2.studio_id = p_studio_id AND b2.created_at < CURRENT_DATE - INTERVAL '30 days');

    SELECT ROUND((COUNT(CASE WHEN booking_count >= 2 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100) INTO v_retention_rate FROM (
        SELECT client_id, COUNT(*) as booking_count FROM bookings WHERE studio_id = p_studio_id AND status IN ('approved', 'completed') GROUP BY client_id
    ) sub;

    SELECT TO_CHAR(s.date, 'Day') INTO v_peak_day FROM slots s JOIN bookings b ON b.slot_id = s.id
    WHERE s.studio_id = p_studio_id AND b.status IN ('approved', 'completed') AND s.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY TO_CHAR(s.date, 'Day') ORDER BY COUNT(*) DESC LIMIT 1;

    RETURN jsonb_build_object(
        'revenue_growth', COALESCE(v_revenue_growth, '[]'::jsonb),
        'occupancy_rates', COALESCE(v_occupancy_rates, '[]'::jsonb),
        'new_customers', v_new_customers,
        'retention_rate', COALESCE(v_retention_rate, 0),
        'peak_day', COALESCE(TRIM(v_peak_day), 'N/A')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 4. HARDEN get_studio_centricity
CREATE OR REPLACE FUNCTION get_studio_centricity(p_studio_id UUID, p_outlet_id UUID DEFAULT NULL, p_caller_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
    v_nps_total INT; v_nps_promoters INT; v_nps_detractors INT; v_nps_score INT;
    v_avg_satisfaction NUMERIC; v_total_reviews INT; v_recent_feedback JSONB;
    v_total_clients INT; v_repeat_clients INT; v_repeat_rate NUMERIC;
    v_churn_risk INT; v_waitlist_turn_seconds INT; v_studio_owner_id UUID;
BEGIN
    -- AUTH CHECK
    IF p_caller_id IS NULL THEN RAISE EXCEPTION 'Caller ID is required'; END IF;
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = p_caller_id
        UNION
        SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
        WHERE m.studio_id = p_studio_id AND m.profile_id = p_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING
    SELECT owner_id INTO v_studio_owner_id FROM studios WHERE id = p_studio_id;
    IF p_outlet_id IS NOT NULL THEN
        SELECT COUNT(*), COALESCE(AVG(r.rating), 0), COUNT(*) FILTER (WHERE r.rating = 5), COUNT(*) FILTER (WHERE r.rating <= 3)
        INTO v_total_reviews, v_avg_satisfaction, v_nps_promoters, v_nps_detractors
        FROM reviews r JOIN bookings b ON r.booking_id = b.id JOIN slots s ON b.slot_id = s.id
        WHERE s.outlet_id = p_outlet_id AND r.reviewee_id = v_studio_owner_id;
    ELSE
        SELECT COUNT(*), COALESCE(AVG(rating), 0), COUNT(*) FILTER (WHERE rating = 5), COUNT(*) FILTER (WHERE rating <= 3)
        INTO v_total_reviews, v_avg_satisfaction, v_nps_promoters, v_nps_detractors
        FROM reviews WHERE reviewee_id = v_studio_owner_id;
    END IF;

    IF v_total_reviews > 0 THEN v_nps_score := ((v_nps_promoters::FLOAT - v_nps_detractors::FLOAT) / v_total_reviews::FLOAT) * 100;
    ELSE v_nps_score := 0; END IF;

    SELECT COUNT(DISTINCT b.client_id) INTO v_total_clients FROM bookings b JOIN slots s ON b.slot_id = s.id
    WHERE s.studio_id = p_studio_id AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id);

    SELECT COUNT(*) INTO v_repeat_clients FROM (
        SELECT b.client_id FROM bookings b JOIN slots s ON b.slot_id = s.id
        WHERE s.studio_id = p_studio_id AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id)
        GROUP BY b.client_id HAVING COUNT(*) >= 2
    ) t;

    IF v_total_clients > 0 THEN v_repeat_rate := (v_repeat_clients::FLOAT / v_total_clients::FLOAT) * 100;
    ELSE v_repeat_rate := 0; END IF;

    RETURN jsonb_build_object(
        'nps', v_nps_score, 'total_reviews', v_total_reviews, 'avg_satisfaction', ROUND(v_avg_satisfaction, 1),
        'repeat_rate', ROUND(v_repeat_rate, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 5. HARDEN get_studio_dashboard_stats_v2
CREATE OR REPLACE FUNCTION get_studio_dashboard_stats_v2(
    p_studio_id UUID, 
    p_caller_id UUID DEFAULT NULL,
    p_last_30_days_date DATE DEFAULT NULL,
    p_week_start DATE DEFAULT NULL,
    p_week_end DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_is_authorized BOOLEAN := FALSE;
    v_revenue NUMERIC;
    v_active_listings INT;
    v_occupancy NUMERIC;
    v_top_instructor TEXT;
    v_revenue_trends JSONB;
BEGIN
    -- AUTH CHECK
    IF p_caller_id IS NULL THEN RAISE EXCEPTION 'Caller ID is required'; END IF;
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = p_caller_id
        UNION
        SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
        WHERE m.studio_id = p_studio_id AND m.profile_id = p_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING (Simplified version of original logic)
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

-- -----------------------------------------------------------------------------
-- 6. HARDEN request_payout_atomic_v3
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
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. AUTH CHECK
    SELECT owner_id INTO v_owner_id FROM studios WHERE id = p_studio_id;
    IF v_owner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Studio not found');
    END IF;

    IF v_owner_id = p_caller_id THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role = r.id
            WHERE m.studio_id = p_studio_id AND m.profile_id = p_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;

    -- 2. Check balance (Pessimistic lock)
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
        p_studio_id, p_caller_id, p_amount, p_method, p_account_name, p_account_number, p_bank_name, 'pending', p_idempotency_key
    );

    UPDATE profiles SET available_balance = available_balance - p_amount WHERE id = v_owner_id;

    RETURN jsonb_build_object('success', true, 'message', 'Payout request submitted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- 7. DELETE exec_sql BACKDOOR
DROP FUNCTION IF EXISTS public.exec_sql(text);

NOTIFY pgrst, 'reload schema';
