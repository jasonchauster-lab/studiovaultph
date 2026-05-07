-- Migration: Add Enhanced Package Configuration Fields
-- Target: packages table

ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS location_access_type TEXT DEFAULT 'admin_selected' CHECK (location_access_type IN ('admin_selected', 'customer_selected')),
ADD COLUMN IF NOT EXISTS location_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validity_value INTEGER,
ADD COLUMN IF NOT EXISTS validity_unit TEXT DEFAULT 'months' CHECK (validity_unit IN ('days', 'weeks', 'months')),
ADD COLUMN IF NOT EXISTS purchase_limit INTEGER,
ADD COLUMN IF NOT EXISTS restriction_type TEXT DEFAULT 'all' CHECK (restriction_type IN ('all', 'new_clients')),
ADD COLUMN IF NOT EXISTS booking_per_class_limit INTEGER;

-- Initialize existing data
UPDATE public.packages 
SET validity_value = validity_days, 
    validity_unit = 'days' 
WHERE validity_value IS NULL;

-- Also add to memberships for schema consistency
ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS location_access_type TEXT DEFAULT 'admin_selected' CHECK (location_access_type IN ('admin_selected', 'customer_selected')),
ADD COLUMN IF NOT EXISTS location_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validity_value INTEGER,
ADD COLUMN IF NOT EXISTS validity_unit TEXT DEFAULT 'months' CHECK (validity_unit IN ('days', 'weeks', 'months')),
ADD COLUMN IF NOT EXISTS purchase_limit INTEGER,
ADD COLUMN IF NOT EXISTS restriction_type TEXT DEFAULT 'all' CHECK (restriction_type IN ('all', 'new_clients')),
ADD COLUMN IF NOT EXISTS booking_per_class_limit INTEGER;

UPDATE public.memberships 
SET validity_value = validity_days, 
    validity_unit = 'days' 
WHERE validity_value IS NULL;
