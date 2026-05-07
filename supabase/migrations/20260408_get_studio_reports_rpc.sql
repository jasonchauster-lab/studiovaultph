-- Migration: Add get_studio_reports RPC
-- Date: 2026-04-08

CREATE OR REPLACE FUNCTION get_studio_reports(p_studio_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_revenue_growth JSONB;
    v_occupancy_rates JSONB;
    v_new_customers INT;
    v_retention_rate NUMERIC;
    v_peak_day TEXT;
BEGIN
    -- 1. Revenue Growth (Last 7 Weeks)
    -- Grouped by week using generate_series
    SELECT jsonb_agg(sub.amount) INTO v_revenue_growth
    FROM (
        SELECT 
            COALESCE(SUM((b.price_breakdown->>'studio_fee')::NUMERIC), 0) as amount
        FROM generate_series(CURRENT_DATE - INTERVAL '6 weeks', CURRENT_DATE, INTERVAL '1 week') d(week_start)
        LEFT JOIN bookings b ON b.studio_id = p_studio_id 
            AND b.status IN ('approved', 'completed', 'cancelled_charged')
            AND EXISTS (
                SELECT 1 FROM slots s 
                WHERE s.id = b.slot_id 
                AND s.date >= d.week_start 
                AND s.date < d.week_start + INTERVAL '7 days'
            )
        GROUP BY d.week_start
        ORDER BY d.week_start ASC
    ) sub;

    -- 2. Occupancy Rate by Session Type (Last 30 Days)
    SELECT jsonb_agg(jsonb_build_object('label', sub.session_type, 'value', sub.rate)) INTO v_occupancy_rates
    FROM (
        SELECT 
            s.session_type,
            ROUND(
                (COUNT(b.id)::NUMERIC / NULLIF(SUM(s.capacity), 0)::NUMERIC) * 100
            ) as rate
        FROM slots s
        LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ('approved', 'completed')
        WHERE s.studio_id = p_studio_id
          AND s.date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY s.session_type
    ) sub;

    -- 3. New Customer Growth (Last 30 Days)
    -- Defined as customers whose FIRST booking at this studio was in the last 30 days
    SELECT COUNT(DISTINCT client_id) INTO v_new_customers
    FROM bookings b
    WHERE b.studio_id = p_studio_id
      AND b.status != 'cancelled'
      AND b.client_id NOT IN (
          SELECT client_id FROM bookings b2 
          WHERE b2.studio_id = p_studio_id 
            AND b2.created_at < CURRENT_DATE - INTERVAL '30 days'
      );

    -- 4. Avg. Retention Rate
    -- % of customers with >= 2 bookings (approved/completed)
    SELECT 
        ROUND((COUNT(CASE WHEN booking_count >= 2 THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100)
    INTO v_retention_rate
    FROM (
        SELECT client_id, COUNT(*) as booking_count
        FROM bookings
        WHERE studio_id = p_studio_id AND status IN ('approved', 'completed')
        GROUP BY client_id
    ) sub;

    -- 5. Peak Booking Day
    -- The day with the most bookings in the last 30 days
    SELECT 
        TO_CHAR(s.date, 'Day') INTO v_peak_day
    FROM slots s
    JOIN bookings b ON b.slot_id = s.id
    WHERE s.studio_id = p_studio_id
      AND b.status IN ('approved', 'completed')
      AND s.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY TO_CHAR(s.date, 'Day')
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RETURN jsonb_build_object(
        'revenue_growth', COALESCE(v_revenue_growth, '[]'::jsonb),
        'occupancy_rates', COALESCE(v_occupancy_rates, '[]'::jsonb),
        'new_customers', v_new_customers,
        'retention_rate', COALESCE(v_retention_rate, 0),
        'peak_day', COALESCE(TRIM(v_peak_day), 'N/A')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
