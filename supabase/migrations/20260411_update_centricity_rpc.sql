-- Migration: Update Studio Centricity Metrics RPC to support Branch filtering
-- Date: 2026-04-11

CREATE OR REPLACE FUNCTION get_studio_centricity(p_studio_id UUID, p_outlet_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_nps_total INT;
    v_nps_promoters INT;
    v_nps_detractors INT;
    v_nps_score INT;
    v_avg_satisfaction NUMERIC;
    v_total_reviews INT;
    v_recent_feedback JSONB;
    v_total_clients INT;
    v_repeat_clients INT;
    v_repeat_rate NUMERIC;
    v_churn_risk INT;
    v_waitlist_turn_seconds INT;
    v_studio_owner_id UUID;
BEGIN
    -- Get studio owner id
    SELECT owner_id INTO v_studio_owner_id FROM studios WHERE id = p_studio_id;

    -- 1. NPS & Satisfaction
    -- If p_outlet_id is provided, filter reviews by bookings associated with that outlet
    -- Else, filter by all reviews where the reviewee is the studio owner
    IF p_outlet_id IS NOT NULL THEN
        SELECT 
            COUNT(*),
            COALESCE(AVG(r.rating), 0),
            COUNT(*) FILTER (WHERE r.rating = 5),
            COUNT(*) FILTER (WHERE r.rating <= 3)
        INTO v_total_reviews, v_avg_satisfaction, v_nps_promoters, v_nps_detractors
        FROM reviews r
        JOIN bookings b ON r.booking_id = b.id
        JOIN slots s ON b.slot_id = s.id
        WHERE s.outlet_id = p_outlet_id AND r.reviewee_id = v_studio_owner_id;
    ELSE
        SELECT 
            COUNT(*),
            COALESCE(AVG(rating), 0),
            COUNT(*) FILTER (WHERE rating = 5),
            COUNT(*) FILTER (WHERE rating <= 3)
        INTO v_total_reviews, v_avg_satisfaction, v_nps_promoters, v_nps_detractors
        FROM reviews
        WHERE reviewee_id = v_studio_owner_id;
    END IF;

    IF v_total_reviews > 0 THEN
        v_nps_score := ((v_nps_promoters::FLOAT - v_nps_detractors::FLOAT) / v_total_reviews::FLOAT) * 100;
    ELSE
        v_nps_score := 0;
    END IF;

    -- 2. Recent Feedback
    IF p_outlet_id IS NOT NULL THEN
        SELECT jsonb_agg(fb) INTO v_recent_feedback
        FROM (
            SELECT 
                p.full_name as name,
                r.comment as msg,
                r.rating as score
            FROM reviews r
            JOIN profiles p ON r.reviewer_id = p.id
            JOIN bookings b ON r.booking_id = b.id
            JOIN slots s ON b.slot_id = s.id
            WHERE s.outlet_id = p_outlet_id AND r.reviewee_id = v_studio_owner_id
            ORDER BY r.created_at DESC
            LIMIT 3
        ) fb;
    ELSE
        SELECT jsonb_agg(fb) INTO v_recent_feedback
        FROM (
            SELECT 
                p.full_name as name,
                r.comment as msg,
                r.rating as score
            FROM reviews r
            JOIN profiles p ON r.reviewer_id = p.id
            WHERE r.reviewee_id = v_studio_owner_id
            ORDER BY r.created_at DESC
            LIMIT 3
        ) fb;
    END IF;

    -- 3. Repeat Booking Rate
    SELECT COUNT(DISTINCT b.client_id) INTO v_total_clients
    FROM bookings b
    JOIN slots s ON b.slot_id = s.id
    WHERE s.studio_id = p_studio_id
      AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id);

    -- Clients with >= 2 bookings
    SELECT COUNT(*) INTO v_repeat_clients
    FROM (
        SELECT b.client_id
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        WHERE s.studio_id = p_studio_id
          AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id)
        GROUP BY b.client_id
        HAVING COUNT(*) >= 2
    ) t;

    IF v_total_clients > 0 THEN
        v_repeat_rate := (v_repeat_clients::FLOAT / v_total_clients::FLOAT) * 100;
    ELSE
        v_repeat_rate := 0;
    END IF;

    -- 4. Churn Risk (Clients with last booking > 30 days ago)
    SELECT COUNT(*) INTO v_churn_risk
    FROM (
        SELECT b.client_id, MAX(b.created_at) as last_booking
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        WHERE s.studio_id = p_studio_id
          AND (p_outlet_id IS NULL OR s.outlet_id = p_outlet_id)
        GROUP BY b.client_id
        HAVING MAX(b.created_at) < (now() - interval '30 days')
    ) t;

    -- 5. Waitlist Turn
    SELECT COALESCE(EXTRACT(EPOCH FROM AVG(notified_at - created_at)), 0)::INT
    INTO v_waitlist_turn_seconds
    FROM waitlist
    WHERE studio_id = p_studio_id 
      AND (p_outlet_id IS NULL OR outlet_id = p_outlet_id)
      AND status IN ('promoted', 'notified')
      AND notified_at IS NOT NULL;

    RETURN jsonb_build_object(
        'nps', v_nps_score,
        'total_reviews', v_total_reviews,
        'avg_satisfaction', ROUND(v_avg_satisfaction, 1),
        'recent_feedback', COALESCE(v_recent_feedback, '[]'::jsonb),
        'repeat_rate', ROUND(v_repeat_rate, 0),
        'churn_risk', v_churn_risk,
        'waitlist_turn_minutes', ROUND(v_waitlist_turn_seconds / 60, 0)
    );
END;
$$;
