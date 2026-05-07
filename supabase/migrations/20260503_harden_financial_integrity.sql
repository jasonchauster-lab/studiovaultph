-- Migration: Harden Plan Activation & Webhook Logs
-- Date: 2026-05-03

-- 1. Create Webhook Logging for Financial Traceability
CREATE TABLE IF NOT EXISTS public.payment_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    invoice_id TEXT,
    status TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for debugging/audit
CREATE INDEX IF NOT EXISTS idx_payment_logs_studio_id ON public.payment_webhook_logs(studio_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_external_id ON public.payment_webhook_logs(external_id);

-- 2. Hardened Activation RPC
CREATE OR REPLACE FUNCTION public.activate_customer_plan(
    p_plan_id UUID,
    p_verified_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan RECORD;
    v_validity_days INT;
BEGIN
    -- 1. Lock the plan to prevent concurrent activations
    SELECT * INTO v_plan FROM public.customer_plans WHERE id = p_plan_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
    END IF;
    
    -- 2. Idempotency check
    IF v_plan.status = 'active' THEN
        RETURN jsonb_build_object('success', true, 'note', 'Plan is already active');
    END IF;
    
    -- 3. Handle Expiration Date (Activation-based)
    IF v_plan.expires_at IS NULL THEN
        IF v_plan.plan_type = 'package' THEN
            SELECT validity_days INTO v_validity_days FROM public.packages WHERE id = v_plan.package_id;
        ELSE
            SELECT validity_days INTO v_validity_days FROM public.memberships WHERE id = v_plan.membership_id;
        END IF;
        
        IF v_validity_days IS NOT NULL THEN
            UPDATE public.customer_plans 
            SET expires_at = now() + (v_validity_days || ' days')::INTERVAL 
            WHERE id = p_plan_id;
        END IF;
    END IF;
    
    -- 4. Final Status Update
    UPDATE public.customer_plans
    SET status = 'active',
        verified_by = p_verified_by,
        verified_at = now(),
        updated_at = now()
    WHERE id = p_plan_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;
