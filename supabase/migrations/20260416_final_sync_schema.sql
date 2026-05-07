-- ==========================================
-- FINAL HYBRID MARKETPLACE SYNC SCHEMA
-- 1. Studio-Level (Global) Documents
-- 2. Branch-Level (Local) Documents
-- 3. Verification Tracking
-- ==========================================

-- 1. GLOBAL (STUDIO) LEVEL DOCUMENTS
ALTER TABLE public.studios 
ADD COLUMN IF NOT EXISTS bir_url TEXT,
ADD COLUMN IF NOT EXISTS bir_expiry DATE,
ADD COLUMN IF NOT EXISTS gov_id_url TEXT,
ADD COLUMN IF NOT EXISTS gov_id_expiry DATE,
ADD COLUMN IF NOT EXISTS sec_cert_url TEXT,
ADD COLUMN IF NOT EXISTS marketplace_eligibility TEXT DEFAULT 'inactive' CHECK (marketplace_eligibility IN ('inactive', 'pending', 'active', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. LOCAL (BRANCH/OUTLET) LEVEL DOCUMENTS
ALTER TABLE public.outlets 
ADD COLUMN IF NOT EXISTS marketplace_status TEXT DEFAULT 'inactive' CHECK (marketplace_status IN ('inactive', 'pending', 'active', 'rejected')),
ADD COLUMN IF NOT EXISTS is_marketplace_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mayors_permit_url TEXT,
ADD COLUMN IF NOT EXISTS mayors_permit_expiry DATE,
ADD COLUMN IF NOT EXISTS insurance_url TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS manual_verification_notes TEXT;

-- 3. COMMENTS
COMMENT ON COLUMN public.studios.marketplace_eligibility IS 'Global studio status before any branches can be synced.';
COMMENT ON COLUMN public.outlets.marketplace_status IS 'Individual branch status (e.g. valid Mayor''s Permit).';
