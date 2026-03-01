-- SQL Migration: Deploy Admin Balance Adjustment RPC & Fix Constraints
-- Date: 2026-03-02

-- 1. Fix constraints on wallet_top_ups to allow debits (negative amounts)
ALTER TABLE public.wallet_top_ups DROP CONSTRAINT IF EXISTS wallet_top_ups_amount_check;
ALTER TABLE public.wallet_top_ups ADD CONSTRAINT wallet_top_ups_amount_nonzero_check CHECK (amount <> 0);

-- 2. Create the Atomic RPC for Admin Balance Adjustments
CREATE OR REPLACE FUNCTION public.execute_admin_balance_adjustment(
    p_user_id uuid,
    p_amount numeric,
    p_reason text
)
RETURNS boolean AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
    v_floor numeric := -2000.00;
BEGIN
    -- Locked profile row
    SELECT available_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    v_new_balance := v_current_balance + p_amount;

    -- Floor check for debits
    IF p_amount < 0 AND v_new_balance < v_floor THEN
        RAISE EXCEPTION 'Adjustment would put account below the allowed floor of P%', v_floor;
    END IF;

    -- Insert Audit Record
    INSERT INTO public.wallet_top_ups (
        user_id,
        amount,
        type,
        status,
        admin_notes,
        processed_at,
        payment_proof_url
    ) VALUES (
        p_user_id,
        p_amount,
        'admin_adjustment',
        'approved',
        p_reason,
        NOW(),
        'ADMIN_OVERRIDE'
    );

    -- Update Balance
    UPDATE public.profiles
    SET available_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Audit RLS for wallet_top_ups
-- Ensure users can update their own pending requests with proofs
DROP POLICY IF EXISTS "Users can update their own pending top-ups" ON public.wallet_top_ups;
CREATE POLICY "Users can update their own pending top-ups"
    ON public.wallet_top_ups FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Ensure admins can do everything
DROP POLICY IF EXISTS "Admins can do everything on top-ups" ON public.wallet_top_ups;
CREATE POLICY "Admins can do everything on top-ups"
    ON public.wallet_top_ups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
