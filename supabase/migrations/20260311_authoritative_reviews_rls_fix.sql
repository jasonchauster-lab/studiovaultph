-- AUTHORITATIVE REVIEWS RLS FIX
-- This migration consolidates all previous reviews policies into a single, reliable set.
-- It ensures that participants can submit reviews and everyone can read them.

DO $$
DECLARE
    pol_rec RECORD;
BEGIN
    -- 1. Drop ALL existing policies on public.reviews
    FOR pol_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'reviews'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', pol_rec.policyname);
    END LOOP;
END $$;

-- 2. Allow insertion if the user is the reviewer
-- We use a simple uid check which is safe and standard.
CREATE POLICY "Allow reviewers to insert" 
    ON public.reviews FOR INSERT 
    WITH CHECK (auth.uid() = reviewer_id);

-- 3. Allow everyone to read reviews
-- Visibility logic (double-blind) is handled in the application layer (actions.ts)
-- but the DB must allow the SELECT for the app to see the rows at all.
CREATE POLICY "Allow everyone to read reviews" 
    ON public.reviews FOR SELECT 
    USING (true);

-- 4. Admin Full Access
-- Uses the existing security definer helper to avoid recursion.
CREATE POLICY "Admin full access to reviews" 
    ON public.reviews FOR ALL 
    TO authenticated 
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 5. Ensure RLS is enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
