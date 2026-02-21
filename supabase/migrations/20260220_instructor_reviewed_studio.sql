-- Add instructor_reviewed_studio column to track studio review by instructor separately
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS instructor_reviewed_studio boolean NOT NULL DEFAULT false;
