-- Migration for RLS Performance and Atomic Reordering
-- This script replaces slow RLS checks with optimized functions and enables atomic reordering.

-- 1. Optimized Security Function (SECURITY DEFINER)
-- This is significantly faster than raw RLS with multiple JOINs
CREATE OR REPLACE FUNCTION check_studio_access(p_studio_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM studios s
        WHERE s.id = p_studio_id
        AND (
            s.owner_id = auth.uid()
            OR 
            EXISTS (
                SELECT 1 FROM studio_members m
                WHERE m.studio_id = p_studio_id AND m.profile_id = auth.uid()
            )
        )
    );
END;
$$;

-- 2. Atomic Reordering RPC
CREATE OR REPLACE FUNCTION reorder_categories_v2(
    p_studio_id UUID,
    p_category_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update all in a single transaction
    FOR i IN 1..array_length(p_category_ids, 1) LOOP
        UPDATE service_categories
        SET display_order = i - 1
        WHERE id = p_category_ids[i]
          AND studio_id = p_studio_id;
    END LOOP;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 3. Optimized RLS for Customer Plans (Replacement)
DROP POLICY IF EXISTS "Studio owners can view their customers plans" ON public.customer_plans;
CREATE POLICY "Studio owners can view their customers plans" ON public.customer_plans
    FOR SELECT TO authenticated
    USING (check_studio_access(studio_id));

-- 4. Unique Constraint Hardening (Soft-Delete Aware)
-- This prevents name collisions between active and deleted items
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_studio_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS memberships_name_active_idx ON public.memberships (studio_id, name) WHERE (is_deleted = false);

ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_studio_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS packages_name_active_idx ON public.packages (studio_id, name) WHERE (is_deleted = false);
