-- Migration: Add Eligibility and Category to Pricing Plans
-- This allows memberships and packages to specify which services they apply to and their category.

-- 1. Add columns to memberships
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS applicable_service_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Add columns to packages
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS applicable_service_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Update existing records (optional, but good practice if any exist)
UPDATE memberships SET applicable_service_ids = '{}' WHERE applicable_service_ids IS NULL;
UPDATE packages SET applicable_service_ids = '{}' WHERE applicable_service_ids IS NULL;
