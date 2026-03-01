-- SQL Migration: Schema Cleanup & Naming Standardization
-- Date: 2026-03-01
-- Description: Removes unused columns identified during schema analysis and standardizes slot tracking in the bookings table.

-- 1. Cleanup 'bookings' table
ALTER TABLE public.bookings DROP COLUMN IF EXISTS opacity;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS selected_slot_ids; -- Obsolete, replaced by 'booked_slot_ids' in code

-- 2. Cleanup 'studios' table
ALTER TABLE public.studios DROP COLUMN IF EXISTS facil_rent;
ALTER TABLE public.studios DROP COLUMN IF EXISTS fin_cert_expiry;
ALTER TABLE public.studios DROP COLUMN IF EXISTS ins_cert_expiry;

-- 3. Cleanup 'profiles' table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS debug_error;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_looking_for_partner;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_looking_for_studio;

-- 4. Cleanup 'instructor_availability' table
ALTER TABLE public.instructor_availability DROP COLUMN IF EXISTS status;

-- 5. Cleanup 'payout_requests' table
ALTER TABLE public.payout_requests DROP COLUMN IF EXISTS bank_id; -- Redundant with 'bank_name'

-- Note: No data migration is needed as these columns were verified to be unused or redundant with existing data.
