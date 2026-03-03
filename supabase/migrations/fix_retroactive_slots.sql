-- Fix for "Corrupted" Slots where equipment became '{}'
-- This script restores the equipment for slots that are marked as 'Open Space' 
-- but actually have booked child slots with equipment.

DO $$
DECLARE
    v_parent_id UUID;
    v_extracted_equipment JSONB;
BEGIN
    -- For every active extraction slot
    FOR v_parent_id, v_extracted_equipment IN 
        SELECT parent_s.id, child_s.equipment
        FROM slots parent_s
        JOIN bookings b ON b.status IN ('pending', 'approved', 'completed')
        JOIN slots child_s ON child_s.id = b.slot_id
        WHERE 
            -- The parent slot is 'Open Space' (equipment is missing or empty)
            (parent_s.equipment IS NULL OR parent_s.equipment = '{}'::jsonb)
            AND parent_s.is_available = false
            -- Match by time and studio to find the likely parent
            AND parent_s.studio_id = child_s.studio_id
            AND parent_s.date = child_s.date
            AND parent_s.start_time = child_s.start_time
            AND parent_s.id != child_s.id
    LOOP
        -- Replace '{}' with the equipment types booked, but set quantity to 0
        -- Example: {"REFORMER": 1} becomes {"REFORMER": 0}
        UPDATE slots
        SET equipment = (
            SELECT jsonb_object_agg(key, 0)
            FROM jsonb_each(v_extracted_equipment)
        ),
        equipment_inventory = (
            SELECT jsonb_object_agg(key, 0)
            FROM jsonb_each(v_extracted_equipment)
        )
        WHERE id = v_parent_id;
    END LOOP;
END $$;
