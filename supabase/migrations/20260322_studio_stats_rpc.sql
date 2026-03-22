-- migration: 20260322000002_studio_stats_rpc.sql

CREATE OR REPLACE FUNCTION get_studio_dashboard_stats(
    p_studio_id UUID, 
    p_last_30_days_date DATE,
    p_week_start DATE,
    p_week_end DATE
)
RETURNS JSONB AS $$
DECLARE
    v_revenue NUMERIC;
    v_top_instructor_name TEXT;
    v_total_spots INT;
    v_booked_spots INT;
BEGIN
    -- 1. Monthly Revenue (Last 30 Days)
    SELECT COALESCE(SUM((price_breakdown->>'studio_fee')::NUMERIC), 0)
    INTO v_revenue
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.studio_id = p_studio_id
      AND b.status IN ('approved', 'completed', 'cancelled_charged')
      AND s.date >= p_last_30_days_date;

    -- 2. Top Instructor Name (Last 30 Days)
    SELECT p.full_name
    INTO v_top_instructor_name
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    JOIN profiles p ON b.instructor_id = p.id
    WHERE b.studio_id = p_studio_id
      AND b.status IN ('approved', 'completed', 'cancelled_charged')
      AND s.date >= p_last_30_days_date
    GROUP BY p.id, p.full_name
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- 3. Weekly Occupancy (Current Week)
    -- Total units available
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_total_spots
    FROM slots
    WHERE studio_id = p_studio_id
      AND date >= p_week_start
      AND date <= p_week_end;

    -- Total units booked
    SELECT COUNT(*)
    INTO v_booked_spots
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.studio_id = p_studio_id
      AND b.status IN ('approved', 'pending', 'completed')
      AND s.date >= p_week_start
      AND s.date <= p_week_end;

    RETURN jsonb_build_object(
        'revenue', v_revenue,
        'top_instructor', COALESCE(v_top_instructor_name, 'N/A'),
        'total_spots', v_total_spots,
        'booked_spots', v_booked_spots,
        'occupancy_rate', CASE WHEN v_total_spots > 0 THEN ROUND((v_booked_spots::NUMERIC / v_total_spots::NUMERIC) * 100) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
