-- Migration: Equipment-Aware Capacity & Availability Trigger
-- Date: 2026-03-01

-- 1. Add equipment_inventory column to slots
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS equipment_inventory JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate existing 'equipment' array data to 'equipment_inventory'
-- For each slot with a text array of equipment, we default each to quantity 1.
DO $$
BEGIN
    -- Only update slots that have equipment but empty inventory
    UPDATE public.slots
    SET equipment_inventory = (
        SELECT jsonb_object_agg(elem, 1)
        FROM unnest(equipment) AS elem
    )
    WHERE (equipment_inventory IS NULL OR equipment_inventory = '{}'::jsonb)
    AND equipment IS NOT NULL 
    AND array_length(equipment, 1) > 0;
END $$;

-- 3. Create Trigger Function for Slot Availability Sync
CREATE OR REPLACE FUNCTION public.sync_slot_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_slot_id UUID;
    v_inventory JSONB;
    v_eq_type TEXT;
    v_capacity INT;
    v_booked_count INT;
    v_is_any_free BOOLEAN := FALSE;
BEGIN
    -- Determine which slot(s) need syncing
    -- This handles INSERT/UPDATE/DELETE on bookings
    IF (TG_OP = 'DELETE') THEN
        v_slot_id := OLD.slot_id;
    ELSE
        v_slot_id := NEW.slot_id;
    END IF;

    -- Also handle booked_slot_ids (if applicable, though we usually sync by primary slot_id)
    -- For simplicity, we primary sync the slot_id. 
    -- If a booking spans multiple slots, the trigger will fire for the primary one.
    -- (Improvements can be made to loop through booked_slot_ids if needed)

    -- Fetch slot inventory
    SELECT equipment_inventory INTO v_inventory
    FROM public.slots
    WHERE id = v_slot_id;

    IF v_inventory IS NULL OR v_inventory = '{}'::jsonb THEN
        -- Fallback: If no inventory, base it on existence of ANY active booking
        UPDATE public.slots
        SET is_available = NOT EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE (b.slot_id = v_slot_id OR v_slot_id = ANY(b.booked_slot_ids))
            AND b.status IN ('pending', 'approved', 'completed')
        )
        WHERE id = v_slot_id;
        RETURN NULL;
    END IF;

    -- Iterate through equipment types in inventory
    FOR v_eq_type, v_capacity IN SELECT * FROM jsonb_each_text(v_inventory)
    LOOP
        -- Count active bookings for this slot and this specific equipment
        SELECT COUNT(*) INTO v_booked_count
        FROM public.bookings b
        WHERE (b.slot_id = v_slot_id OR v_slot_id = ANY(b.booked_slot_ids))
        AND b.price_breakdown->>'equipment' = v_eq_type
        AND b.status IN ('pending', 'approved', 'completed');

        -- If any equipment type has remaining capacity, mark slot as available
        IF v_booked_count < v_capacity::INT THEN
            v_is_any_free := TRUE;
            EXIT; -- Found availability, no need to check further
        END IF;
    END LOOP;

    -- Update the slot's availability flag
    UPDATE public.slots
    SET is_available = v_is_any_free
    WHERE id = v_slot_id;

    -- Handling OLD.slot_id on UPDATE if it changed
    IF (TG_OP = 'UPDATE' AND OLD.slot_id IS DISTINCT FROM NEW.slot_id) THEN
        -- (Recursive-ish call or just repeat logic for OLD.slot_id)
        -- For robustness, we should trigger a sync for the old slot too
        -- We can just call the same logic or let it fire naturally if the DB allows
        -- But since we are inside the function, we'll manually check it:
        
        -- Reset v_is_any_free
        v_is_any_free := FALSE;
        
        SELECT equipment_inventory INTO v_inventory FROM public.slots WHERE id = OLD.slot_id;
        
        IF v_inventory IS NOT NULL THEN
            FOR v_eq_type, v_capacity IN SELECT * FROM jsonb_each_text(v_inventory) LOOP
                SELECT COUNT(*) INTO v_booked_count
                FROM public.bookings b
                WHERE (b.slot_id = OLD.slot_id OR OLD.slot_id = ANY(b.booked_slot_ids))
                AND b.price_breakdown->>'equipment' = v_eq_type
                AND b.status IN ('pending', 'approved', 'completed');

                IF v_booked_count < v_capacity::INT THEN
                    v_is_any_free := TRUE;
                    EXIT;
                END IF;
            END LOOP;
            
            UPDATE public.slots SET is_available = v_is_any_free WHERE id = OLD.slot_id;
        END IF;
    END IF;

    RETURN NULL; -- result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Triggers to 'bookings' table
DROP TRIGGER IF EXISTS trg_sync_slot_on_booking_change ON public.bookings;
CREATE TRIGGER trg_sync_slot_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.sync_slot_availability();

-- 5. One-time cleanup: Reset current orphans
-- This fixes the "ghost bookings" where is_available = false but no bookings exist.
UPDATE public.slots s
SET is_available = CASE 
    WHEN s.equipment_inventory IS NULL OR s.equipment_inventory = '{}'::jsonb THEN
        NOT EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE (b.slot_id = s.id OR s.id = ANY(b.booked_slot_ids))
            AND b.status IN ('pending', 'approved', 'completed')
        )
    ELSE
        EXISTS (
            SELECT 1 
            FROM jsonb_each_text(s.equipment_inventory) AS inv(eq, cap)
            WHERE (
                SELECT COUNT(*)
                FROM public.bookings b
                WHERE (b.slot_id = s.id OR s.id = ANY(b.booked_slot_ids))
                AND b.price_breakdown->>'equipment' = inv.eq
                AND b.status IN ('pending', 'approved', 'completed')
            ) < inv.cap::INT
        )
    END
WHERE s.is_available = false; -- Only target currently "unavailable" slots
