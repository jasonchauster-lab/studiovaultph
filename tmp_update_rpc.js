const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const sql = `
CREATE OR REPLACE FUNCTION book_slot_atomic(
    p_slot_id UUID,
    p_instructor_id UUID,
    p_client_id UUID,
    p_equipment_key TEXT,
    p_quantity INT,
    p_db_price NUMERIC,
    p_price_breakdown JSONB,
    p_wallet_deduction NUMERIC = 0,
    p_req_start_time TIME = NULL,
    p_req_end_time TIME = NULL
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
    -- 1. Lock the parent slot to prevent race conditions
    SELECT * INTO v_parent_slot 
    FROM slots 
    WHERE id = p_slot_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent slot not found (ID: %)', p_slot_id;
    END IF;

    IF NOT v_parent_slot.is_available THEN
         RAISE EXCEPTION 'Slot is no longer available';
    END IF;

    -- 1.1 Prevents Instructor Double-Booking Race Condition
    IF EXISTS (
        SELECT 1 
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id
          AND (
            b.status = 'approved'
            OR (b.status = 'pending' AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP))
          )
          AND s.date = v_parent_slot.date
          AND (
            (s.start_time, s.end_time) OVERLAPS (
                COALESCE(p_req_start_time, v_parent_slot.start_time), 
                COALESCE(p_req_end_time, v_parent_slot.end_time)
            )
          )
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this time slot';
    END IF;

    -- 2. Validate and Deduct Inventory
    v_parent_equipment := v_parent_slot.equipment;
    v_parent_quantity := COALESCE(v_parent_slot.quantity, 0);
    
    v_available_qty := COALESCE(CAST(v_parent_equipment->>p_equipment_key AS INT), 0);
    
    IF v_available_qty < p_quantity THEN
        RAISE EXCEPTION 'Insufficient equipment inventory for % (Requested: %, Available: %)', 
            p_equipment_key, p_quantity, v_available_qty;
    END IF;

    v_new_equipment := v_parent_equipment;
    v_new_equipment := jsonb_set(
        v_new_equipment, 
        string_to_array(p_equipment_key, ','), 
        to_jsonb(v_available_qty - p_quantity)
    );

    v_parent_quantity := GREATEST(0, v_parent_quantity - p_quantity);

    IF v_parent_quantity <= 0 THEN
        DELETE FROM slots WHERE id = p_slot_id;
    ELSE
        UPDATE slots 
        SET equipment = v_new_equipment,
            equipment_inventory = v_new_equipment,
            quantity = v_parent_quantity,
            is_available = true
        WHERE id = p_slot_id;
    END IF;

    -- 3. Create Extracted Slot
    INSERT INTO slots (
        studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
    ) VALUES (
        v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time,
        false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity
    ) RETURNING id INTO v_extracted_slot_id;

    v_final_slot_id := v_extracted_slot_id;

    -- 4. Handle Time-Splitting
    IF p_req_start_time IS NOT NULL AND p_req_end_time IS NOT NULL THEN
        IF p_req_start_time > v_parent_slot.start_time OR p_req_end_time < v_parent_slot.end_time THEN
            UPDATE slots SET start_time = p_req_start_time, end_time = p_req_end_time WHERE id = v_extracted_slot_id;
            
            IF v_parent_slot.start_time < p_req_start_time THEN
                INSERT INTO slots (
                    studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
                ) VALUES (
                    v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, p_req_start_time,
                    true, v_new_equipment, v_new_equipment, v_parent_quantity
                );
            END IF;

            IF p_req_end_time < v_parent_slot.end_time THEN
                INSERT INTO slots (
                    studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity
                ) VALUES (
                    v_parent_slot.studio_id, v_parent_slot.date, p_req_end_time, v_parent_slot.end_time,
                    true, v_new_equipment, v_new_equipment, v_parent_quantity
                );
            END IF;
        END IF;
    END IF;

    -- 5. Wallet
    IF p_wallet_deduction > 0 THEN
        PERFORM deduct_available_balance(p_client_id, p_wallet_deduction);
    END IF;

    -- 6. Insert Booking Record
    v_expires_at := CURRENT_TIMESTAMP + interval '15 minutes';

    INSERT INTO bookings (
        slot_id,
        instructor_id,
        client_id,
        status,
        equipment,
        total_price,
        price_breakdown,
        quantity,
        booked_slot_ids,
        studio_id,
        expires_at
    ) VALUES (
        v_final_slot_id,
        p_instructor_id,
        p_client_id,
        'pending',
        p_equipment_key,
        p_db_price,
        p_price_breakdown,
        p_quantity,
        ARRAY[v_final_slot_id],
        v_parent_slot.studio_id,
        v_expires_at
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'final_slot_id', v_final_slot_id,
        'parent_slot_id', p_slot_id
    );
END;
$$;
`;

async function run() {
    try {
        console.log('Deploying updated book_slot_atomic...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) throw error;
        console.log('De-deployment success.');
    } catch (e) {
        console.error('Deployment Failed:', e);
    }
}

run();
