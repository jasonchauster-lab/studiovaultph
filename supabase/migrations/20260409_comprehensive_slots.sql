-- Migration: Comprehensive Slot Data & Studio Settings
-- Date: 2026-04-09

-- 1. Update slots table
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS pax_capacity INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS waitlist_pax_capacity INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS calendar_color TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS facility_name TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- 2. Update studios table with global waitlist settings
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_waitlist_capacity INT DEFAULT 0;

-- 3. Update existing data (optional, setting quantities as initial capacity)
UPDATE slots SET pax_capacity = quantity WHERE pax_capacity IS NULL;
