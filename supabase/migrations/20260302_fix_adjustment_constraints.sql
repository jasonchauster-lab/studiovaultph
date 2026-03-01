-- SQL Migration: Fix Manual Balance Adjustment Constraints & Add Atomic RPC
-- Date: 2026-03-02

-- 1. Drop the restrictive amount check that prevented debits (negative amounts)
ALTER TABLE public.wallet_top_ups DROP CONSTRAINT IF EXISTS wallet_top_ups_amount_check;

-- 2. Add a more appropriate check (amount should not be zero)
ALTER TABLE public.wallet_top_ups ADD CONSTRAINT wallet_top_ups_amount_nonzero_check CHECK (amount <> 0);

-- 3. Create Atomic RPC for Admin Balance Adjustments
-- This ensures that both the audit log (wallet_top_ups) and the profile balance
-- are updated in a single transaction.
-- It also enforces a balance floor (-2,000 PHP) to prevent excessive debt.

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
    -- 1. Lock the profile row and get current balance
    SELECT available_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    -- 2. Calculate New Balance
    v_new_balance := v_current_balance + p_amount;

    -- 3. Check Balance Floor for Debits
    -- Only check floor if we are deducting (p_amount < 0)
    IF p_amount < 0 AND v_new_balance < v_floor THEN
        RAISE EXCEPTION 'Adjustment would put account below the allowed floor of ₱%', v_floor;
    END IF;

    -- 4. Create Audit Log Record
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

    -- 5. Update Profile Balance
    UPDATE public.profiles
    SET available_balance = v_new_balance
    WHERE id = p_user_id;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
