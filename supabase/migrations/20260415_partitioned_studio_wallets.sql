-- Migration: 20260415_partitioned_studio_wallets.sql

-- 1. Create customer_memberships table
-- This table isolates a user's balance per studio.
CREATE TABLE IF NOT EXISTS public.customer_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    available_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    pending_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, studio_id)
);

-- 2. Add RLS
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Studio owners can manage customer balances" ON public.customer_memberships;
CREATE POLICY "Studio owners can manage customer balances" ON public.customer_memberships
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = customer_memberships.studio_id AND owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.studios WHERE id = customer_memberships.studio_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view their own studio balances" ON public.customer_memberships;
CREATE POLICY "Users can view their own studio balances" ON public.customer_memberships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 4. Studio-Scoped Financial RPCs (Defining as SECURITY DEFINER to bypass RLS for atomic checks)
-- These match the signature of the global ones but take a p_studio_id.

-- Increment Pending (Studio)
CREATE OR REPLACE FUNCTION public.increment_studio_pending_balance(p_user_id uuid, p_studio_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
    INSERT INTO public.customer_memberships (user_id, studio_id, pending_balance)
    VALUES (p_user_id, p_studio_id, p_amount)
    ON CONFLICT (user_id, studio_id) 
    DO UPDATE SET 
        pending_balance = customer_memberships.pending_balance + p_amount,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unlock Funds (Studio)
CREATE OR REPLACE FUNCTION public.unlock_studio_funds(p_user_id uuid, p_studio_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.customer_memberships
    SET 
        pending_balance = GREATEST(0, pending_balance - p_amount),
        available_balance = available_balance + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND studio_id = p_studio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct Available (Studio)
CREATE OR REPLACE FUNCTION public.deduct_studio_available_balance(p_user_id uuid, p_studio_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.customer_memberships
    SET 
        available_balance = GREATEST(0, available_balance - p_amount),
        updated_at = now()
    WHERE user_id = p_user_id AND studio_id = p_studio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment Available (Studio)
CREATE OR REPLACE FUNCTION public.increment_studio_available_balance(p_user_id uuid, p_studio_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
    INSERT INTO public.customer_memberships (user_id, studio_id, available_balance)
    VALUES (p_user_id, p_studio_id, p_amount)
    ON CONFLICT (user_id, studio_id) 
    DO UPDATE SET 
        available_balance = customer_memberships.available_balance + p_amount,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Initialize Feature Flag in website_config
-- Ensuring all studios have a 'features' object with 'wallet_enabled' default to true
UPDATE public.studios
SET website_config = jsonb_set(
    COALESCE(website_config, '{}'::jsonb),
    '{features}',
    COALESCE(website_config->'features', '{}'::jsonb) || '{"wallet_enabled": true}'::jsonb
)
WHERE website_config->'features'->'wallet_enabled' IS NULL;
