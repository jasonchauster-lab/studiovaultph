-- Migration: Marketing Quotas and Campaigns
-- Date: 2026-04-21

-- 1. Add marketing quota tracking to studios
ALTER TABLE public.studios 
ADD COLUMN IF NOT EXISTS monthly_marketing_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_limit_reset_at TIMESTAMPTZ DEFAULT now();

-- 2. Add marketing opt-in to studio_customers
ALTER TABLE public.studio_customers
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT TRUE;

-- 3. Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    segment TEXT NOT NULL, -- 'all', 'new', 'inactive', etc.
    recipient_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'sent', -- 'draft', 'sending', 'sent', 'failed'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 4. Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Owners can manage their campaigns" ON public.marketing_campaigns;
CREATE POLICY "Owners can manage their campaigns" ON public.marketing_campaigns
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = marketing_campaigns.studio_id AND owner_id = auth.uid()));

-- 6. Add triggers for updated_at
CREATE TRIGGER trg_marketing_campaigns_updated_at
    BEFORE UPDATE ON public.marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
