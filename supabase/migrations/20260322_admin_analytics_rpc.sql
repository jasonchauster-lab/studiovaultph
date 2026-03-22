-- Pre-aggregates admin analytics data at the database level for performance.
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
    p_start_date DATE DEFAULT '1970-01-01',
    p_end_date DATE DEFAULT '9999-12-31'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_revenue NUMERIC := 0;
    v_total_platform_fees NUMERIC := 0;
    v_total_studio_fees NUMERIC := 0;
    v_total_instructor_fees NUMERIC := 0;
    v_total_payouts NUMERIC := 0;
    v_total_top_ups NUMERIC := 0;
    v_booking_count INT := 0;
    v_daily_data JSONB;
    v_transactions JSONB;
BEGIN
    -- 1. Aggregate Core Financials from Bookings
    SELECT 
        COALESCE(SUM((price_breakdown->>'service_fee')::NUMERIC), 0) + 
        COALESCE(SUM((price_breakdown->>'instructor_fee')::NUMERIC), 0) + 
        COALESCE(SUM((price_breakdown->>'studio_fee')::NUMERIC), 0),
        COALESCE(SUM((price_breakdown->>'service_fee')::NUMERIC), 0),
        COALESCE(SUM((price_breakdown->>'studio_fee')::NUMERIC), 0),
        COALESCE(SUM((price_breakdown->>'instructor_fee')::NUMERIC), 0),
        COUNT(*)
    INTO 
        v_total_revenue,
        v_total_platform_fees,
        v_total_studio_fees,
        v_total_instructor_fees,
        v_booking_count
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.status IN ('approved', 'completed', 'cancelled_charged')
    AND s.date >= p_start_date
    AND s.date <= p_end_date;

    -- 2. Aggregate Payouts
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_payouts
    FROM payout_requests
    WHERE status = 'paid'
    AND created_at::DATE >= p_start_date
    AND created_at::DATE <= p_end_date;

    -- 3. Aggregate Wallet Top-ups
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_top_ups
    FROM wallet_top_ups
    WHERE status = 'completed'
    AND type = 'top_up'
    AND created_at::DATE >= p_start_date
    AND created_at::DATE <= p_end_date;

    -- 4. Generate Daily Chart Data
    SELECT JSONB_AGG(d)
    INTO v_daily_data
    FROM (
        SELECT 
            s.date::TEXT as date,
            COALESCE(SUM((price_breakdown->>'service_fee')::NUMERIC + 
                         (price_breakdown->>'instructor_fee')::NUMERIC + 
                         (price_breakdown->>'studio_fee')::NUMERIC), 0) as revenue,
            COALESCE(SUM((price_breakdown->>'service_fee')::NUMERIC), 0) as platformFees,
            COUNT(*) as bookings
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        WHERE b.status IN ('approved', 'completed', 'cancelled_charged')
        AND s.date >= p_start_date
        AND s.date <= p_end_date
        GROUP BY s.date
        ORDER BY s.date ASC
    ) d;

    -- 5. Return everything as a JSONB object
    RETURN JSONB_BUILD_OBJECT(
        'totalRevenue', v_total_revenue,
        'totalPlatformFees', v_total_platform_fees,
        'totalStudioFees', v_total_studio_fees,
        'totalInstructorFees', v_total_instructor_fees,
        'totalPayouts', v_total_payouts,
        'totalTopUps', v_total_top_ups,
        'bookingCount', v_booking_count,
        'daily', COALESCE(v_daily_data, '[]'::JSONB)
    );
END;
$$;
