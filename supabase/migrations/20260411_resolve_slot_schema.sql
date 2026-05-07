-- ==========================================
-- SQL Migration: Resolve Slot Schema & Capacity Alignment
-- Date: 2026-04-11
-- ==========================================

-- 1. ADD MISSING COLUMNS TO SLOTS TABLE
-- These columns align the database with the user's preferred naming (session_type)
-- and link slots to the unified services table (service_id).

ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS session_type TEXT,
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- 2. DATA MIGRATION (Optional: Copy display_name to session_type if it exists)
-- This ensures backward compatibility with the previous UI data.
UPDATE public.slots 
SET session_type = display_name 
WHERE session_type IS NULL AND display_name IS NOT NULL;

-- 3. ENFORCE OUTLET INDEXING
-- Crucial for performance now that we are filtering by outlet_id.
CREATE INDEX IF NOT EXISTS idx_slots_outlet_id ON public.slots(outlet_id);
CREATE INDEX IF NOT EXISTS idx_slots_service_id ON public.slots(service_id);

-- 4. UPGRADE DASHBOARD STATS RPC
-- Added p_outlet_id parameter to support branch-level filtering on the dashboard.
CREATE OR REPLACE FUNCTION get_studio_dashboard_stats(
    p_studio_id UUID, 
    p_last_30_days_date DATE,
    p_week_start DATE,
    p_week_end DATE,
    p_outlet_id UUID DEFAULT NULL  -- NEW parameter
)
RETURNS JSONB AS $$
DECLARE
    v_revenue NUMERIC;
    v_top_instructor_name TEXT;
    v_total_spots INT;
    v_booked_spots INT;
    v_revenue_trends JSONB;
BEGIN
    -- 1. Monthly Revenue (Last 30 Days)
    SELECT COALESCE(SUM((price_breakdown->>'studio_fee')::NUMERIC), 0)
    INTO v_revenue
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
      AND b.status IN ('approved', 'completed', 'cancelled_charged')
      AND s.date >= p_last_30_days_date;

    -- 2. Top Instructor Name (Last 30 Days)
    SELECT p.full_name
    INTO v_top_instructor_name
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    JOIN profiles p ON b.instructor_id = p.id
    WHERE b.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
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
      AND (p_outlet_id IS NULL OR outlet_id = p_outlet_id)
      AND date >= p_week_start
      AND date <= p_week_end;

    -- Total units booked
    SELECT COUNT(*)
    INTO v_booked_spots
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE b.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
      AND b.status IN ('approved', 'pending', 'completed')
      AND s.date >= p_week_start
      AND s.date <= p_week_end;

    -- 4. Revenue Trends (Last 14 Days)
    SELECT jsonb_agg(sub) INTO v_revenue_trends
    FROM (
        SELECT 
            d.date::DATE as date,
            COALESCE(SUM((b.price_breakdown->>'studio_fee')::NUMERIC), 0) as amount,
            COUNT(b.id) as count
        FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d(date)
        LEFT JOIN bookings b ON b.studio_id = p_studio_id 
            AND (p_outlet_id IS NULL OR b.outlet_id = p_outlet_id)
            AND b.status IN ('approved', 'completed', 'cancelled_charged')
            AND EXISTS(SELECT 1 FROM slots s WHERE s.id = b.slot_id AND s.date = d.date::DATE)
        GROUP BY d.date
        ORDER BY d.date ASC
    ) sub;

    RETURN jsonb_build_object(
        'revenue', v_revenue,
        'top_instructor', COALESCE(v_top_instructor_name, 'N/A'),
        'total_spots', v_total_spots,
        'booked_spots', v_booked_spots,
        'occupancy_rate', CASE WHEN v_total_spots > 0 THEN ROUND((v_booked_spots::NUMERIC / v_total_spots::NUMERIC) * 100) ELSE 0 END,
        'revenue_trends', COALESCE(v_revenue_trends, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CLEANUP (Optional: If display_name is truly redundant)
-- Un-comment the line below ONLY after verifying the UI no longer uses display_name.
-- ALTER TABLE public.slots DROP COLUMN IF EXISTS display_name;

-- 6. REFRESH POSTGREST CACHE (Self-healing notice)
-- Note: After running this, Supabase's API cache should naturally detect the new columns.
-- If the PGRST204 error persists, please manually click "Reload Schema" in the Supabase Dashboard.
