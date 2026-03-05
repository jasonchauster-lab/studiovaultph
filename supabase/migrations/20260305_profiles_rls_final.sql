-- COMPREHENSIVE RLS CLEANUP & RECURSION FIX (V2)
-- This script replaces all potentially recursive policies on 'profiles' with safe versions.

-- 1. DROP ALL OLD POLICIES on profiles to start fresh
DROP POLICY IF EXISTS "Public can view instructor and studio profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Partners can view client profiles for active bookings" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;

-- 2. New safe policies for PROFILES

-- A. Everyone can see basic instructor/studio info (Safe: no subqueries)
CREATE POLICY "Public can view instructor and studio profiles"
    ON public.profiles FOR SELECT
    USING (role IN ('instructor', 'studio'));

-- B. Authenticated users can see their own full profile (Safe: no subqueries)
CREATE POLICY "Users can view own full profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- C. Users can update their own profile (Safe: no subqueries)
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- D. Admin access (Safe: uses security definer)
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.check_is_admin());

-- E. Partners can view client profiles (Safe: uses security definer function to avoid recursion)
CREATE OR REPLACE FUNCTION public.check_is_partner_of(client_uid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        -- Select from bookings/slots/studios directly (as security definer)
        -- to bypass RLS on those tables during this check
        SELECT 1 FROM public.bookings b
        JOIN public.slots s ON b.slot_id = s.id
        JOIN public.studios st ON s.studio_id = st.id
        WHERE b.client_id = client_uid
        AND (b.instructor_id = auth.uid() OR st.owner_id = auth.uid())
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Partners can view client profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.check_is_partner_of(id));

-- 3. ENSURE BOOKINGS IS ALSO SAFE
DROP POLICY IF EXISTS "Interested parties can view bookings" ON public.bookings;
CREATE POLICY "Interested parties can view bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = instructor_id OR
        EXISTS (
            SELECT 1 FROM public.slots s
            JOIN public.studios st ON s.studio_id = st.id
            WHERE s.id = bookings.slot_id AND st.owner_id = auth.uid()
        ) OR
        public.check_is_admin()
    );
