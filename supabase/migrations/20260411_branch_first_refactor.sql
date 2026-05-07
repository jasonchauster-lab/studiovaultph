-- Migration: Branch-First Transformation (Scoping, Branding, and SEO)
-- This migration prepares the database for location-specific storefronts and restricted pricing.

-- 1. ENHANCE OUTLETS TABLE
ALTER TABLE public.outlets 
    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
    ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Create index for slug lookups (essential for /s/[slug]/[branchSlug])
CREATE INDEX IF NOT EXISTS idx_outlets_slug ON public.outlets(slug);

-- 2. ENHANCE PRICING TABLES (Multi-Branch Scoping)
ALTER TABLE public.packages 
    ADD COLUMN IF NOT EXISTS applicable_outlet_ids UUID[] DEFAULT NULL;

ALTER TABLE public.memberships 
    ADD COLUMN IF NOT EXISTS applicable_outlet_ids UUID[] DEFAULT NULL;

-- 3. INITIAL DATA SEEDING (Slugs for existing outlets)
UPDATE public.outlets 
SET slug = lower(replace(name, ' ', '-')) || '-' || substr(id::text, 1, 4)
WHERE slug IS NULL;

-- 4. UPDATE ATOMIC BOOKING LOGIC (Pricing Scoping)

-- Update consume_package_credit to check outlet_id
CREATE OR REPLACE FUNCTION public.consume_package_credit(
    p_plan_id UUID,
    p_outlet_id UUID DEFAULT NULL, -- Optional: If provided, check if package is valid for this outlet
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining INTEGER;
    v_applicable_ids UUID[];
BEGIN
    -- 1. Fetch plan and restriction data
    SELECT 
        cp.remaining_credits, 
        COALESCE(p.applicable_outlet_ids, m.applicable_outlet_ids) INTO v_remaining, v_applicable_ids
    FROM public.customer_plans cp
    LEFT JOIN public.packages p ON cp.package_id = p.id
    LEFT JOIN public.memberships m ON cp.membership_id = m.id
    WHERE cp.id = p_plan_id
      AND cp.status = 'active'
      AND (cp.expires_at IS NULL OR cp.expires_at > now());
      
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active plan found or plan expired.');
    END IF;

    -- 2. Location Restriction Check
    -- If p_outlet_id is provided and the package has restrictions, ensure the outlet matches
    IF p_outlet_id IS NOT NULL AND v_applicable_ids IS NOT NULL AND cardinality(v_applicable_ids) > 0 THEN
        IF NOT (p_outlet_id = ANY(v_applicable_ids)) THEN
            RETURN jsonb_build_object('success', false, 'error', 'This package is not valid for use at this location.');
        END IF;
    END IF;
    
    -- 3. Handle Unlimited (NULL)
    IF v_remaining IS NULL THEN
        RETURN jsonb_build_object('success', true, 'remaining', NULL);
    END IF;
    
    -- 4. Check Balance
    IF v_remaining < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits.');
    END IF;
    
    -- 5. Deduct
    UPDATE public.customer_plans
    SET remaining_credits = remaining_credits - p_quantity,
        updated_at = now()
    WHERE id = p_plan_id;
    
    RETURN jsonb_build_object('success', true, 'remaining', v_remaining - p_quantity);
END;
$$;

-- Update book_slot_with_package_credit to pass outlet_id
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
    -- 1. Fetch Slot first to get outlet_id for scoping
    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;

    -- 2. Consume the Credit (Wraps balance check, expiration, AND now OUTLET check)
    v_credit_result := public.consume_package_credit(p_plan_id, v_parent_slot.outlet_id, p_quantity);
    IF NOT (v_credit_result->>'success')::BOOLEAN THEN
        RAISE EXCEPTION '%', v_credit_result->>'error';
    END IF;

    -- 3. Validations
    IF NOT v_parent_slot.is_available THEN RAISE EXCEPTION 'Slot no longer available'; END IF;

    -- Instructor overlap check
    IF EXISTS (
        SELECT 1 FROM bookings b JOIN slots s ON b.slot_id = s.id
        WHERE b.instructor_id = p_instructor_id AND b.status IN ('approved', 'pending')
          AND s.date = v_parent_slot.date
          AND (s.start_time, s.end_time) OVERLAPS (COALESCE(p_req_start_time, v_parent_slot.start_time), COALESCE(p_req_end_time, v_parent_slot.end_time))
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this time slot';
    END IF;

    -- 4. Update Inventory
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

    -- 5. Create Extracted Slot and Booking (Maintaining outlet_id)
    INSERT INTO slots (studio_id, outlet_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity)
    VALUES (v_parent_slot.studio_id, v_parent_slot.outlet_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time, false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity)
    RETURNING id INTO v_extracted_slot_id;

    INSERT INTO bookings (
        slot_id, outlet_id, instructor_id, client_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, studio_id, payment_method
    ) VALUES (
        v_extracted_slot_id, v_parent_slot.outlet_id, p_instructor_id, p_client_id, 'approved', p_equipment_key, 0, p_price_breakdown, p_quantity, ARRAY[v_extracted_slot_id], v_parent_slot.studio_id, 'credit'
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;
