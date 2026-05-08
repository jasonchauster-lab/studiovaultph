-- Migration: Add cancellation rules to studios table
-- Description: Adds late_cancel_hours and no_show_penalty columns to support functional cancellation policies.

ALTER TABLE public.studios 
ADD COLUMN IF NOT EXISTS late_cancel_hours INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS no_show_penalty BOOLEAN DEFAULT FALSE;

-- Ensure existing records have the defaults
UPDATE public.studios SET late_cancel_hours = 12 WHERE late_cancel_hours IS NULL;
UPDATE public.studios SET no_show_penalty = FALSE WHERE no_show_penalty IS NULL;
