-- Migration: 20260415_studio_wallet_transactions.sql

-- 1. Create studio_wallet_transactions table
CREATE TABLE IF NOT EXISTS public.studio_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES public.customer_memberships(id) ON DELETE SET NULL,
    
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('adjustment', 'booking', 'refund', 'referral')),
    description TEXT,
    
    -- Balance snapshot after transaction
    new_balance NUMERIC(10,2),
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.studio_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users view own studio transactions" ON public.studio_wallet_transactions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Owners view all studio transactions" ON public.studio_wallet_transactions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = studio_wallet_transactions.studio_id AND owner_id = auth.uid()));

-- 4. Re-calculate total spent index (Optional but good for reporting)
CREATE INDEX IF NOT EXISTS idx_studio_wallet_transactions_lookup ON public.studio_wallet_transactions(studio_id, user_id);
