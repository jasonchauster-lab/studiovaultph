-- Create wallet_top_ups table
CREATE TABLE IF NOT EXISTS public.wallet_top_ups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL CHECK (amount > 0),
    payment_proof_url text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason text,
    admin_notes text,
    type text NOT NULL DEFAULT 'top_up' CHECK (type IN ('top_up', 'admin_adjustment')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_top_ups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own top-ups"
    ON public.wallet_top_ups FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own top-up requests"
    ON public.wallet_top_ups FOR INSERT
    WITH CHECK (auth.uid() = user_id AND type = 'top_up');

CREATE POLICY "Admins can do everything on top-ups"
    ON public.wallet_top_ups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.wallet_top_ups
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wallet_top_ups_user_id ON public.wallet_top_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_top_ups_status ON public.wallet_top_ups(status);
