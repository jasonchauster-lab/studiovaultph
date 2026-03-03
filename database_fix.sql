-- RUN THIS IN SUPABASE SQL EDITOR TO RESTORE WALLET INFRASTRUCTURE

-- 1. Add missing tracking fields to bookings table
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS funds_unlocked boolean NOT NULL DEFAULT false;

-- 2. Add index for fund unlocking automation
CREATE INDEX IF NOT EXISTS idx_bookings_unlocked_completed ON public.bookings(funds_unlocked, completed_at) 
WHERE status = 'completed';

-- 3. Create Atomic RPC for processing booking completion
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
