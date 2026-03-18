-- SQL Migration: Add Instructor Document Expiry
-- Date: 2026-03-18
-- Description: Adds bir_expiry to profiles and expiry_date to certifications to track instructor document expiration.

-- 1. Add bir_expiry to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bir_expiry DATE;

-- 2. Add expiry_date to certifications
ALTER TABLE public.certifications ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 3. Comment on columns for clarity
COMMENT ON COLUMN public.profiles.bir_expiry IS 'Expiration date of the instructor''s BIR Form 2303';
COMMENT ON COLUMN public.certifications.expiry_date IS 'Expiration date of the instructor''s certification';
