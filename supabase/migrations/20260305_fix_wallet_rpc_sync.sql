-- Migration: Fix Wallet RPC Synchronicity and Strict Balance Checks
-- Date: 2026-03-05

-- 1. Fix deduct_available_balance to be strict and prevent negative balances
CREATE OR REPLACE FUNCTION public.deduct_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    -- Check if balance is sufficient before deducting
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND (available_balance - amount < 0)
    ) THEN
        RAISE EXCEPTION 'Insufficient balance: Cannot deduct % from available balance', amount;
    END IF;

    UPDATE public.profiles
    SET available_balance = available_balance - amount,
        wallet_balance = wallet_balance - amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix unlock_booking_funds_atomic to sync both balance columns
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
    -- Lock the booking
    SELECT 
        b.instructor_id,
        b.status,
        b.funds_unlocked,
        (b.price_breakdown->>'instructor_fee')::numeric AS instructor_fee,
        (b.price_breakdown->>'studio_fee')::numeric AS studio_fee,
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

    -- Return false if not eligible
    IF NOT FOUND OR v_status != 'completed' OR v_funds_unlocked = true THEN
        RETURN false;
    END IF;

    -- Unlock
    UPDATE public.bookings
    SET funds_unlocked = true
    WHERE id = target_booking_id;

    -- Update balances - NOW SYNCED FOR BOTH COLUMNS
    IF v_instructor_id IS NOT NULL AND v_instructor_fee > 0 THEN
        UPDATE public.profiles
        SET 
            pending_balance = GREATEST(0, pending_balance - v_instructor_fee),
            available_balance = available_balance + v_instructor_fee,
            wallet_balance = wallet_balance + v_instructor_fee
        WHERE id = v_instructor_id;
    END IF;

    IF v_studio_owner_id IS NOT NULL AND v_studio_fee > 0 THEN
        UPDATE public.profiles
        SET 
            pending_balance = GREATEST(0, pending_balance - v_studio_fee),
            available_balance = available_balance + v_studio_fee,
            wallet_balance = wallet_balance + v_studio_fee
        WHERE id = v_studio_owner_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
