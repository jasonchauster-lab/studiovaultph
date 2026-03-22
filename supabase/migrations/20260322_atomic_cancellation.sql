-- migration: 20260322000001_cancel_booking_atomic.sql

CREATE OR REPLACE FUNCTION cancel_booking_atomic(
    p_booking_id UUID, 
    p_reason TEXT, 
    p_cancelled_by UUID
)
RETURNS JSONB AS $$
DECLARE
    booking_rec RECORD;
    breakdown JSONB;
    refund_amount NUMERIC;
    wallet_deduction NUMERIC;
    total_price NUMERIC;
    penalty_amount NUMERIC := 0;
    penalty_processed BOOLEAN := FALSE;
    strike_logged BOOLEAN := FALSE;
    is_suspended BOOLEAN := FALSE;
    all_slot_ids UUID[];
    now_ts TIMESTAMP WITH TIME ZONE := NOW();
    session_start_ts TIMESTAMP WITH TIME ZONE;
    diff_hours NUMERIC;
    is_late BOOLEAN;
    is_within_grace BOOLEAN;
    strike_count INT;
BEGIN
    -- 1. Fetch and lock booking
    SELECT b.*, s.date as slot_date, s.start_time as slot_start, st.id as studio_id, st.name as studio_name, st.owner_id as studio_owner_id
    INTO booking_rec
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    JOIN studios st ON s.studio_id = st.id
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    IF booking_rec.status IN ('cancelled_refunded', 'cancelled_charged', 'rejected') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking already cancelled or rejected');
    END IF;

    -- 2. Logic Check: Late Cancellation & Grace Period
    session_start_ts := (booking_rec.slot_date || ' ' || booking_rec.slot_start || '+08')::TIMESTAMP WITH TIME ZONE;
    diff_hours := EXTRACT(EPOCH FROM (session_start_ts - now_ts)) / 3600;
    is_late := diff_hours < 24;
    
    -- Grace period: 15 mins from approved_at
    is_within_grace := booking_rec.approved_at IS NULL OR (EXTRACT(EPOCH FROM (now_ts - booking_rec.approved_at)) <= 900);

    -- 3. Calculate Amounts
    breakdown := booking_rec.price_breakdown;
    wallet_deduction := COALESCE((breakdown->>'wallet_deduction')::NUMERIC, 0);
    total_price := COALESCE(booking_rec.total_price, 0);
    refund_amount := total_price + wallet_deduction;

    -- Penalty Logic (if late and NOT within grace)
    IF is_late AND NOT is_within_grace THEN
        penalty_amount := COALESCE((breakdown->>'studio_fee')::NUMERIC, 0);
    END IF;

    -- 4. Execute State Changes
    -- A. Update Booking
    UPDATE bookings 
    SET status = 'cancelled_refunded', 
        cancel_reason = p_reason, 
        cancelled_by = p_cancelled_by,
        updated_at = now_ts,
        price_breakdown = breakdown || jsonb_build_object(
            'refunded_amount', refund_amount,
            'penalty_amount', penalty_amount,
            'refund_initiator', CASE WHEN p_cancelled_by = booking_rec.studio_owner_id THEN 'studio' ELSE 'instructor' END
        )
    WHERE id = p_booking_id;

    -- B. Refund Client
    IF refund_amount > 0 THEN
        UPDATE profiles 
        SET available_balance = available_balance + refund_amount 
        WHERE id = booking_rec.client_id;
        
        -- Log refund
        INSERT INTO wallet_top_ups (user_id, amount, status, type, admin_notes)
        VALUES (booking_rec.client_id, refund_amount, 'approved', 'refund', 'Refund for cancelled booking ' || substr(p_booking_id::text, 1, 8));
    END IF;

    -- C. Transfer Penalty
    IF penalty_amount > 0 AND p_cancelled_by = booking_rec.studio_owner_id THEN
        -- Studio Owner -> Instructor
        UPDATE profiles SET available_balance = available_balance - penalty_amount WHERE id = booking_rec.studio_owner_id;
        IF booking_rec.instructor_id IS NOT NULL THEN
            UPDATE profiles SET available_balance = available_balance + penalty_amount WHERE id = booking_rec.instructor_id;
            penalty_processed := TRUE;
        END IF;
    ELSIF penalty_amount > 0 AND p_cancelled_by = booking_rec.instructor_id THEN
        -- Instructor -> Studio Owner
        UPDATE profiles SET available_balance = available_balance - penalty_amount WHERE id = booking_rec.instructor_id;
        UPDATE profiles SET available_balance = available_balance + penalty_amount WHERE id = booking_rec.studio_owner_id;
        penalty_processed := TRUE;
    END IF;

    -- D. Log Strike (Only if Studio cancelled late)
    IF is_late AND NOT is_within_grace AND p_cancelled_by = booking_rec.studio_owner_id THEN
        INSERT INTO studio_strikes (studio_id, booking_id, created_at)
        VALUES (booking_rec.studio_id, p_booking_id, now_ts);
        strike_logged := TRUE;

        -- Check for suspension
        SELECT COUNT(*) INTO strike_count 
        FROM studio_strikes 
        WHERE studio_id = booking_rec.studio_id AND created_at >= (now_ts - interval '30 days');

        IF strike_count >= 3 THEN
            UPDATE profiles SET is_suspended = TRUE WHERE id = booking_rec.studio_owner_id;
            is_suspended := TRUE;
        END IF;
    END IF;

    -- E. Release Slots
    all_slot_ids := ARRAY[booking_rec.slot_id] || COALESCE(booking_rec.booked_slot_ids, ARRAY[]::UUID[]);
    UPDATE slots SET is_available = TRUE WHERE id = ANY(all_slot_ids);

    -- 5. Finalize and Return
    UPDATE bookings 
    SET price_breakdown = price_breakdown || jsonb_build_object(
        'penalty_processed', penalty_processed,
        'strike_logged', strike_logged
    )
    WHERE id = p_booking_id;

    RETURN jsonb_build_object(
        'success', true, 
        'penalty_processed', penalty_processed, 
        'strike_logged', strike_logged, 
        'is_suspended', is_suspended,
        'studio_name', booking_rec.studio_name,
        'client_id', booking_rec.client_id,
        'instructor_id', booking_rec.instructor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
