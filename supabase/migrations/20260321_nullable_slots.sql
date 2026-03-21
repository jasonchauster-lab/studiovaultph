-- Migration: Allow bookings without studio slots (for home sessions)
-- Date: 2026-03-21

ALTER TABLE public.bookings ALTER COLUMN slot_id DROP NOT NULL;

-- Also ensure studio_id is nullable (though it already should be for home)
ALTER TABLE public.bookings ALTER COLUMN studio_id DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN public.bookings.slot_id IS 'Reference to slots table. Null for home sessions or bookings not tied to a specific studio inventory.';
