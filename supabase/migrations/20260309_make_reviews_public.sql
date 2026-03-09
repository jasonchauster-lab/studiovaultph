-- FIX REVIEWS VISIBILITY (GUEST ACCESS)
-- Using a PL/pgSQL block to ensure conditional DROP works correctly via exec_sql
DO $$ 
BEGIN
    -- 1. Allow public select on reviews
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' AND policyname = 'Authenticated users can read reviews'
    ) THEN
        DROP POLICY "Authenticated users can read reviews" ON public.reviews;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' AND policyname = 'Everyone can read reviews'
    ) THEN
        CREATE POLICY "Everyone can read reviews" 
            ON public.reviews FOR SELECT 
            USING (true);
    END IF;

    -- 2. Allow public select on profiles (so guests can see name/avatar in reviews)
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Profiles are publicly viewable'
    ) THEN
        DROP POLICY "Profiles are publicly viewable" ON public.profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'Profiles are publicly viewable by guests'
    ) THEN
        CREATE POLICY "Profiles are publicly viewable by guests" 
            ON public.profiles FOR SELECT 
            USING (true);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
