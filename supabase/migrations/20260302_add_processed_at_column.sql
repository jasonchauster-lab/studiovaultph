-- SQL Migration: Add processed_at and Atomic Top-up Functions
-- Date: 2026-03-02

-- 1. Add missing column
ALTER TABLE public.wallet_top_ups ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- 2. Atomic Approval Function
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

    -- 3. Increment Profile Balance (Re-using existing logic or standardizing)
    UPDATE public.profiles
    SET available_balance = COALESCE(available_balance, 0) + v_amount
    WHERE id = v_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Rejection Function
CREATE OR REPLACE FUNCTION public.reject_wallet_top_up(
    p_top_up_id uuid,
    p_reason text
)
RETURNS boolean AS $$
DECLARE
    v_status text;
BEGIN
    -- 1. Lock check
    SELECT status INTO v_status
    FROM public.wallet_top_ups
    WHERE id = p_top_up_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Top-up request not found';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Top-up request is already %', v_status;
    END IF;

    -- 2. Update Status and Reason
    UPDATE public.wallet_top_ups
    SET status = 'rejected',
        rejection_reason = p_reason,
        processed_at = NOW()
    WHERE id = p_top_up_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
