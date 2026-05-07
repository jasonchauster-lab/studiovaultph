-- Migration: 20260404_cma_enablement.sql
-- Isolate Website Builder (CMA) studios from Marketplace-only signups

ALTER TABLE studios 
ADD COLUMN IF NOT EXISTS is_cma_enabled BOOLEAN DEFAULT false;

-- Create index for filtering the Builder directory
CREATE INDEX IF NOT EXISTS idx_studios_cma_enabled ON studios(is_cma_enabled);

-- Update existing studios: If they have a custom domain OR a non-starter plan, they are definitely CMA users.
UPDATE studios 
SET is_cma_enabled = true 
WHERE custom_domain IS NOT NULL 
OR subscription_tier IN ('pro', 'elite', 'premium');

-- LOGICAL ISOLATION: 
-- Any studio created via the 'marketplace' (studiovaultph.com) 
-- will now have is_cma_enabled = false by default, preventing them 
-- from cluttering the Builder Admin directory until they explicitly 'opt-in'.
