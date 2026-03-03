-- CLEANUP & REPAIR: Wallet RPC Conflicts
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Remove all conflicting versions of execute_admin_balance_adjustment
DROP FUNCTION IF EXISTS public.execute_admin_balance_adjustment(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.execute_admin_balance_adjustment(numeric, text, uuid);

-- 2. Remove all conflicting versions of approve_wallet_top_up
DROP FUNCTION IF EXISTS public.approve_wallet_top_up(uuid);

-- 3. Define DEFINITIVE execute_admin_balance_adjustment
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
    -- 1. Lock Profile Row and Get Current Balance
    SELECT COALESCE(available_balance, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for ID %', p_user_id;
    END IF;

    -- 2. Calculate New Balance
    v_new_balance := v_current_balance + p_amount;

    -- 3. Floor check (Balance cannot drop below P2000)
    IF p_amount < 0 AND v_new_balance < v_floor THEN
        RAISE EXCEPTION 'Transaction failed: Balance cannot drop below ₱%. Current: ₱%', v_floor, v_current_balance;
    END IF;

    -- 4. Create Audit Log Entry
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

    -- 5. Update BOTH balance columns to keep them in sync
    UPDATE public.profiles
    SET available_balance = v_new_balance,
        wallet_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Define DEFINITIVE approve_wallet_top_up
CREATE OR REPLACE FUNCTION public.approve_wallet_top_up(
    p_top_up_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
    v_amount numeric;
    v_status text;
BEGIN
    -- 1. Lock and Get Top-up details
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

    -- 2. Update status to approved
    UPDATE public.wallet_top_ups
    SET status = 'approved',
        processed_at = NOW()
    WHERE id = p_top_up_id;

    -- 3. Update profile balances atomically
    UPDATE public.profiles
    SET available_balance = COALESCE(available_balance, 0) + v_amount,
        wallet_balance = COALESCE(wallet_balance, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
