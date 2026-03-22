-- Phase 12: Admin Action Atomicity
-- This migration adds atomic RPCs for Admin actions like Rejecting Payouts and Bookings.

-- 1. Atomic Payout Rejection
CREATE OR REPLACE FUNCTION reject_payout_atomic(
    p_payout_id UUID,
    p_admin_id UUID,
    p_rejection_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payout RECORD;
    v_payee_id UUID;
BEGIN
    -- 1. Lock and Verify Payout
    SELECT * INTO v_payout 
    FROM payout_requests 
    WHERE id = p_payout_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payout request not found';
    END IF;

    IF v_payout.status != 'pending' THEN
        RAISE EXCEPTION 'Payout must be in pending status (Current: %)', v_payout.status;
    END IF;

    -- 2. Update Status
    UPDATE payout_requests 
    SET status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_payout_id;

    -- 3. Refund User Balance
    v_payee_id := COALESCE(v_payout.user_id, v_payout.instructor_id);
    IF v_payee_id IS NOT NULL AND v_payout.amount > 0 THEN
        PERFORM increment_available_balance(v_payee_id, v_payout.amount);
    END IF;

    -- 4. Log Activity
    INSERT INTO admin_activity_logs (
        admin_id,
        action_type,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_admin_id,
        'REJECT_PAYOUT',
        'payout_requests',
        p_payout_id,
        COALESCE(p_rejection_notes, 'Payout of ' || v_payout.amount || ' rejected')
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Atomic Booking Rejection
CREATE OR REPLACE FUNCTION reject_booking_atomic(
    p_booking_id UUID,
    p_admin_id UUID,
    p_reason TEXT,
    p_with_refund BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_refund_amount NUMERIC := 0;
    v_all_slot_ids UUID[];
BEGIN
    -- 1. Lock and Verify Booking
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = p_booking_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.status NOT IN ('pending', 'approved') THEN
        RAISE EXCEPTION 'Booking not eligible for rejection (Status: %)', v_booking.status;
    END IF;

    -- 2. Update Booking Status
    UPDATE bookings 
    SET status = 'rejected',
        rejection_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_booking_id;

    -- 3. Release Slots
    v_all_slot_ids := ARRAY[v_booking.slot_id] || COALESCE(v_booking.booked_slot_ids, '{}'::UUID[]);
    IF array_length(v_all_slot_ids, 1) > 0 THEN
        UPDATE slots 
        SET is_available = true 
        WHERE id = ANY(v_all_slot_ids);
    END IF;

    -- 4. Process Refund
    IF p_with_refund AND v_booking.client_id IS NOT NULL THEN
        v_refund_amount := COALESCE(v_booking.total_price, 0) + COALESCE((v_booking.price_breakdown->>'wallet_deduction')::NUMERIC, 0);
        
        IF v_refund_amount > 0 THEN
            PERFORM increment_available_balance(v_booking.client_id, v_refund_amount);
            
            -- Insert Ledger Entry
            INSERT INTO wallet_top_ups (
                user_id,
                amount,
                status,
                type,
                admin_notes
            ) VALUES (
                v_booking.client_id,
                v_refund_amount,
                'approved',
                'refund',
                'Refund for rejected booking (ID: ' || p_booking_id || ')'
            );
        END IF;
    END IF;

    -- 5. Remove Auto-Created Instructor Availability (for Student/Studio rental rejections)
    IF v_booking.client_id = v_booking.instructor_id THEN
        DELETE FROM instructor_availability 
        WHERE instructor_id = v_booking.instructor_id 
          AND date = (SELECT date FROM slots WHERE id = v_booking.slot_id)
          AND start_time = (SELECT start_time FROM slots WHERE id = v_booking.slot_id);
    END IF;

    -- 6. Log Activity
    INSERT INTO admin_activity_logs (
        admin_id,
        action_type,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_admin_id,
        'REJECT_BOOKING',
        'bookings',
        p_booking_id,
        'Booking rejected by admin (' || p_reason || '). Refund: ' || (CASE WHEN p_with_refund THEN 'Yes' ELSE 'No' END)
    );

    RETURN jsonb_build_object(
        'success', true,
        'refund_amount', v_refund_amount
    );
END;
$$;
