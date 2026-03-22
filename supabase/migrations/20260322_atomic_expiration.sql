-- migration: 20260322000000_expire_booking_atomic.sql

CREATE OR REPLACE FUNCTION expire_single_booking_atomic(target_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    booking_rec RECORD;
    breakdown JSONB;
    wallet_deduction NUMERIC;
    all_slot_ids UUID[];
BEGIN
    -- 1. Fetch booking and lock it for update
    SELECT * INTO booking_rec 
    FROM bookings 
    WHERE id = target_booking_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 2. Mark as expired
    UPDATE bookings SET status = 'expired', updated_at = NOW() WHERE id = target_booking_id;

    -- 3. Release slots
    all_slot_ids := ARRAY[booking_rec.slot_id] || COALESCE(booking_rec.booked_slot_ids, ARRAY[]::UUID[]);
    UPDATE slots SET is_available = TRUE WHERE id = ANY(all_slot_ids);

    -- 4. Refund wallet if needed
    breakdown := booking_rec.price_breakdown;
    wallet_deduction := COALESCE((breakdown->>'wallet_deduction')::NUMERIC, 0);

    IF wallet_deduction > 0 AND booking_rec.client_id IS NOT NULL THEN
        -- Increment balance
        UPDATE profiles 
        SET available_balance = available_balance + wallet_deduction 
        WHERE id = booking_rec.client_id;

        -- Log transaction
        INSERT INTO wallet_top_ups (user_id, amount, status, type, admin_notes)
        VALUES (
            booking_rec.client_id, 
            wallet_deduction, 
            'approved', 
            'refund', 
            'Refund for expired booking ' || substr(target_booking_id::text, 1, 8)
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
