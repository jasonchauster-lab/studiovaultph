-- migration: 20260322000006_submit_onboarding_atomic.sql

CREATE OR REPLACE FUNCTION submit_onboarding_atomic(
    target_user_id UUID,
    new_full_name TEXT,
    new_instagram_handle TEXT,
    new_contact_number TEXT,
    new_date_of_birth DATE,
    new_tin TEXT,
    new_gov_id_expiry DATE,
    new_bir_expiry DATE,
    new_role TEXT,
    cert_body TEXT,
    cert_name TEXT,
    cert_proof_url TEXT,
    cert_expiry_date DATE,
    id_url TEXT,
    tax_url TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Upsert Profile
    INSERT INTO profiles (
        id, full_name, instagram_handle, contact_number, date_of_birth, 
        tin, gov_id_expiry, bir_expiry, role, gov_id_url, bir_url, updated_at
    )
    VALUES (
        target_user_id, new_full_name, new_instagram_handle, new_contact_number, new_date_of_birth,
        new_tin, new_gov_id_expiry, new_bir_expiry, new_role, id_url, tax_url, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        instagram_handle = EXCLUDED.instagram_handle,
        contact_number = EXCLUDED.contact_number,
        date_of_birth = EXCLUDED.date_of_birth,
        tin = EXCLUDED.tin,
        gov_id_expiry = EXCLUDED.gov_id_expiry,
        bir_expiry = EXCLUDED.bir_expiry,
        role = EXCLUDED.role,
        gov_id_url = EXCLUDED.gov_id_url,
        bir_url = EXCLUDED.bir_url,
        updated_at = NOW();

    -- 2. Insert Certification
    INSERT INTO certifications (
        instructor_id, certification_body, certification_name, proof_url, expiry_date, verified
    )
    VALUES (
        target_user_id, cert_body, cert_name, cert_proof_url, cert_expiry_date, false
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
