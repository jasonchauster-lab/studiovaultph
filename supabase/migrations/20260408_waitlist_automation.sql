-- Migration: Waitlist Automation & Cancellation Integration
-- Date: 2026-04-08

-- 1. Create function to process waitlist notifications on cancellation
CREATE OR REPLACE FUNCTION notify_waitlist_on_release(p_slot_id UUID, p_equipment_key TEXT)
RETURNS VOID AS $$
DECLARE
    v_waitlist_entry RECORD;
    v_session_start TIMESTAMPTZ;
    v_is_last_minute BOOLEAN;
BEGIN
    -- Get session start time
    SELECT (s.date || ' ' || s.start_time || '+08')::TIMESTAMPTZ INTO v_session_start
    FROM slots s WHERE id = p_slot_id;

    -- Last minute rule: < 2 hours
    v_is_last_minute := v_session_start < (now() + interval '2 hours');

    IF v_is_last_minute THEN
        -- Notify EVERYONE on the waitlist for this equipment
        UPDATE waitlist 
        SET status = 'notified', 
            notified_at = now(),
            expires_at = null -- No individual expiry for last minute, first one to book wins
        WHERE slot_id = p_slot_id 
          AND equipment_key = p_equipment_key 
          AND status = 'waiting';
    ELSE
        -- Notify the FIRST person on the list
        FOR v_waitlist_entry IN 
            SELECT id FROM waitlist 
            WHERE slot_id = p_slot_id 
              AND equipment_key = p_equipment_key 
              AND status = 'waiting'
            ORDER BY created_at ASC
            LIMIT 1
        LOOP
            UPDATE waitlist 
            SET status = 'notified', 
                notified_at = now(),
                expires_at = now() + interval '15 minutes'
            WHERE id = v_waitlist_entry.id;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update cancel_booking_atomic to trigger waitlist notification
-- We'll just append the logic to the end of the existing function or replace it.
-- Replacing the existing function with waitlist integration:
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
    v_equipment_key TEXT;
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
    v_equipment_key := booking_rec.equipment;

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

    -- E. Release Slots & Trigger Waitlist
    all_slot_ids := ARRAY[booking_rec.slot_id] || COALESCE(booking_rec.booked_slot_ids, ARRAY[]::UUID[]);
    UPDATE slots SET is_available = TRUE WHERE id = ANY(all_slot_ids);

    -- Trigger waitlist notification
    PERFORM notify_waitlist_on_release(booking_rec.slot_id, v_equipment_key);

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

-- 3. Create cron function for waitlist expirations
CREATE OR REPLACE FUNCTION cron_process_waitlist_expirations()
RETURNS VOID AS $$
DECLARE
    v_expired RECORD;
BEGIN
    FOR v_expired IN 
        SELECT id, slot_id, equipment_key FROM waitlist 
        WHERE status = 'notified' 
          AND expires_at IS NOT NULL 
          AND expires_at <= now()
    LOOP
        -- A. Expire entry
        UPDATE waitlist SET status = 'expired' WHERE id = v_expired.id;

        -- B. Notify NEXT person
        PERFORM notify_waitlist_on_release(v_expired.slot_id, v_expired.equipment_key);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Schedule the cron job
SELECT cron.schedule('waitlist-expirations', '*/2 * * * *', 'SELECT public.cron_process_waitlist_expirations()');
