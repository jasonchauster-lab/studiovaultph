-- Migration: Add check-in columns to bookings table
-- Description: Adds timestamps for when an instructor checks in a client and when a studio checks in an instructor.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS instructor_checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_checked_in_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.instructor_checked_in_at IS 'Timestamp when the studio owner checked in the instructor for this session.';
COMMENT ON COLUMN public.bookings.client_checked_in_at IS 'Timestamp when the instructor checked in the client for this session.';
