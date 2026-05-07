-- Final Final Patch: v5 - Fixing price_breakdown column
-- This corrects the column name mismatch for revenue calculation.

CREATE OR REPLACE FUNCTION get_studio_dashboard_stats_v5(
    p_studio_id UUID, 
    p_last_30_days_date DATE DEFAULT NULL,
    p_week_start DATE DEFAULT NULL,
    p_week_end DATE DEFAULT NULL,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_is_authorized BOOLEAN := FALSE;
    v_revenue NUMERIC;
    v_active_listings INT;
    v_occupancy NUMERIC;
    v_top_instructor TEXT;
BEGIN
    -- AUTH CHECK
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = v_caller_id
        UNION
        SELECT 1 FROM public.studio_members m 
        LEFT JOIN public.studio_roles r ON (
            CASE 
                WHEN m.role ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN m.role::UUID = r.id 
                ELSE FALSE 
            END
        )
        WHERE m.studio_id = p_studio_id AND m.profile_id = v_caller_id 
        AND (
            m.role = 'admin' OR m.role = 'staff'
            OR (r.permissions->>'view_sales')::BOOLEAN = true
        )
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING (Using price_breakdown instead of metadata)
    SELECT COALESCE(SUM(
        CASE 
            WHEN b.price_breakdown->>'studio_fee' IS NOT NULL THEN (b.price_breakdown->>'studio_fee')::NUMERIC
            WHEN b.price_breakdown->'studio'->>'fee' IS NOT NULL THEN (b.price_breakdown->'studio'->>'fee')::NUMERIC
            ELSE b.total_price -- Fallback if no breakdown found
        END
    ), 0) INTO v_revenue
    FROM public.bookings b JOIN public.slots s ON b.slot_id = s.id
    WHERE s.studio_id = p_studio_id AND b.status IN ('approved', 'completed')
    AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id);

    SELECT COUNT(*) INTO v_active_listings FROM public.slots WHERE studio_id = p_studio_id AND date >= CURRENT_DATE;

    SELECT ROUND((COUNT(b.id)::NUMERIC / NULLIF(SUM(s.capacity), 0)::NUMERIC) * 100) INTO v_occupancy
    FROM public.slots s LEFT JOIN public.bookings b ON b.slot_id = s.id AND b.status IN ('approved', 'completed')
    WHERE s.studio_id = p_studio_id AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id);

    SELECT p.full_name INTO v_top_instructor
    FROM public.bookings b JOIN public.slots s ON b.slot_id = s.id JOIN public.profiles p ON b.instructor_id = p.id
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
