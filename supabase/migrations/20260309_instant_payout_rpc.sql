-- Atomic RPC for processing instant payout for cancelled bookings
CREATE OR REPLACE FUNCTION public.process_instant_payout_atomic(target_booking_id uuid)
RETURNS boolean AS $$
DECLARE
    v_instructor_id uuid;
    v_studio_owner_id uuid;
    v_instructor_fee numeric;
    v_studio_fee numeric;
    v_status text;
    v_funds_unlocked boolean;
BEGIN
    -- 1. Lock the booking row and get details
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
    FOR UPDATE OF b;

    -- If booking not found, not cancelled_charged, or already unlocked, return false
    IF NOT FOUND OR v_status != 'cancelled_charged' OR v_funds_unlocked = true THEN
        RETURN false;
    END IF;

    -- 2. Mark funds as unlocked (since they are paid out instantly)
    -- We keep the status as 'cancelled_charged' because there was never a completed session
    UPDATE public.bookings 
    SET 
        funds_unlocked = true,
        completed_at = NOW() -- optional, but good for record-keeping
    WHERE id = target_booking_id;

    -- 3. Instandly add to available balances (skipping pending_balance)
    IF v_instructor_id IS NOT NULL AND v_instructor_fee > 0 THEN
        UPDATE public.profiles
        SET available_balance = available_balance + v_instructor_fee
        WHERE id = v_instructor_id;
    END IF;

    IF v_studio_owner_id IS NOT NULL AND v_studio_fee > 0 THEN
        UPDATE public.profiles
        SET available_balance = available_balance + v_studio_fee
        WHERE id = v_studio_owner_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
