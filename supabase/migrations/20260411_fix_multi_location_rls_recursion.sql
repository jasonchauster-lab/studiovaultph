-- ==========================================
-- SQL Migration: Fix Multi-Location RLS Recursion
-- Date: 2026-04-11
-- Description:
-- Breaks the infinite recursion loop between 'outlets' and 'outlet_members'
-- policies by using Security Definer helper functions.
-- ==========================================

-- 1. DROP PROBLEMATIC POLICIES
DROP POLICY IF EXISTS "Members can view their outlets" ON public.outlets;
DROP POLICY IF EXISTS "Owners can manage outlet members" ON public.outlet_members;
DROP POLICY IF EXISTS "Members can view outlet colleagues" ON public.outlet_members;

-- 2. CREATE SECURITY DEFINER HELPERS
-- These functions run with elevated privileges (bypassing RLS internally)
-- to break the circular dependency.

-- Helper: Check if a profile is a member of a specific outlet
CREATE OR REPLACE FUNCTION public.check_is_outlet_member(p_outlet_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Bypasses RLS internally
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.outlet_members om
        JOIN public.studio_members sm ON om.member_id = sm.id
        WHERE om.outlet_id = p_outlet_id 
          AND sm.profile_id = p_profile_id
    );
END;
$$;

-- Helper: Check if a profile is the owner of the studio that an outlet belongs to
CREATE OR REPLACE FUNCTION public.check_is_outlet_owner(p_outlet_id UUID, p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Bypasses RLS internally
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.outlets o
        JOIN public.studios s ON o.studio_id = s.id
        WHERE o.id = p_outlet_id 
          AND s.owner_id = p_profile_id
    );
END;
$$;

-- 3. RESTORE POLICIES USING SAFE HELPERS

-- A. Outlets: Members view
-- This policy now uses the Security Definer function to check membership 
-- without triggering a recursive RLS check on outlet_members.
CREATE POLICY "Members can view their outlets" ON public.outlets
    FOR SELECT TO authenticated
    USING (public.check_is_outlet_member(id, auth.uid()));

-- B. Outlet Members: Owners manage
-- This policy now uses the Security Definer function to check studio ownership 
-- without triggering a recursive RLS check on outlets.
CREATE POLICY "Owners can manage outlet members" ON public.outlet_members
    FOR ALL TO authenticated
    USING (public.check_is_outlet_owner(outlet_id, auth.uid()));

-- C. Outlet Members: Members view colleagues
-- This policy uses the Security Definer function to check if the current user
-- is a member of the outlet in question.
CREATE POLICY "Members can view outlet colleagues" ON public.outlet_members
    FOR SELECT TO authenticated
    USING (
        -- Can view self
        EXISTS (SELECT 1 FROM public.studio_members sm WHERE sm.id = outlet_members.member_id AND sm.profile_id = auth.uid())
        OR 
        -- Can view colleagues in the same outlet
        public.check_is_outlet_member(outlet_id, auth.uid())
    );

-- 4. REFRESH POSTGREST (Self-healing notice)
-- Note: After running this, the "INFINITE RECURSION" error should be resolved.
NOTIFY pgrst, 'reload schema';
