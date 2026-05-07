-- migration: 20260404_logical_isolation.sql

-- 1. Add origin_portal to profiles to handle domain-aware login/signup
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS origin_portal TEXT DEFAULT 'marketplace';

COMMENT ON COLUMN profiles.origin_portal IS 'Tracks whether the user registered via studiovaultph.com (marketplace) or studiovault.co (cms).';

-- 2. Add is_public to studios to support Private-First mode
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN studios.is_public IS 'If false, the studio is hidden from the public marketplace search but remains accessible via custom domain/slug.';

-- 3. Add marketplace_status for easier filtering
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS marketplace_status TEXT DEFAULT 'private';

-- 4. Set existing studios to Public to avoid breaking current traffic
UPDATE studios SET is_public = true, marketplace_status = 'listed' WHERE is_public = false;
