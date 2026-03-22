-- Consolidate all admin dashboard verification queues into a single RPC for performance.
CREATE OR REPLACE FUNCTION get_admin_dashboard_queues()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_certs JSONB;
    v_studios_verify JSONB;
    v_studios_payout JSONB;
    v_bookings JSONB;
    v_instructor_payouts JSONB;
    v_studio_payouts JSONB;
    v_customer_payouts JSONB;
    v_top_ups JSONB;
    v_suspended JSONB;
BEGIN
    -- 1. Certification verification queue
    SELECT JSONB_AGG(j) INTO v_certs FROM (
        SELECT c.*, json_build_object('full_name', p.full_name, 'contact_number', p.contact_number, 'tin', p.tin, 'gov_id_url', p.gov_id_url, 'gov_id_expiry', p.gov_id_expiry, 'bir_url', p.bir_url, 'email', p.email) as profiles
        FROM certifications c
        JOIN profiles p ON c.instructor_id = p.id
        WHERE c.verified = false
        ORDER BY c.created_at DESC
    ) j;

    -- 2. Studio verification queue
    SELECT JSONB_AGG(j) INTO v_studios_verify FROM (
        SELECT s.*, json_build_object('full_name', p.full_name, 'email', p.email) as profiles
        FROM studios s
        JOIN profiles p ON s.owner_id = p.id
        WHERE s.verified = false
        ORDER BY s.created_at DESC
    ) j;

    -- 3. Studio payout setup queue
    SELECT JSONB_AGG(j) INTO v_studios_payout FROM (
        SELECT s.id, s.name, s.mayors_permit_url, s.secretary_certificate_url, s.mayors_permit_expiry, s.bir_certificate_url, s.bir_certificate_expiry, s.insurance_url, s.insurance_expiry, s.created_at, json_build_object('full_name', p.full_name, 'email', p.email) as profiles
        FROM studios s
        JOIN profiles p ON s.owner_id = p.id
        WHERE s.payout_approval_status = 'pending'
        ORDER BY s.created_at DESC
    ) j;

    -- 4. Pending booking requests
    SELECT JSONB_AGG(j) INTO v_bookings FROM (
        SELECT 
            b.*,
            json_build_object('full_name', cp.full_name, 'email', cp.email) as client,
            json_build_object('full_name', ip.full_name, 'email', ip.email) as instructor,
            json_build_object(
                'date', sl.date,
                'start_time', sl.start_time,
                'end_time', sl.end_time,
                'studios', json_build_object(
                    'name', st.name,
                    'location', st.location,
                    'address', st.address,
                    'profiles', json_build_object('full_name', op.full_name, 'email', op.email)
                )
            ) as slots
        FROM bookings b
        JOIN profiles cp ON b.client_id = cp.id
        LEFT JOIN profiles ip ON b.instructor_id = ip.id
        LEFT JOIN slots sl ON b.slot_id = sl.id
        LEFT JOIN studios st ON sl.studio_id = st.id
        LEFT JOIN profiles op ON st.owner_id = op.id
        WHERE b.status = 'pending'
        AND (b.total_price = 0 OR b.payment_proof_url IS NOT NULL)
        ORDER BY b.created_at DESC
    ) j;

    -- 5. Instructor payout requests
    SELECT JSONB_AGG(j) INTO v_instructor_payouts FROM (
        SELECT pr.*, p.full_name as instructor_name, p.email as instructor_email, p.available_balance as instructor_balance
        FROM payout_requests pr
        JOIN profiles p ON pr.user_id = p.id
        WHERE pr.status = 'pending' AND pr.user_id IS NOT NULL AND pr.studio_id IS NULL
        ORDER BY pr.created_at DESC
    ) j;

    -- 6. Studio payout requests
    SELECT JSONB_AGG(j) INTO v_studio_payouts FROM (
        SELECT pr.*, json_build_object('name', s.name, 'profiles', json_build_object('full_name', p.full_name, 'email', p.email, 'available_balance', p.available_balance)) as studios
        FROM payout_requests pr
        JOIN studios s ON pr.studio_id = s.id
        JOIN profiles p ON s.owner_id = p.id
        WHERE pr.status = 'pending' AND pr.studio_id IS NOT NULL
        ORDER BY pr.created_at DESC
    ) j;

    -- 7. Customer payout breakouts
    SELECT JSONB_AGG(j) INTO v_customer_payouts FROM (
        SELECT pr.*, json_build_object('full_name', p.full_name, 'email', p.email, 'available_balance', p.available_balance) as profile
        FROM payout_requests pr
        JOIN profiles p ON pr.user_id = p.id
        WHERE pr.status = 'pending' AND pr.user_id IS NOT NULL AND pr.instructor_id IS NULL AND pr.studio_id IS NULL
        ORDER BY pr.created_at DESC
    ) j;

    -- 8. Pending wallet top-ups
    SELECT JSONB_AGG(j) INTO v_top_ups FROM (
        SELECT t.*, json_build_object('full_name', p.full_name, 'email', p.email, 'available_balance', p.available_balance) as profiles
        FROM wallet_top_ups t
        JOIN profiles p ON t.user_id = p.id
        WHERE t.status = 'pending' AND t.type = 'top_up'
        ORDER BY t.created_at DESC
    ) j;

    -- 9. Suspended profiles
    SELECT JSONB_AGG(j) INTO v_suspended FROM (
        SELECT p.*, (SELECT json_agg(s.*) FROM studios s WHERE s.owner_id = p.id) as studios
        FROM profiles p
        WHERE p.is_suspended = true
        ORDER BY p.updated_at DESC
    ) j;

    RETURN JSONB_BUILD_OBJECT(
        'certifications', COALESCE(v_certs, '[]'::JSONB),
        'studios_verify', COALESCE(v_studios_verify, '[]'::JSONB),
        'studios_payout', COALESCE(v_studios_payout, '[]'::JSONB),
        'bookings', COALESCE(v_bookings, '[]'::JSONB),
        'instructor_payouts', COALESCE(v_instructor_payouts, '[]'::JSONB),
        'studio_payouts', COALESCE(v_studio_payouts, '[]'::JSONB),
        'customer_payouts', COALESCE(v_customer_payouts, '[]'::JSONB),
        'top_ups', COALESCE(v_top_ups, '[]'::JSONB),
        'suspended_profiles', COALESCE(v_suspended, '[]'::JSONB)
    );
END;
$$;
