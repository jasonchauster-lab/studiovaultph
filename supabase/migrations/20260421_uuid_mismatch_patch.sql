-- Patch to fix "operator does not exist: text = uuid" error in dashboard
-- Explicitly cast IDs in check_studio_access and get_studio_dashboard_stats

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

    -- B. Get user role (Explicitly casting to UUID just in case)
    SELECT role::UUID INTO v_role_id FROM public.studio_members
    WHERE studio_id::UUID = target_studio_id AND profile_id::UUID = target_profile_id;

    IF v_role_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- C. Basic membership check
    IF allowed_roles IS NULL THEN
        RETURN TRUE;
    END IF;

    -- D. Named role check
    SELECT name INTO v_role_name FROM public.studio_roles WHERE id = v_role_id;
    
    IF v_role_name = ANY(allowed_roles) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the Stats RPC with explicit casts
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
    -- AUTH CHECK (With explicit casts)
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = v_caller_id
        UNION
        SELECT 1 FROM public.studio_members m JOIN public.studio_roles r ON m.role::UUID = r.id
        WHERE m.studio_id::UUID = p_studio_id AND m.profile_id::UUID = v_caller_id AND (r.permissions->>'view_sales')::BOOLEAN = true
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); END IF;

    -- DATA FETCHING
    SELECT COALESCE(SUM((pb->>'studio_fee')::NUMERIC), 0) INTO v_revenue
    FROM bookings b JOIN slots s ON b.slot_id = s.id
    WHERE s.studio_id::UUID = p_studio_id AND b.status IN ('approved', 'completed')
    AND (p_outlet_id IS NULL OR s.outlet_id::UUID = p_outlet_id);

    SELECT COUNT(*) INTO v_active_listings FROM slots WHERE studio_id::UUID = p_studio_id AND date >= CURRENT_DATE;

    SELECT ROUND((COUNT(b.id)::NUMERIC / NULLIF(SUM(s.capacity), 0)::NUMERIC) * 100) INTO v_occupancy
    FROM slots s LEFT JOIN bookings b ON b.slot_id = s.id AND b.status IN ('approved', 'completed')
    WHERE s.studio_id::UUID = p_studio_id AND (p_outlet_id IS NULL OR s.outlet_id::UUID = p_outlet_id);

    SELECT p.full_name INTO v_top_instructor
    FROM bookings b JOIN slots s ON b.slot_id = s.id JOIN profiles p ON b.instructor_id = p.id
    WHERE s.studio_id::UUID = p_studio_id GROUP BY p.full_name ORDER BY COUNT(*) DESC LIMIT 1;

    RETURN jsonb_build_object(
        'revenue', v_revenue,
        'activeListings', v_active_listings,
        'occupancy', COALESCE(v_occupancy, 0),
        'topInstructor', COALESCE(v_top_instructor, 'N/A'),
        'revenueTrends', '[]'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
