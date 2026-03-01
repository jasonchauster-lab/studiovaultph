-- SQL Migration: Sync Dual Balances (Available vs Wallet)
-- Date: 2026-03-02

-- 1. One-time sync to ensure consistency
UPDATE public.profiles 
SET wallet_balance = available_balance 
WHERE wallet_balance IS DISTINCT FROM available_balance;

-- 2. Update execute_admin_balance_adjustment to update both columns
CREATE OR REPLACE FUNCTION public.execute_admin_balance_adjustment(
    p_amount numeric,
    p_reason text,
    p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
BEGIN
    -- 1. Get current balance and lock row
    SELECT available_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    v_new_balance := COALESCE(v_current_balance, 0) + p_amount;

    -- 2. Check floor (-2000)
    IF v_new_balance < -2000 THEN
        RAISE EXCEPTION 'Transaction failed: Balance cannot drop below -₱2,000. Current available: ₱%', v_current_balance;
    END IF;

    -- 3. Log the adjustment
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

    -- 4. Update BOTH balance columns for system-wide consistency
    UPDATE public.profiles
    SET available_balance = v_new_balance,
        wallet_balance = v_new_balance
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update approve_wallet_top_up to update both columns
CREATE OR REPLACE FUNCTION public.approve_wallet_top_up(
    p_top_up_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
    v_amount numeric;
    v_status text;
BEGIN
    -- 1. Lock and get top-up details
    SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
    FROM public.wallet_top_ups
    WHERE id = p_top_up_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Top-up request not found';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Top-up request is already %', v_status;
    END IF;

    -- 2. Update Status
    UPDATE public.wallet_top_ups
    SET status = 'approved',
        processed_at = NOW()
    WHERE id = p_top_up_id;

    -- 3. Increment BOTH balances
    UPDATE public.profiles
    SET available_balance = COALESCE(available_balance, 0) + v_amount,
        wallet_balance = COALESCE(wallet_balance, 0) + v_amount
    WHERE id = v_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update increment_available_balance to update both columns
CREATE OR REPLACE FUNCTION public.increment_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = available_balance + amount,
        wallet_balance = wallet_balance + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update deduct_available_balance to update both columns
CREATE OR REPLACE FUNCTION public.deduct_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = available_balance - amount,
        wallet_balance = wallet_balance - amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
