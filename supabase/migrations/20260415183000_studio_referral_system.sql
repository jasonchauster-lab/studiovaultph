-- Migration: Studio-Specific Referral System
-- Implements siloed referral programs for slug-based websites.

-- 1. Referral Configurations for Studios
CREATE TABLE IF NOT EXISTS public.studio_referral_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE,
    
    -- Reward settings for the REFERRER
    reward_discount_type TEXT DEFAULT 'fixed_amount' CHECK (reward_discount_type IN ('percentage', 'fixed_amount')),
    reward_discount_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Which items the discount can be applied to
    applicable_package_ids UUID[] DEFAULT '{}',
    applicable_membership_ids UUID[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(studio_id)
);

-- 2. Referral Tracking (Siloed per studio)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- A user can only be referred to a specific studio once
    UNIQUE(referred_id, studio_id)
);

-- 3. Referrer Rewards (Discounts to be applied on next purchase)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
    
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    
    -- Snapshot of applicable items at the time the reward was earned
    applicable_item_ids UUID[] DEFAULT '{}',
    
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_in_plan_id UUID, -- Links to customer_plans once used
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.studio_referral_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Studio Owners manage their configs
CREATE POLICY "Owners manage referral configs" ON public.studio_referral_configs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = studio_referral_configs.studio_id AND owner_id = auth.uid()));

-- Users can see configs for studios (public for storefront)
CREATE POLICY "Public view referral configs" ON public.studio_referral_configs
    FOR SELECT USING (is_enabled = TRUE);

-- Users can see their own referrals
CREATE POLICY "Users view own referrals" ON public.referrals
    FOR SELECT TO authenticated
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Studio Owners can see referrals for their studio
CREATE POLICY "Owners view studio referrals" ON public.referrals
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = referrals.studio_id AND owner_id = auth.uid()));

-- Users can see their own rewards
CREATE POLICY "Users view own rewards" ON public.referral_rewards
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Studio Owners can see rewards for their studio
CREATE POLICY "Owners view studio rewards" ON public.referral_rewards
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = referral_rewards.studio_id AND owner_id = auth.uid()));

-- 6. Updated At Triggers
CREATE TRIGGER trg_studio_referral_configs_updated_at
    BEFORE UPDATE ON public.studio_referral_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_referral_rewards_updated_at
    BEFORE UPDATE ON public.referral_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Add referral tracking to checkout logic helpers
-- This function will be used during checkout to find the best available reward
CREATE OR REPLACE FUNCTION public.get_best_referral_reward(
    p_user_id UUID,
    p_studio_id UUID,
    p_item_id UUID
)
RETURNS TABLE (
    reward_id UUID,
    discount_type TEXT,
    discount_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id, 
        discount_type, 
        discount_value
    FROM public.referral_rewards
    WHERE user_id = p_user_id
      AND studio_id = p_studio_id
      AND is_used = FALSE
      AND (
          array_length(applicable_item_ids, 1) IS NULL -- Applies to all if empty
          OR p_item_id = ANY(applicable_item_ids)
      )
    ORDER BY 
        CASE WHEN discount_type = 'percentage' THEN 1 ELSE 2 END, -- Prioritize percentage discounts? Or maybe just newest?
        discount_value DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
