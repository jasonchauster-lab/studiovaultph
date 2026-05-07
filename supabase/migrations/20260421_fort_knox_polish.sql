-- Phase 7: Fort Knox Final Polish
-- 1. Track which plan was used for a booking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.customer_plans(id) ON DELETE SET NULL;

-- 2. Index for credit restoration performance
CREATE INDEX IF NOT EXISTS idx_bookings_plan_id ON public.bookings(plan_id) WHERE plan_id IS NOT NULL;

-- 3. Upgrade cancel_booking_atomic to v2 (or replace) with Credit Restoration
CREATE OR REPLACE FUNCTION cancel_booking_atomic_v2(
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
    v_plan_id UUID;
    v_quantity INT;
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

    -- 2. Context
    session_start_ts := (booking_rec.slot_date || ' ' || booking_rec.slot_start || '+08')::TIMESTAMP WITH TIME ZONE;
    diff_hours := EXTRACT(EPOCH FROM (session_start_ts - now_ts)) / 3600;
    is_late := diff_hours < 24;
    is_within_grace := booking_rec.approved_at IS NULL OR (EXTRACT(EPOCH FROM (now_ts - booking_rec.approved_at)) <= 900);
    v_equipment_key := booking_rec.equipment;
    v_plan_id := booking_rec.plan_id;
    v_quantity := booking_rec.quantity;

    -- 3. Calculate Amounts (Cash)
    breakdown := booking_rec.price_breakdown;
    wallet_deduction := COALESCE((breakdown->>'wallet_deduction')::NUMERIC, 0);
    total_price := COALESCE(booking_rec.total_price, 0);
    refund_amount := total_price + wallet_deduction;

    -- Penalty Logic (if late and NOT within grace)
    IF is_late AND NOT is_within_grace THEN
        penalty_amount := COALESCE((breakdown->>'studio_fee')::NUMERIC, 0);
    END IF;

    -- 4. Execute State Changes
    -- A. Update Booking Status
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

    -- B. Refund Client (Cash/Wallet)
    IF refund_amount > 0 THEN
        UPDATE profiles 
        SET available_balance = available_balance + refund_amount 
        WHERE id = booking_rec.client_id;
        
        INSERT INTO wallet_top_ups (user_id, amount, status, type, admin_notes, studio_id)
        VALUES (booking_rec.client_id, refund_amount, 'approved', 'refund', 'Refund for ' || booking_rec.status || ' booking ' || substr(p_booking_id::text, 1, 8), booking_rec.studio_id);
    END IF;

    -- C. RESTORE CREDITS (New Fort Knox Feature)
    IF booking_rec.payment_method = 'credit' AND v_plan_id IS NOT NULL THEN
        UPDATE public.customer_plans
        SET remaining_credits = remaining_credits + v_quantity,
            updated_at = now_ts
        WHERE id = v_plan_id;
    END IF;

    -- D. Transfer Penalty (Studio <=> Instructor)
    IF penalty_amount > 0 AND p_cancelled_by = booking_rec.studio_owner_id THEN
        UPDATE profiles SET available_balance = available_balance - penalty_amount WHERE id = booking_rec.studio_owner_id;
        IF booking_rec.instructor_id IS NOT NULL THEN
            UPDATE profiles SET available_balance = available_balance + penalty_amount WHERE id = booking_rec.instructor_id;
            penalty_processed := TRUE;
        END IF;
    ELSIF penalty_amount > 0 AND p_cancelled_by = booking_rec.instructor_id THEN
        UPDATE profiles SET available_balance = available_balance - penalty_amount WHERE id = booking_rec.instructor_id;
        UPDATE profiles SET available_balance = available_balance + penalty_amount WHERE id = booking_rec.studio_owner_id;
        penalty_processed := TRUE;
    END IF;

    -- E. Log Strike
    IF is_late AND NOT is_within_grace AND p_cancelled_by = booking_rec.studio_owner_id THEN
        INSERT INTO studio_strikes (studio_id, booking_id, created_at)
        VALUES (booking_rec.studio_id, p_booking_id, now_ts);
        strike_logged := TRUE;

        SELECT COUNT(*) INTO strike_count FROM studio_strikes 
        WHERE studio_id = booking_rec.studio_id AND created_at >= (now_ts - interval '30 days');

        IF strike_count >= 3 THEN
            UPDATE profiles SET is_suspended = TRUE WHERE id = booking_rec.studio_owner_id;
            is_suspended := TRUE;
        END IF;
    END IF;

    -- F. Release Slots & Waitlist
    all_slot_ids := ARRAY[booking_rec.slot_id] || COALESCE(booking_rec.booked_slot_ids, ARRAY[]::UUID[]);
    UPDATE slots SET is_available = TRUE WHERE id = ANY(all_slot_ids);
    PERFORM notify_waitlist_on_release(booking_rec.slot_id, v_equipment_key);

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

-- 4. Fix existing book_slot_with_package_credit to store plan_id
CREATE OR REPLACE FUNCTION public.book_slot_with_package_credit(
    p_slot_id UUID,
    p_instructor_id UUID,
    p_client_id UUID,
    p_plan_id UUID,
    p_equipment_key TEXT,
    p_quantity INT,
    p_price_breakdown JSONB,
    p_req_start_time TIME = NULL,
    p_req_end_time TIME = NULL,
    p_origin TEXT DEFAULT 'studio'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credit_result JSONB;
    v_parent_slot RECORD;
    v_extracted_slot_id UUID;
    v_booking_id UUID;
    v_available_qty INT;
    v_parent_equipment JSONB;
    v_parent_quantity INT;
    v_new_equipment JSONB;
BEGIN
    v_credit_result := public.consume_package_credit(p_plan_id, p_quantity);
    IF NOT (v_credit_result->>'success')::BOOLEAN THEN
        RAISE EXCEPTION '%', v_credit_result->>'error';
    END IF;

    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
    IF NOT v_parent_slot.is_available THEN RAISE EXCEPTION 'Slot no longer available'; END IF;

    v_parent_equipment := v_parent_slot.equipment;
    v_parent_quantity := COALESCE(v_parent_slot.quantity, 0);
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    
    IF v_available_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient equipment inventory';
    END IF;

    v_new_equipment := jsonb_set(v_parent_equipment, string_to_array(p_equipment_key, ','), to_jsonb(v_available_qty - p_quantity));
    v_parent_quantity := GREATEST(0, v_parent_quantity - p_quantity);

    IF v_parent_quantity <= 0 THEN
        DELETE FROM slots WHERE id = p_slot_id;
    ELSE
        UPDATE slots SET equipment = v_new_equipment, equipment_inventory = v_new_equipment, quantity = v_parent_quantity WHERE id = p_slot_id;
    END IF;

    INSERT INTO slots (studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity)
    VALUES (v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time, false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity)
    RETURNING id INTO v_extracted_slot_id;

    INSERT INTO bookings (
        slot_id, instructor_id, client_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, studio_id, payment_method, plan_id, origin
    ) VALUES (
        v_extracted_slot_id, p_instructor_id, p_client_id, 'approved', p_equipment_key, 0, p_price_breakdown, p_quantity, ARRAY[v_extracted_slot_id], v_parent_slot.studio_id, 'credit', p_plan_id, p_origin
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;
