-- Migration: Manual Payment Audit & Verification
-- Date: 2026-04-16

-- 1. Add audit fields to customer_plans
ALTER TABLE public.customer_plans 
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Update activate_customer_plan RPC to handle audits
CREATE OR REPLACE FUNCTION public.activate_customer_plan(
    p_plan_id UUID,
    p_verified_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.customer_plans
    SET status = 'active',
        verified_by = p_verified_by,
        verified_at = now(),
        updated_at = now()
    WHERE id = p_plan_id
      AND status = 'pending_payment';
      
    RETURN jsonb_build_object('success', true);
END;
$$;
