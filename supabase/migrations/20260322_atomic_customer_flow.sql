-- Phase 11: Customer Flow & Payment Atomicity
-- This migration adds atomic RPCs for Home Bookings and Payment Proof submissions.

-- 1. Atomic Home Booking
CREATE OR REPLACE FUNCTION book_home_session_atomic(
    p_instructor_id UUID,
    p_client_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_total_price NUMERIC,
    p_price_breakdown JSONB,
    p_wallet_deduction NUMERIC,
    p_home_address TEXT,
    p_home_lat NUMERIC DEFAULT NULL,
    p_home_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Double Booking Check (Instructor)
    IF EXISTS (
        SELECT 1 
        FROM bookings 
        WHERE instructor_id = p_instructor_id 
          AND booking_date = p_date 
          AND status IN ('pending', 'approved')
          AND (booking_start_time, booking_end_time) OVERLAPS (p_start_time, p_end_time)
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ) THEN
        RAISE EXCEPTION 'Instructor is already booked for this period';
    END IF;

    -- 2. Wallet Deduction
    IF p_wallet_deduction > 0 THEN
        PERFORM deduct_available_balance(p_client_id, p_wallet_deduction);
    END IF;

    -- 3. Create Booking
    v_expires_at := CURRENT_TIMESTAMP + interval '15 minutes';
    
    INSERT INTO bookings (
        instructor_id,
        client_id,
        status,
        total_price,
        location_type,
        home_address,
        home_lat,
        home_lng,
        booking_date,
        booking_start_time,
        booking_end_time,
        price_breakdown,
        expires_at
    ) VALUES (
        p_instructor_id,
        p_client_id,
        'pending',
        p_total_price,
        'home',
        p_home_address,
        p_home_lat,
        p_home_lng,
        p_date,
        p_start_time,
        p_end_time,
        p_price_breakdown,
        v_expires_at
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id
    );
END;
$$;

-- 2. Atomic Payment Submission
CREATE OR REPLACE FUNCTION submit_payment_atomic(
    p_booking_id UUID,
    p_client_id UUID,
    p_proof_url TEXT,
    p_waiver_agreed BOOLEAN,
    p_terms_agreed BOOLEAN,
    p_parq_answers JSONB,
    p_has_risk_flags BOOLEAN,
    p_medical_clearance_acknowledged BOOLEAN,
    p_waiver_version TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
BEGIN
    -- 1. Verify and Lock Booking
    SELECT * INTO v_booking 
    FROM bookings 
    WHERE id = p_booking_id AND client_id = p_client_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found or unauthorized';
    END IF;

    IF v_booking.status != 'pending' THEN
        RAISE EXCEPTION 'Only pending bookings can be paid (Current status: %)', v_booking.status;
    END IF;

    -- 2. Update Booking
    UPDATE bookings 
    SET payment_proof_url = p_proof_url,
        payment_status = 'submitted',
        payment_submitted_at = CURRENT_TIMESTAMP,
        waiver_agreed = p_waiver_agreed,
        terms_agreed = p_terms_agreed,
        expires_at = NULL -- Payment submitted, hold is now permanent until admin review
    WHERE id = p_booking_id;

    -- 3. Insert Consent Record
    INSERT INTO waiver_consents (
        booking_id,
        user_id,
        waiver_agreed,
        terms_agreed,
        parq_answers,
        has_risk_flags,
        medical_clearance_acknowledged,
        waiver_version,
        agreed_at
    ) VALUES (
        p_booking_id,
        p_client_id,
        p_waiver_agreed,
        p_terms_agreed,
        p_parq_answers,
        p_has_risk_flags,
        p_medical_clearance_acknowledged,
        p_waiver_version,
        CURRENT_TIMESTAMP
    );

    -- 4. Sync Profile
    IF p_waiver_agreed THEN
        UPDATE profiles 
        SET waiver_signed_at = CURRENT_TIMESTAMP 
        WHERE id = p_client_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
