-- SQL Migration: Explicit Negative Balance Support
-- Date: 2026-03-01

-- 1. Drop existing CHECK constraints that might prevent negative balances
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_wallet_balance_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_available_balance_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pending_balance_check;

-- 2. Update RPCs to remove GREATEST(0, ...) logic

-- Update unlock_funds (pending -> available)
CREATE OR REPLACE FUNCTION public.unlock_funds(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET 
        pending_balance = pending_balance - amount, -- Allow negative if necessary
        available_balance = available_balance + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update deduct_available_balance
CREATE OR REPLACE FUNCTION public.deduct_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = available_balance - amount -- Allow negative results
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: transfer_balance from phase7_refinements.sql already supports negative results.
-- increment_available_balance and increment_pending_balance also support them implicitly by addition.
