-- Migration: 20260503_operational_observability_hardening
-- Phase 14: System Health & Financial Reconciliation

-- 1. Add Traceability to Bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS customer_plan_id UUID REFERENCES public.customer_plans(id) ON DELETE SET NULL;

-- 2. Create Webhook Logging for Financial Traceability
CREATE TABLE IF NOT EXISTS public.payment_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    status TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_studio_id ON public.payment_webhook_logs(studio_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_external_id ON public.payment_webhook_logs(external_id);

-- 3. Financial Reconciliation Engine
CREATE OR REPLACE FUNCTION public.reconcile_studio_plans(
    p_studio_id UUID
)
RETURNS TABLE (
    plan_id UUID,
    customer_name TEXT,
    plan_name TEXT,
    stored_credits INT,
    calculated_credits INT,
    discrepancy INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH plan_usage AS (
        SELECT 
            cp.id as cp_id,
            COALESCE(SUM(b.quantity), 0) as used_credits
        FROM public.customer_plans cp
        LEFT JOIN public.bookings b ON b.customer_plan_id = cp.id AND b.status != 'cancelled'
        WHERE cp.studio_id = p_studio_id
        GROUP BY cp.id
    ),
    plan_base AS (
        SELECT 
            cp.id as cp_id,
            COALESCE(p.credits, m.credits) as base_credits,
            p.name as pkg_name,
            m.name as mem_name,
            pr.full_name as cust_name,
            cp.remaining_credits as stored
        FROM public.customer_plans cp
        JOIN public.profiles pr ON pr.id = cp.user_id
        LEFT JOIN public.packages p ON p.id = cp.package_id
        LEFT JOIN public.memberships m ON m.id = cp.membership_id
        WHERE cp.studio_id = p_studio_id
    )
    SELECT 
        pb.cp_id,
        pb.cust_name,
        COALESCE(pb.pkg_name, pb.mem_name, 'Unknown Plan'),
        pb.stored,
        (pb.base_credits - pu.used_credits)::INT as calculated,
        (pb.stored - (pb.base_credits - pu.used_credits))::INT as diff
    FROM plan_base pb
    JOIN plan_usage pu ON pu.cp_id = pb.cp_id
    WHERE pb.base_credits IS NOT NULL 
    AND (pb.stored - (pb.base_credits - pu.used_credits)) != 0;
END;
$$;

-- 4. Enable RLS on Logs
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their own studio logs" ON public.payment_webhook_logs;
CREATE POLICY "Owners can view their own studio logs" 
ON public.payment_webhook_logs
FOR SELECT TO authenticated
USING (studio_id IN (SELECT id FROM studios WHERE owner_id = auth.uid()));
