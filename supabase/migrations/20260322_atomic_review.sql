-- migration: 20260322000004_submit_review_atomic.sql

CREATE OR REPLACE FUNCTION submit_review_atomic(
    p_booking_id UUID,
    p_reviewer_id UUID,
    p_reviewee_id UUID,
    p_rating INT,
    p_comment TEXT,
    p_tags TEXT[]
)
RETURNS JSONB AS $$
DECLARE
    booking_rec RECORD;
    is_customer BOOLEAN;
    is_instructor BOOLEAN;
BEGIN
    -- 1. Fetch and lock booking
    SELECT * INTO booking_rec FROM bookings WHERE id = p_booking_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
    END IF;

    is_customer := booking_rec.client_id = p_reviewer_id;
    is_instructor := booking_rec.instructor_id = p_reviewer_id;

    IF NOT is_customer AND NOT is_instructor THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
    END IF;

    -- 2. Insert Review
    INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment, tags)
    VALUES (p_booking_id, p_reviewer_id, p_reviewee_id, p_rating, p_comment, p_tags);

    -- 3. Update Booking Flags
    IF is_customer THEN
        IF p_reviewee_id = booking_rec.instructor_id THEN
            UPDATE bookings SET customer_reviewed_instructor = true, customer_reviewed = true WHERE id = p_booking_id;
        ELSE
            UPDATE bookings SET customer_reviewed_studio = true WHERE id = p_booking_id;
        END IF;
    ELSIF is_instructor THEN
        IF p_reviewee_id = booking_rec.client_id THEN
            UPDATE bookings SET instructor_reviewed = true WHERE id = p_booking_id;
        ELSE
            UPDATE bookings SET instructor_reviewed_studio = true WHERE id = p_booking_id;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already reviewed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
