-- REPAIR: Missing Foreign Key for Instructor Availability
-- Run this in your Supabase SQL Editor to fix the "No instructors available" bug.

-- 1. Check if the foreign key already exists (to avoid errors)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'instructor_availability_instructor_id_fkey'
    ) THEN
        -- 2. Add the foreign key relationship
        ALTER TABLE public.instructor_availability
        ADD CONSTRAINT instructor_availability_instructor_id_fkey
        FOREIGN KEY (instructor_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key added successfully.';
    ELSE
        RAISE NOTICE 'Foreign key already exists.';
    END IF;
END $$;

-- 3. Also verify certifications relationship just in case
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'certifications_instructor_id_fkey'
    ) THEN
        ALTER TABLE public.certifications
        ADD CONSTRAINT certifications_instructor_id_fkey
        FOREIGN KEY (instructor_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Certifications foreign key added successfully.';
    ELSE
        RAISE NOTICE 'Certifications foreign key already exists.';
    END IF;
END $$;
