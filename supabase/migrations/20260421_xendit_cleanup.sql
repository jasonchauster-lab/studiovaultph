
-- Migration: 20260421_xendit_cleanup.sql
-- FINAL CLEANUP: Remove sensitive columns from the main studios table.
-- These have already been migrated to studio_payment_configs.

ALTER TABLE public.studios DROP COLUMN IF EXISTS xendit_api_key;
ALTER TABLE public.studios DROP COLUMN IF EXISTS xendit_callback_token;

-- Also, ensure studio_payment_configs has correct comments and indexes
CREATE INDEX IF NOT EXISTS idx_studio_payment_configs_id ON public.studio_payment_configs(id);

-- Verify RLS is strict
DROP POLICY IF EXISTS "Owners can manage their own payment config" ON studio_payment_configs;
CREATE POLICY "Owners can manage their own payment config" 
ON studio_payment_configs
FOR ALL
TO authenticated
USING (id IN (SELECT id FROM studios WHERE owner_id = auth.uid()))
WITH CHECK (id IN (SELECT id FROM studios WHERE owner_id = auth.uid()));

COMMENT ON COLUMN public.studios.enable_xendit IS 'Whether Xendit integration is active for this studio. The actual API keys are stored in the secure studio_payment_configs table.';
