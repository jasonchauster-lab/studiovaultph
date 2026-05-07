-- Migration: Add Business Hours to Studios and Outlets
-- Date: 2026-04-12

-- 1. Add columns to public.studios (Fallback/Default)
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '06:00:00';
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00';

-- 2. Add columns to public.outlets (Branch Specific)
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '06:00:00';
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00';

-- Comment: These columns define the hours displayed in the calendar axis.
-- If an outlet has no hours set, it reverts to the default or studio level.
