-- Migration: 20260414_fix_rls_recursion.sql
-- Goal: Provide a non-recursive way to check studio membership for RLS policies.

/**
 * Checks if a profile is a member of a studio with specific roles.
 * Marked as SECURITY DEFINER to bypass RLS on studio_members and prevent infinite recursion.
 */
CREATE OR REPLACE FUNCTION public.check_studio_access(
    target_studio_id UUID,
    target_profile_id UUID,
    allowed_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- If allowed_roles is null, we just check for any membership
    IF allowed_roles IS NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM public.studio_members
            WHERE studio_id = target_studio_id
            AND profile_id = target_profile_id
        );
    ELSE
        -- Otherwise check for specific roles
        RETURN EXISTS (
            SELECT 1 FROM public.studio_members
            WHERE studio_id = target_studio_id
            AND profile_id = target_profile_id
            AND role = ANY(allowed_roles)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
