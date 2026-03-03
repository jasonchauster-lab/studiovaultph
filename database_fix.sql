-- RUN THIS IN SUPABASE SQL EDITOR TO RESTORE WALLET INFRASTRUCTURE

-- 1. Add missing tracking fields to bookings table
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS funds_unlocked boolean NOT NULL DEFAULT false;

-- 2. Add index for fund unlocking automation
CREATE INDEX IF NOT EXISTS idx_bookings_unlocked_completed ON public.bookings(funds_unlocked, completed_at) 
WHERE status = 'completed';

-- 3. Create Atomic RPC for processing booking completion
DROP FUNCTION IF EXISTS public.process_booking_completion_atomic(uuid);
CREATE OR REPLACE FUNCTION public.process_booking_completion_atomic(target_booking_id uuid)
RETURNS boolean AS $$
DECLARE
    v_instructor_id uuid;
    v_studio_owner_id uuid;
    v_instructor_fee numeric;
    v_studio_fee numeric;
    v_status text;
BEGIN
    SELECT 
        b.instructor_id,
        b.status,
        (b.price_breakdown->>'instructor_fee')::numeric,
        (b.price_breakdown->>'studio_fee')::numeric,
        s.owner_id
    INTO 
        v_instructor_id,
        v_status,
        v_instructor_fee,
        v_studio_fee,
        v_studio_owner_id
    FROM public.bookings b
    LEFT JOIN (
        SELECT slots.id, studios.owner_id 
        FROM public.slots 
        JOIN public.studios ON slots.studio_id = studios.id
    ) s ON s.id = b.slot_id
    WHERE b.id = target_booking_id
    FOR UPDATE;

    IF NOT FOUND OR (v_status != 'approved' AND v_status != 'cancelled_charged') THEN
        RETURN false;
    END IF;

    UPDATE public.bookings 
    SET status = 'completed', completed_at = NOW()
    WHERE id = target_booking_id;

    IF v_instructor_id IS NOT NULL AND v_instructor_fee > 0 THEN
        UPDATE public.profiles SET pending_balance = pending_balance + v_instructor_fee WHERE id = v_instructor_id;
    END IF;

    IF v_studio_owner_id IS NOT NULL AND v_studio_fee > 0 THEN
        UPDATE public.profiles SET pending_balance = pending_balance + v_studio_fee WHERE id = v_studio_owner_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Atomic RPC for unlocking matured funds
DROP FUNCTION IF EXISTS public.unlock_booking_funds_atomic(uuid);
CREATE OR REPLACE FUNCTION public.unlock_booking_funds_atomic(target_booking_id uuid)
RETURNS boolean AS $$
DECLARE
    v_instructor_id uuid;
    v_studio_owner_id uuid;
    v_instructor_fee numeric;
    v_studio_fee numeric;
    v_funds_unlocked boolean;
    v_status text;
BEGIN
    SELECT 
        b.instructor_id,
        b.status,
        b.funds_unlocked,
        (b.price_breakdown->>'instructor_fee')::numeric,
        (b.price_breakdown->>'studio_fee')::numeric,
        s.owner_id
    INTO 
        v_instructor_id,
        v_status,
        v_funds_unlocked,
        v_instructor_fee,
        v_studio_fee,
        v_studio_owner_id
    FROM public.bookings b
    LEFT JOIN (
        SELECT slots.id, studios.owner_id 
        FROM public.slots 
        JOIN public.studios ON slots.studio_id = studios.id
    ) s ON s.id = b.slot_id
    WHERE b.id = target_booking_id
    FOR UPDATE;

    IF NOT FOUND OR v_status != 'completed' OR v_funds_unlocked = true THEN
        RETURN false;
    END IF;

    UPDATE public.bookings SET funds_unlocked = true WHERE id = target_booking_id;

    IF v_instructor_id IS NOT NULL AND v_instructor_fee > 0 THEN
        UPDATE public.profiles
        SET pending_balance = GREATEST(0, pending_balance - v_instructor_fee),
            available_balance = available_balance + v_instructor_fee,
            wallet_balance = wallet_balance + v_instructor_fee
        WHERE id = v_instructor_id;
    END IF;

    IF v_studio_owner_id IS NOT NULL AND v_studio_fee > 0 THEN
        UPDATE public.profiles
        SET pending_balance = GREATEST(0, pending_balance - v_studio_fee),
            available_balance = available_balance + v_studio_fee,
            wallet_balance = wallet_balance + v_studio_fee
        WHERE id = v_studio_owner_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update transfer_balance to update both columns
DROP FUNCTION IF EXISTS public.transfer_balance(uuid, uuid, numeric);
CREATE OR REPLACE FUNCTION public.transfer_balance(
    p_from_id UUID,
    p_to_id UUID,
    p_amount numeric
)
RETURNS VOID AS $$
BEGIN
    -- Deduct from sender (allow negative)
    UPDATE public.profiles
    SET available_balance = available_balance - p_amount,
        wallet_balance = wallet_balance - p_amount
    WHERE id = p_from_id;

    -- Credit to receiver
    UPDATE public.profiles
    SET available_balance = available_balance + p_amount,
        wallet_balance = wallet_balance + p_amount
    WHERE id = p_to_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create missing studio_strikes table
CREATE TABLE IF NOT EXISTS public.studio_strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.studio_strikes ENABLE ROW LEVEL SECURITY;

-- Policy for Select (Studio owners can view their own strikes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow studio owners to view their own strikes'
    ) THEN
        CREATE POLICY "Allow studio owners to view their own strikes"
            ON public.studio_strikes
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.studios
                    WHERE studios.id = studio_strikes.studio_id
                    AND studios.owner_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_studio_strikes_studio_id ON public.studio_strikes(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_strikes_created_at ON public.studio_strikes(created_at);

-- 7. Wallet Top-Up Approval & Rejection RPCs
DROP FUNCTION IF EXISTS public.approve_wallet_top_up(uuid);
CREATE OR REPLACE FUNCTION public.approve_wallet_top_up(p_top_up_id uuid)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_amount numeric;
    v_status text;
BEGIN
    SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
    FROM public.wallet_top_ups
    WHERE id = p_top_up_id
    FOR UPDATE;

    IF v_status != 'pending' THEN
        RAISE EXCEPTION 'Top-up request is already processed.';
    END IF;

    -- Update Top-Up Status
    UPDATE public.wallet_top_ups
    SET status = 'approved', processed_at = NOW(), updated_at = NOW()
    WHERE id = p_top_up_id;

    -- Credit User Balance
    UPDATE public.profiles
    SET available_balance = available_balance + v_amount,
        wallet_balance = wallet_balance + v_amount
    WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.reject_wallet_top_up(uuid, text);
CREATE OR REPLACE FUNCTION public.reject_wallet_top_up(p_top_up_id uuid, p_reason text)
RETURNS void AS $$
BEGIN
    UPDATE public.wallet_top_ups
    SET status = 'rejected', rejection_reason = p_reason, processed_at = NOW(), updated_at = NOW()
    WHERE id = p_top_up_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Admin Balance Adjustment RPC
DROP FUNCTION IF EXISTS public.execute_admin_balance_adjustment(uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.execute_admin_balance_adjustment(
    p_user_id uuid,
    p_amount numeric,
    p_reason text
)
RETURNS boolean AS $$
BEGIN
    -- Create record in wallet_top_ups as an audit trail
    INSERT INTO public.wallet_top_ups (
        user_id,
        amount,
        status,
        admin_notes,
        type,
        processed_at,
        payment_proof_url
    ) VALUES (
        p_user_id,
        p_amount,
        'approved',
        p_reason,
        'admin_adjustment',
        NOW(),
        'ADMIN_OVERRIDE'
    );

    -- Update Profile Balance
    UPDATE public.profiles
    SET available_balance = available_balance + p_amount,
        wallet_balance = wallet_balance + p_amount
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
