-- Phase 6: Advanced Hardening Migration

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL, -- e.g., 'UPDATE_PRICE', 'DELETE_SERVICE', 'ROLE_CHANGE'
    entity_type TEXT NOT NULL, -- e.g., 'service', 'membership', 'promo_code'
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow only owners and staff to read audit logs for their studio
CREATE POLICY "Users can view audit logs for their studio"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.studio_members
            WHERE studio_members.studio_id = audit_logs.studio_id
            AND studio_members.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.studios
            WHERE studios.id = audit_logs.studio_id
            AND studios.owner_id = auth.uid()
        )
    );

-- 2. Add Soft Delete Columns
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.promo_codes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_services_is_deleted ON public.services(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_memberships_is_deleted ON public.memberships(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_packages_is_deleted ON public.packages(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_deleted ON public.promo_codes(is_deleted) WHERE is_deleted = false;

-- 3. Add Payout Lock (Anti-spam)
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS last_payout_request_at TIMESTAMPTZ;

COMMENT ON TABLE public.audit_logs IS 'Tracks all administrative and financial mutations within a studio.';
