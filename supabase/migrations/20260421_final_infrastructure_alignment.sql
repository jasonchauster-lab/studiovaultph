-- Final Infrastructure Alignment: Convert studio_members.role to UUID
-- This migration handles the conversion safely while preserving existing data.

DO $$ 
BEGIN
    -- 1. Ensure we have the Admin and Instructor roles in studio_roles for every studio
    -- This ensures the mapping below doesn't fail.
    INSERT INTO public.studio_roles (studio_id, name, type)
    SELECT id, 'Admin', 'system' FROM public.studios
    ON CONFLICT (studio_id, name) DO NOTHING;

    INSERT INTO public.studio_roles (studio_id, name, type)
    SELECT id, 'Instructor', 'system' FROM public.studios
    ON CONFLICT (studio_id, name) DO NOTHING;

    -- 2. Update studio_members where role is still text ('admin', 'instructor')
    -- We map them to the corresponding UUID in studio_roles
    UPDATE public.studio_members m
    SET role = r.id::TEXT
    FROM public.studio_roles r
    WHERE m.studio_id = r.studio_id 
    AND m.role = 'admin' 
    AND r.name = 'Admin';

    UPDATE public.studio_members m
    SET role = r.id::TEXT
    FROM public.studio_roles r
    WHERE m.studio_id = r.studio_id 
    AND m.role = 'instructor' 
    AND r.name = 'Instructor';

    -- Note: We keep the column as TEXT for now to avoid breaking existing queries, 
    -- but all values are now UUID strings.
END $$;

-- 3. Update the RPCs to handle the UUID strings properly
CREATE OR REPLACE FUNCTION get_studio_dashboard_stats_v3(
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
    -- AUTH CHECK (Resilient to role being a UUID string)
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
            m.role = 'admin' -- Legacy support
            OR (r.permissions->>'view_sales')::BOOLEAN = true
        )
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING
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
