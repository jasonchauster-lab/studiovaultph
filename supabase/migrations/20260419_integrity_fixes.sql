-- Migration: 20260419_integrity_fixes.sql
-- Goal: Fix wallet overspending, implement slot re-merging, and handle Xendit expiry properly.

-- 1. Add parent_slot_id to slots table for re-merging
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS parent_slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL;

-- 2. Update book_slot_atomic to populate parent_slot_id
CREATE OR REPLACE FUNCTION public.book_slot_atomic(
    p_slot_id UUID,
    p_instructor_id UUID,
    p_client_id UUID,
    p_equipment_key TEXT,
    p_quantity INT,
    p_db_price NUMERIC,
    p_price_breakdown JSONB,
    p_wallet_deduction NUMERIC = 0,
    p_req_start_time TIME = NULL,
    p_req_end_time TIME = NULL,
    p_use_studio_wallet BOOLEAN = FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_slot RECORD;
    v_parent_equipment JSONB;
    v_parent_quantity INT;
    v_extracted_slot_id UUID;
    v_final_slot_id UUID;
    v_booking_id UUID;
    v_available_qty INT;
    v_new_equipment JSONB;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Lock the parent slot
    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
    IF NOT v_parent_slot.is_available THEN RAISE EXCEPTION 'Slot no longer available'; END IF;

    -- 2. Instructor Double-Booking Check
    IF EXISTS (
        SELECT 1 FROM bookings b JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id
          AND b.status IN ('approved', 'pending')
          AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP)
          AND s.date = v_parent_slot.date
          AND ((s.start_time, s.end_time) OVERLAPS (COALESCE(p_req_start_time, v_parent_slot.start_time), COALESCE(p_req_end_time, v_parent_slot.end_time)))
    ) THEN
        RAISE EXCEPTION 'Instructor already booked';
    END IF;

    -- 3. Inventory Deduction
    v_parent_equipment := v_parent_slot.equipment;
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    IF v_available_qty < p_quantity THEN RAISE EXCEPTION 'Insufficient inventory'; END IF;

    v_new_equipment := jsonb_set(v_parent_equipment, string_to_array(p_equipment_key, ','), to_jsonb(v_available_qty - p_quantity));
    v_parent_quantity := GREATEST(0, COALESCE(v_parent_slot.quantity, 0) - p_quantity);

    -- UPDATE PARENT (Don't delete, just mark unavailable if qty=0)
    UPDATE slots 
    SET equipment = v_new_equipment,
        equipment_inventory = v_new_equipment,
        quantity = v_parent_quantity,
        is_available = (v_parent_quantity > 0)
    WHERE id = p_slot_id;

    -- 4. Create Extracted Slot
    INSERT INTO slots (
        studio_id, outlet_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity, parent_slot_id, session_type, instructor_id
    ) VALUES (
        v_parent_slot.studio_id, v_parent_slot.outlet_id, v_parent_slot.date, 
        COALESCE(p_req_start_time, v_parent_slot.start_time), COALESCE(p_req_end_time, v_parent_slot.end_time),
        false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity,
        p_slot_id, v_parent_slot.session_type, p_instructor_id
    ) RETURNING id INTO v_extracted_slot_id;

    v_final_slot_id := v_extracted_slot_id;

    -- 5. Wallet Deduction (STRICT)
    IF p_wallet_deduction > 0 THEN
        IF p_use_studio_wallet THEN
            PERFORM public.deduct_studio_available_balance(p_client_id, v_parent_slot.studio_id, p_wallet_deduction);
        ELSE
            PERFORM public.deduct_available_balance(p_client_id, p_wallet_deduction);
        END IF;
    END IF;

    -- 6. Insert Booking
    v_expires_at := CURRENT_TIMESTAMP + interval '1 hour';
    INSERT INTO bookings (
        slot_id, instructor_id, client_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, studio_id, outlet_id, expires_at
    ) VALUES (
        v_final_slot_id, p_instructor_id, p_client_id, 'pending', p_equipment_key, p_db_price, p_price_breakdown, p_quantity, ARRAY[v_final_slot_id], v_parent_slot.studio_id, v_parent_slot.outlet_id, v_expires_at
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;


-- 3. Strict Wallet Deduction (Studio)
CREATE OR REPLACE FUNCTION public.deduct_studio_available_balance(p_user_id uuid, p_studio_id uuid, p_amount numeric)
RETURNS void AS $$
DECLARE
    v_balance numeric;
BEGIN
    SELECT available_balance INTO v_balance FROM public.customer_memberships WHERE user_id = p_user_id AND studio_id = p_studio_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient studio balance (Available: %, Required: %)', COALESCE(v_balance, 0), p_amount;
    END IF;

    UPDATE public.customer_memberships
    SET available_balance = available_balance - p_amount, updated_at = now()
    WHERE user_id = p_user_id AND studio_id = p_studio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. New RPC to Release Booking and Re-merge Slot
CREATE OR REPLACE FUNCTION public.release_booking_atomic(p_booking_id UUID, p_new_status TEXT DEFAULT 'expired')
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_slot RECORD;
    v_parent_slot RECORD;
    v_equipment_key TEXT;
    v_quantity INT;
BEGIN
    -- Lock booking
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;

    -- Only allow release if not already processed
    IF v_booking.status IN ('approved', 'completed', 'cancelled_charged', 'cancelled_refunded') AND p_new_status = 'expired' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot expire a finalized booking');
    END IF;

    -- Lock slot
    SELECT * INTO v_slot FROM slots WHERE id = v_booking.slot_id FOR UPDATE;
    
    -- If slot has parent, re-merge
    IF v_slot.parent_slot_id IS NOT NULL THEN
        SELECT * INTO v_parent_slot FROM slots WHERE id = v_slot.parent_slot_id FOR UPDATE;
        
        IF FOUND THEN
            v_equipment_key := v_booking.equipment;
            v_quantity := v_booking.quantity;
            
            UPDATE slots 
            SET quantity = quantity + v_quantity,
                equipment = jsonb_set(equipment, ARRAY[v_equipment_key], to_jsonb(COALESCE((equipment->>v_equipment_key)::INT, 0) + v_quantity)),
                equipment_inventory = jsonb_set(equipment_inventory, ARRAY[v_equipment_key], to_jsonb(COALESCE((equipment_inventory->>v_equipment_key)::INT, 0) + v_quantity)),
                is_available = true
            WHERE id = v_slot.parent_slot_id;
            
            -- Delete the extracted slot to clean up
            DELETE FROM slots WHERE id = v_booking.slot_id;
        ELSE
            -- Parent gone? Just mark this one available (fallback)
            UPDATE slots SET is_available = true WHERE id = v_booking.slot_id;
        END IF;
    ELSE
        -- No parent? Just mark available
        UPDATE slots SET is_available = true WHERE id = v_booking.slot_id;
    END IF;

    -- Update booking status
    UPDATE bookings SET status = p_new_status, updated_at = NOW() WHERE id = p_booking_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
