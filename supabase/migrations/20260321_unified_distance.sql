-- SQL Migration: Unified Distance-Based Bookings
-- Date: 2026-03-21
-- Description: Adds radius-based location settings and home session support.

-- 1. Update 'profiles' table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_base_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_base_lat NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_base_lng NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_travel_km INT DEFAULT 10;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS offers_home_sessions BOOLEAN DEFAULT FALSE;

-- 2. Update 'studios' table
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS lng NUMERIC;

-- 3. Update 'bookings' table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'studio';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS home_lat NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS home_lng NUMERIC;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_start_time TIME;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_end_time TIME;

-- 4. Create an index for faster availability checks (composite)
CREATE INDEX IF NOT EXISTS idx_bookings_date_instructor ON public.bookings (booking_date, instructor_id);

-- 5. Backfill booking_date/time from existing slots association
UPDATE public.bookings b
SET 
  booking_date = s.date,
  booking_start_time = s.start_time,
  booking_end_time = s.end_time
FROM public.slots s
WHERE b.slot_id = s.id
AND b.booking_date IS NULL;

-- 6. Helper Function: Haversine distance in KM
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  R NUMERIC := 6371; -- Earth radius in KM
  dLat NUMERIC := radians(lat2 - lat1);
  dLon NUMERIC := radians(lon2 - lon1);
  a NUMERIC;
  c NUMERIC;
BEGIN
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
