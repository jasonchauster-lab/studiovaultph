-- Migration for Atomic Staff Onboarding
-- This script ensures staff and location assignments happen in a single transaction.

CREATE OR REPLACE FUNCTION add_staff_member_atomic_v1(
    p_studio_id UUID,
    p_profile_id UUID,
    p_role_id UUID,
    p_invited_by_id UUID,
    p_metadata JSONB,
    p_outlet_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_member_id UUID;
BEGIN
    -- 1. Check for existing membership
    IF EXISTS (SELECT 1 FROM studio_members WHERE studio_id = p_studio_id AND profile_id = p_profile_id) THEN
        RAISE EXCEPTION 'This user is already a member of this studio.';
    END IF;

    -- 2. Insert into studio_members
    INSERT INTO studio_members (
        studio_id, 
        profile_id, 
        role, 
        metadata, 
        invited_by_id
    ) VALUES (
        p_studio_id, 
        p_profile_id, 
        p_role_id::TEXT, -- Cast to text if using the old string-role schema or maintain as UUID
        p_metadata, 
        p_invited_by_id
    ) RETURNING id INTO v_member_id;

    -- 3. Insert into outlet_members if provided
    IF p_outlet_id IS NOT NULL THEN
        INSERT INTO outlet_members (
            outlet_id, 
            member_id
        ) VALUES (
            p_outlet_id, 
            v_member_id
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'member_id', v_member_id);

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
