-- Migration: 20260417_xendit_security_and_tracking.sql

-- 1. Create a secure table for payment configurations
CREATE TABLE IF NOT EXISTS studio_payment_configs (
    id UUID PRIMARY KEY REFERENCES studios(id) ON DELETE CASCADE,
    xendit_api_key TEXT,
    xendit_callback_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Move existing keys from studios to studio_payment_configs (if any)
INSERT INTO studio_payment_configs (id, xendit_api_key, xendit_callback_token)
SELECT id, xendit_api_key, xendit_callback_token FROM studios
ON CONFLICT (id) DO UPDATE SET
    xendit_api_key = EXCLUDED.xendit_api_key,
    xendit_callback_token = EXCLUDED.xendit_callback_token;

-- 3. Remove sensitive columns from studios (Optional, but safer)
-- ALTER TABLE studios DROP COLUMN IF EXISTS xendit_api_key;
-- ALTER TABLE studios DROP COLUMN IF EXISTS xendit_callback_token;
-- NOTE: I'll leave them for now to avoid breaking existing code until I've updated the actions.

-- 4. Enable RLS on the new secure table
ALTER TABLE studio_payment_configs ENABLE ROW LEVEL SECURITY;

-- 5. Create strict RLS policies
CREATE POLICY "Owners can manage their own payment config" 
ON studio_payment_configs
AS PERMISSIVE FOR ALL
TO authenticated
USING (id IN (SELECT id FROM studios WHERE owner_id = (SELECT auth.uid())))
WITH CHECK (id IN (SELECT id FROM studios WHERE owner_id = (SELECT auth.uid())));

-- 6. Add tracking columns to bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS xendit_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_checkout_url TEXT;

-- 7. Add tracking columns to customer_plans (pricing packages)
ALTER TABLE customer_plans 
ADD COLUMN IF NOT EXISTS xendit_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_checkout_url TEXT;

-- 8. Add a comment for clarity
COMMENT ON TABLE studio_payment_configs IS 'Secure storage for sensitive studio payment API keys, isolated from the main studios table.';
