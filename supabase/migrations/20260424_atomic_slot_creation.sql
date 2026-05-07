-- Migration for Atomic Slot Creation
-- This script provides a transactional PostgreSQL function to safely create slots
-- with strict inventory and instructor conflict checks.

CREATE OR REPLACE FUNCTION create_slots_atomic_v1(
    p_studio_id UUID,
    p_outlet_id UUID,
    p_service_id UUID,
    p_instructor_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_equipment JSONB,
    p_pax_capacity INT,
    p_waitlist_pax_capacity INT,
    p_calendar_color TEXT,
    p_display_name TEXT,
    p_location_name TEXT,
    p_is_published BOOLEAN,
    p_is_available BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_equipment_units INT := 0;
    v_inventory JSONB;
    v_eq_name TEXT;
    v_eq_qty INT;
    v_total_available INT;
    v_currently_used INT;
    v_slot_id UUID;
BEGIN
    -- 1. Calculate total units for metadata (default to pax_capacity if no equipment)
    SELECT COALESCE(SUM(value::INT), p_pax_capacity) INTO v_total_equipment_units 
    FROM jsonb_each_text(p_equipment);

    -- 2. Fetch inventory (Outlet-scoped with Studio Fallback)
    SELECT inventory INTO v_inventory FROM outlets WHERE id = p_outlet_id;
    
    IF v_inventory IS NULL OR v_inventory = '{}'::JSONB THEN
        SELECT inventory INTO v_inventory FROM studios WHERE id = p_studio_id;
    END IF;

    IF v_inventory IS NULL THEN
        RAISE EXCEPTION 'No inventory defined for this studio or outlet.';
    END IF;

    -- 3. Lock relevant slot rows to prevent concurrent race conditions
    -- We lock by date and outlet to serialize creations for the same block
    PERFORM id FROM slots 
    WHERE outlet_id = p_outlet_id 
      AND date = p_date 
      AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    FOR UPDATE;

    -- 4. Verify Instructor Availability
    IF p_instructor_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM slots 
            WHERE instructor_id = p_instructor_id 
              AND date = p_date 
              AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
        ) THEN
            RAISE EXCEPTION 'Instructor is already assigned to a session at this time.';
        END IF;
    END IF;

    -- 5. Verify Equipment Inventory Availability
    FOR v_eq_name, v_eq_qty IN SELECT * FROM jsonb_each_text(p_equipment) LOOP
        v_eq_name := UPPER(v_eq_name);
        v_total_available := COALESCE((v_inventory->v_eq_name->>'total')::INT, 0);
        
        IF v_total_available = 0 THEN
            RAISE EXCEPTION 'Equipment % is not in your inventory list.', v_eq_name;
        END IF;

        -- Sum used equipment in overlapping slots
        SELECT COALESCE(SUM((equipment->>v_eq_name)::INT), 0) INTO v_currently_used
        FROM slots
        WHERE outlet_id = p_outlet_id
          AND date = p_date
          AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time);

        IF v_currently_used + v_eq_qty > v_total_available THEN
            RAISE EXCEPTION 'Insufficient % inventory. Total: %, Used: %, Requested: %', 
                v_eq_name, v_total_available, v_currently_used, v_eq_qty;
        END IF;
    END LOOP;

    -- 6. Insert the Slot
    INSERT INTO slots (
        studio_id,
        outlet_id,
        service_id,
        instructor_id,
        date,
        start_time,
        end_time,
        equipment,
        equipment_inventory,
        quantity,
        pax_capacity,
        waitlist_pax_capacity,
        calendar_color,
        display_name,
        location_name,
        is_published,
        is_available,
        session_type
    ) VALUES (
        p_studio_id,
        p_outlet_id,
        p_service_id,
        p_instructor_id,
        p_date,
        p_start_time,
        p_end_time,
        p_equipment,
        p_equipment,
        v_total_equipment_units,
        p_pax_capacity,
        p_waitlist_pax_capacity,
        p_calendar_color,
        p_display_name,
        p_location_name,
        p_is_published,
        p_is_available,
        COALESCE(p_display_name, p_service_id::TEXT)
    ) RETURNING id INTO v_slot_id;

    RETURN jsonb_build_object(
        'success', true,
        'slot_id', v_slot_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;
