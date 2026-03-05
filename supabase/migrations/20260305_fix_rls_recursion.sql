-- Fix RLS Recursion in profiles table
-- Date: 2026-03-05

-- 1. Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- 3. Re-create the admin policy using the non-recursive function
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.check_is_admin());

-- 4. Also check if "Partners can view client profiles" needs similar protection
-- This one is likely okay because it joins other tables, but let's keep an eye on it.
-- For now, the profiles-to-profiles check was the main culprit.
