-- Migration: Add studio_id to bookings and fix RLS visibility
-- Date: 2026-03-09

-- 1. Add studio_id column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_studio_id ON public.bookings(studio_id);

-- 3. Backfill studio_id from slots (for existing bookings)
UPDATE public.bookings b
SET studio_id = s.studio_id
FROM public.slots s
WHERE b.slot_id = s.id
  AND b.studio_id IS NULL;

-- 4. Update RLS policies for bookings
-- Drop existing restricted policy
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins view all bookings" ON public.bookings;

-- Rebuild with Studio Owner support
CREATE POLICY "Users view own bookings" 
ON public.bookings 
FOR SELECT 
USING (
    auth.uid() = client_id 
    OR auth.uid() = instructor_id
    OR EXISTS (
        SELECT 1 FROM public.studios 
        WHERE id = bookings.studio_id 
          AND owner_id = auth.uid()
    )
);

CREATE POLICY "Admins view all bookings" ON public.bookings FOR SELECT USING (public.check_is_admin());

-- 5. Update book_slot_atomic RPC to include studio_id
-- We'll do this via run_command to ensure it's applied correctly to the function definition.
