-- Migration: Add Waitlist System
-- Date: 2026-04-08

-- 1. Add waitlist_limit to studios
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS waitlist_limit INTEGER DEFAULT 5;
COMMENT ON COLUMN public.studios.waitlist_limit IS 'Max number of people allowed on the waitlist per slot. Set to 0 for unlimited.';

-- 2. Create the waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.slots(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    equipment_key TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'promoted', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    UNIQUE (slot_id, client_id)
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own waitlist entries" ON public.waitlist
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Studio owners view their studio waitlist" ON public.waitlist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = waitlist.studio_id AND owner_id = auth.uid()
        )
    );

-- 3. join_waitlist_atomic RPC
CREATE OR REPLACE FUNCTION join_waitlist_atomic(
    p_slot_id UUID,
    p_client_id UUID,
    p_equipment_key TEXT,
    p_quantity INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_studio_id UUID;
    v_waitlist_limit INT;
    v_current_count INT;
    v_waitlist_id UUID;
BEGIN
    -- 1. Get studio and limit
    SELECT s.studio_id, st.waitlist_limit 
    INTO v_studio_id, v_waitlist_limit
    FROM slots s
    JOIN studios st ON s.studio_id = st.id
    WHERE s.id = p_slot_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Slot not found';
    END IF;

    -- 2. Check if already on waitlist
    IF EXISTS (SELECT 1 FROM waitlist WHERE slot_id = p_slot_id AND client_id = p_client_id) THEN
        RAISE EXCEPTION 'You are already on the waitlist for this class';
    END IF;

    -- 3. Check limit
    IF v_waitlist_limit > 0 THEN
        SELECT COUNT(*) INTO v_current_count
        FROM waitlist
        WHERE slot_id = p_slot_id AND status = 'waiting';

        IF v_current_count >= v_waitlist_limit THEN
            RAISE EXCEPTION 'The waitlist for this class is full';
        END IF;
    END IF;

    -- 4. Join
    INSERT INTO waitlist (slot_id, client_id, studio_id, equipment_key, quantity)
    VALUES (p_slot_id, p_client_id, v_studio_id, p_equipment_key, p_quantity)
    RETURNING id INTO v_waitlist_id;

    RETURN jsonb_build_object(
        'success', true,
        'waitlist_id', v_waitlist_id,
        'position', v_current_count + 1
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
