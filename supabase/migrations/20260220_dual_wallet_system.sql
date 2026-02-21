-- Add dual wallet fields to profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS pending_balance numeric(10,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS available_balance numeric(10,2) NOT NULL DEFAULT 0.00;

-- Sync existing balance to available_balance
UPDATE public.profiles
SET available_balance = wallet_balance;

-- Add tracking fields to bookings for funds hold
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS funds_unlocked boolean NOT NULL DEFAULT false;

-- Index for cron/unlock funds search
CREATE INDEX IF NOT EXISTS idx_bookings_unlocked_completed ON public.bookings(funds_unlocked, completed_at) 
WHERE status = 'completed';

-- RPC for atomic pending balance increment
CREATE OR REPLACE FUNCTION public.increment_pending_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET pending_balance = pending_balance + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for atomic funds unlock (pending -> available)
CREATE OR REPLACE FUNCTION public.unlock_funds(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET 
        pending_balance = GREATEST(0, pending_balance - amount),
        available_balance = available_balance + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for atomic available balance deduction
CREATE OR REPLACE FUNCTION public.deduct_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = GREATEST(0, available_balance - amount)
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for atomic available balance increment
CREATE OR REPLACE FUNCTION public.increment_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = available_balance + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
