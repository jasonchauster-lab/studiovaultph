-- 1. Add origin_portal to bookings to track where bookings came from
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS origin_portal TEXT DEFAULT 'cms';

-- 2. Add marketplace sync and verification columns to outlets (branches)
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS is_marketplace_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS marketplace_status TEXT DEFAULT 'inactive'; -- enum: inactive, pending, active, rejected
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS mayors_permit_url TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS mayors_permit_expiry DATE;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS insurance_url TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS manual_verification_notes TEXT;

-- 3. Update sample data (Optional)
-- UPDATE bookings SET origin_portal = 'marketplace' WHERE ...;
