-- Migration: Create RPC for Manual Approvals
-- Bypasses RLS to ensure studio owners always see their pending payments.

CREATE OR REPLACE FUNCTION public.get_pending_approvals_v1(
    p_studio_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_id UUID := auth.uid();
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Check if user is authorized for this studio
    SELECT EXISTS (
        SELECT 1 FROM public.studios WHERE id = p_studio_id AND owner_id = v_auth_id
        UNION
        SELECT 1 FROM public.studio_members WHERE studio_id = p_studio_id AND profile_id = v_auth_id
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- 2. Fetch plans with joins
    RETURN (
        SELECT jsonb_agg(plans)
        FROM (
            SELECT 
                cp.*,
                CASE WHEN cp.package_id IS NOT NULL THEN jsonb_build_object('name', p.name) ELSE NULL END as packages,
                CASE WHEN cp.membership_id IS NOT NULL THEN jsonb_build_object('name', m.name) ELSE NULL END as memberships,
                jsonb_build_object('full_name', prof.full_name, 'email', prof.email) as profiles,
                CASE WHEN cp.verified_by IS NOT NULL THEN jsonb_build_object('full_name', verifier.full_name) ELSE NULL END as verifier
            FROM public.customer_plans cp
            LEFT JOIN public.packages p ON cp.package_id = p.id
            LEFT JOIN public.memberships m ON cp.membership_id = m.id
            JOIN public.profiles prof ON cp.user_id = prof.id
            LEFT JOIN public.profiles verifier ON cp.verified_by = verifier.id
            WHERE cp.studio_id = p_studio_id
            -- Include all plans that might need manual attention
            AND (cp.status = 'pending_payment' OR cp.payment_proof_url IS NOT NULL OR cp.status IN ('active', 'cancelled'))
            ORDER BY cp.created_at DESC
        ) plans
    );
END;
$$;
