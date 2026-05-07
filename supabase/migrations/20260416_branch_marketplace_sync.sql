-- ==========================================
-- BRANCH-SPECIFIC MARKETPLACE SYNC
-- 1. Add marketplace status and toggle
-- 2. Add document and expiry fields
-- 3. Add verification notes
-- ==========================================

-- 1. Add fields to outlets table
ALTER TABLE public.outlets 
ADD COLUMN IF NOT EXISTS marketplace_status TEXT DEFAULT 'inactive' CHECK (marketplace_status IN ('inactive', 'pending', 'active', 'rejected')),
ADD COLUMN IF NOT EXISTS is_marketplace_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Add document and expiry fields
ALTER TABLE public.outlets
ADD COLUMN IF NOT EXISTS bir_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS bir_expiry DATE,
ADD COLUMN IF NOT EXISTS gov_id_url TEXT,
ADD COLUMN IF NOT EXISTS gov_id_expiry DATE,
ADD COLUMN IF NOT EXISTS mayors_permit_url TEXT,
ADD COLUMN IF NOT EXISTS mayors_permit_expiry DATE,
ADD COLUMN IF NOT EXISTS secretary_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS insurance_url TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE;

-- 3. Add comment for clarity
COMMENT ON COLUMN public.outlets.marketplace_status IS 'Tracks the admin verification lifecycle for marketplace listing eligibility.';
COMMENT ON COLUMN public.outlets.is_marketplace_sync_enabled IS 'The manual toggle for the studio owner to go live after approval.';
