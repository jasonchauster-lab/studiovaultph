-- Migration: Add Display and Activation Options to Packages
-- Target: packages table

ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'auto' CHECK (display_type IN ('auto', 'custom')),
ADD COLUMN IF NOT EXISTS activation_type TEXT DEFAULT 'purchase' CHECK (activation_type IN ('purchase', 'first_booking')),
ADD COLUMN IF NOT EXISTS grace_period_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS grace_period_unit TEXT DEFAULT 'weeks' CHECK (grace_period_unit IN ('days', 'weeks', 'months'));

-- Optional: Add to memberships for consistency
ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'auto' CHECK (display_type IN ('auto', 'custom')),
ADD COLUMN IF NOT EXISTS activation_type TEXT DEFAULT 'purchase' CHECK (activation_type IN ('purchase', 'first_booking')),
ADD COLUMN IF NOT EXISTS grace_period_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS grace_period_unit TEXT DEFAULT 'weeks' CHECK (grace_period_unit IN ('days', 'weeks', 'months'));
