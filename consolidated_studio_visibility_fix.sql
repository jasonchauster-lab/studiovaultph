-- consolidated_studio_visibility_fix.sql
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Add studio_id column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_studio_id ON public.bookings(studio_id);

-- 3. Backfill studio_id from slots (for existing bookings)
UPDATE public.bookings b
SET studio_id = s.studio_id
FROM public.slots s
WHERE b.slot_id = s.id
  AND b.studio_id IS NULL;

-- 4. Update RLS policies for bookings
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
CREATE POLICY "Users view own bookings" ON public.bookings 
FOR SELECT TO authenticated 
USING (
    auth.uid() = client_id 
    OR auth.uid() = instructor_id 
    OR EXISTS (
        SELECT 1 FROM public.studios 
        WHERE id = bookings.studio_id 
          AND owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Participants update relevant bookings" ON public.bookings;
CREATE POLICY "Participants update relevant bookings" ON public.bookings 
FOR UPDATE TO authenticated 
USING (
    auth.uid() = client_id 
    OR auth.uid() = instructor_id 
    OR EXISTS (
        SELECT 1 FROM public.slots 
        JOIN public.studios ON slots.studio_id = studios.id
        WHERE slots.id = slot_id AND studios.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.studios 
        WHERE id = bookings.studio_id 
          AND owner_id = auth.uid()
    )
);

-- 5. Update book_slot_atomic RPC to include studio_id
CREATE OR REPLACE FUNCTION book_slot_atomic(
    p_slot_id UUID, p_instructor_id UUID, p_client_id UUID, p_equipment_key TEXT,
    p_quantity INT, p_db_price NUMERIC, p_price_breakdown JSONB,
    p_wallet_deduction NUMERIC = 0, p_req_start_time TIME = NULL, p_req_end_time TIME = NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_parent_slot RECORD; v_parent_equipment JSONB; v_parent_quantity INT;
    v_extracted_slot_id UUID; v_final_slot_id UUID; v_booking_id UUID;
    v_available_qty INT; v_new_equipment JSONB; v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Parent slot not found'; END IF;
    IF NOT v_parent_slot.is_available THEN RAISE EXCEPTION 'Slot is no longer available'; END IF;

    IF EXISTS (
        SELECT 1 FROM bookings b JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id AND (b.status = 'approved' OR (b.status = 'pending' AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP)))
          AND s.date = v_parent_slot.date AND ((s.start_time, s.end_time) OVERLAPS (COALESCE(p_req_start_time, v_parent_slot.start_time), COALESCE(p_req_end_time, v_parent_slot.end_time)))
    ) THEN RAISE EXCEPTION 'Instructor is already booked'; END IF;

    v_parent_equipment := v_parent_slot.equipment; v_parent_quantity := COALESCE(v_parent_slot.quantity, 0);
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    IF v_available_qty < p_quantity THEN RAISE EXCEPTION 'Insufficient equipment inventory'; END IF;

    v_new_equipment := jsonb_set(v_parent_equipment, string_to_array(p_equipment_key, ','), to_jsonb(v_available_qty - p_quantity));
    v_parent_quantity := GREATEST(0, v_parent_quantity - p_quantity);

    IF v_parent_quantity <= 0 THEN DELETE FROM slots WHERE id = p_slot_id;
    ELSE UPDATE slots SET equipment = v_new_equipment, equipment_inventory = v_new_equipment, quantity = v_parent_quantity, is_available = true WHERE id = p_slot_id; END IF;

    INSERT INTO slots (studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity)
    VALUES (v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time, false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity)
    RETURNING id INTO v_extracted_slot_id;
    v_final_slot_id := v_extracted_slot_id;

    IF p_req_start_time IS NOT NULL AND p_req_end_time IS NOT NULL THEN
        IF p_req_start_time > v_parent_slot.start_time OR p_req_end_time < v_parent_slot.end_time THEN
            UPDATE slots SET start_time = p_req_start_time, end_time = p_req_end_time WHERE id = v_extracted_slot_id;
            IF v_parent_slot.start_time < p_req_start_time THEN
                INSERT INTO slots (studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity)
                VALUES (v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, p_req_start_time, true, v_new_equipment, v_new_equipment, v_parent_quantity);
            END IF;
            IF p_req_end_time < v_parent_slot.end_time THEN
                INSERT INTO slots (studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity)
                VALUES (v_parent_slot.studio_id, v_parent_slot.date, p_req_end_time, v_parent_slot.end_time, true, v_new_equipment, v_new_equipment, v_parent_quantity);
            END IF;
        END IF;
    END IF;

    IF p_wallet_deduction > 0 THEN PERFORM deduct_available_balance(p_client_id, p_wallet_deduction); END IF;

    v_expires_at := CURRENT_TIMESTAMP + interval '15 minutes';
    INSERT INTO bookings (slot_id, instructor_id, client_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, studio_id, expires_at)
    VALUES (v_final_slot_id, p_instructor_id, p_client_id, 'pending', p_equipment_key, p_db_price, p_price_breakdown, p_quantity, ARRAY[v_final_slot_id], v_parent_slot.studio_id, v_expires_at)
    RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id, 'final_slot_id', v_final_slot_id, 'parent_slot_id', p_slot_id);
END;
$$;

NOTIFY pgrst, 'reload schema';
