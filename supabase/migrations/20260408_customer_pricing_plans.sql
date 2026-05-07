-- Migration: Package Credit Engine
-- This table tracks user ownership of pricing plans and their remaining credits.

-- 1. Create customer_plans table
CREATE TABLE IF NOT EXISTS public.customer_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    
    plan_type TEXT NOT NULL CHECK (plan_type IN ('package', 'membership')),
    remaining_credits INTEGER, -- NULL means unlimited (for memberships)
    expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('active', 'pending_payment', 'expired', 'cancelled')),
    
    payment_method TEXT DEFAULT 'manual' CHECK (payment_method IN ('xendit', 'manual')),
    payment_proof_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure either package or membership is provided
    CONSTRAINT one_plan_id CHECK (
        (package_id IS NOT NULL AND membership_id IS NULL) OR
        (package_id IS NULL AND membership_id IS NOT NULL)
    )
);

-- Enable RLS
ALTER TABLE public.customer_plans ENABLE ROW LEVEL SECURITY;

-- Policies
-- Customers can view their own plans
DROP POLICY IF EXISTS "Users can view their own plans" ON public.customer_plans;
CREATE POLICY "Users can view their own plans" ON public.customer_plans
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Studio owners can manage plans for their studio
DROP POLICY IF EXISTS "Owners can manage customer plans" ON public.customer_plans;
CREATE POLICY "Owners can manage customer plans" ON public.customer_plans
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = customer_plans.studio_id
            AND owner_id = auth.uid()
        )
    );

-- 2. Atomic Credit Consumption Function
CREATE OR REPLACE FUNCTION public.consume_package_credit(
    p_plan_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_remaining INTEGER;
BEGIN
    -- 1. Check if plan is active and valid
    SELECT remaining_credits INTO v_remaining
    FROM public.customer_plans
    WHERE id = p_plan_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now());
      
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active plan found or plan expired.');
    END IF;
    
    -- 2. Handle Unlimited (NULL)
    IF v_remaining IS NULL THEN
        RETURN jsonb_build_object('success', true, 'remaining', NULL);
    END IF;
    
    -- 3. Check Balance
    IF v_remaining < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits.');
    END IF;
    
    -- 4. Deduct
    UPDATE public.customer_plans
    SET remaining_credits = remaining_credits - p_quantity,
        updated_at = now()
    WHERE id = p_plan_id;
    
    RETURN jsonb_build_object('success', true, 'remaining', v_remaining - p_quantity);
END;
$$;

-- 3. Function to Grant Credits (Admin/Automated Use)
CREATE OR REPLACE FUNCTION public.activate_customer_plan(
    p_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Logic to activate a plan (usually called by studio owner or Xendit webhook)
    UPDATE public.customer_plans
    SET status = 'active',
        updated_at = now()
    WHERE id = p_plan_id
      AND status = 'pending_payment';
      
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. Atomic Booking with Package Credit
-- This function wraps the core booking logic but consumes a package credit instead of wallet balance.
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
    -- 1. Consume the Credit (Wraps balance check and deduction)
    v_credit_result := public.consume_package_credit(p_plan_id, p_quantity);
    IF NOT (v_credit_result->>'success')::BOOLEAN THEN
        RAISE EXCEPTION '%', v_credit_result->>'error';
    END IF;

    -- 2. Lock and Validate Slot (Equivalent to book_slot_atomic logic)
    SELECT * INTO v_parent_slot FROM slots WHERE id = p_slot_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Slot not found'; END IF;
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

    -- 3. Update Inventory
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

    -- 4. Create Extracted Slot and Booking
    INSERT INTO slots (studio_id, date, start_time, end_time, is_available, equipment, equipment_inventory, quantity)
    VALUES (v_parent_slot.studio_id, v_parent_slot.date, v_parent_slot.start_time, v_parent_slot.end_time, false, jsonb_build_object(p_equipment_key, p_quantity), jsonb_build_object(p_equipment_key, p_quantity), p_quantity)
    RETURNING id INTO v_extracted_slot_id;

    INSERT INTO bookings (
        slot_id, instructor_id, client_id, status, equipment, total_price, price_breakdown, quantity, booked_slot_ids, studio_id, payment_method
    ) VALUES (
        v_extracted_slot_id, p_instructor_id, p_client_id, 'approved', p_equipment_key, 0, p_price_breakdown, p_quantity, ARRAY[v_extracted_slot_id], v_parent_slot.studio_id, 'credit'
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;
