-- migration: 20260322_instructor_dashboard_rpc.sql

CREATE OR REPLACE FUNCTION get_instructor_dashboard_stats_v2(
    p_instructor_id UUID,
    p_today DATE,
    p_now_time TIME,
    p_week_start DATE,
    p_week_end DATE
)
RETURNS JSONB AS $$
DECLARE
    v_balance NUMERIC;
    v_pending_earnings NUMERIC;
    v_total_sessions INT;
    v_has_pending_payout BOOLEAN;
    v_is_verified BOOLEAN;
    v_upcoming_bookings JSONB;
    v_calendar_bookings JSONB;
    v_availability JSONB;
    v_profile JSONB;
BEGIN
    -- 1. Profile & Balance
    SELECT 
        available_balance,
        jsonb_build_object(
            'id', id,
            'teaching_equipment', teaching_equipment,
            'rates', rates,
            'home_base_address', home_base_address,
            'offers_home_sessions', offers_home_sessions,
            'max_travel_km', max_travel_km
        )
    INTO v_balance, v_profile
    FROM profiles 
    WHERE id = p_instructor_id;

    -- 2. Verification Status
    SELECT verified INTO v_is_verified 
    FROM certifications 
    WHERE instructor_id = p_instructor_id 
    LIMIT 1;

    -- 3. Pending Payouts
    SELECT EXISTS (
        SELECT 1 FROM payout_requests 
        WHERE user_id = p_instructor_id AND status = 'pending'
    ) INTO v_has_pending_payout;

    -- 4. Total Sessions Taught
    SELECT COUNT(*) INTO v_total_sessions
    FROM bookings
    WHERE instructor_id = p_instructor_id AND status IN ('approved', 'completed');

    -- 5. Upcoming Bookings (Top 5)
    SELECT jsonb_agg(sub) INTO v_upcoming_bookings
    FROM (
        SELECT 
            b.*,
            CASE 
                WHEN s.id IS NOT NULL THEN jsonb_build_object(
                    'id', s.id,
                    'date', s.date,
                    'start_time', s.start_time,
                    'end_time', s.end_time,
                    'equipment', s.equipment,
                    'quantity', s.quantity,
                    'studios', CASE 
                        WHEN st.id IS NOT NULL THEN jsonb_build_object(
                            'id', st.id,
                            'name', st.name,
                            'location', st.location,
                            'logo_url', st.logo_url,
                            'owner_id', st.owner_id
                        )
                        ELSE NULL
                    END
                )
                ELSE jsonb_build_object(
                    'id', NULL,
                    'date', b.booking_date,
                    'start_time', b.booking_start_time,
                    'end_time', b.booking_end_time,
                    'equipment', (b.price_breakdown->>'equipment'),
                    'quantity', 1,
                    'studios', NULL
                )
            END as slots,
            jsonb_build_object(
                'full_name', p.full_name,
                'email', p.email,
                'avatar_url', p.avatar_url,
                'bio', p.bio,
                'medical_conditions', p.medical_conditions,
                'other_medical_condition', p.other_medical_condition,
                'date_of_birth', p.date_of_birth
            ) as client
        FROM bookings b
        LEFT JOIN slots s ON b.slot_id = s.id
        LEFT JOIN studios st ON s.studio_id = st.id
        JOIN profiles p ON b.client_id = p.id
        WHERE b.instructor_id = p_instructor_id
          AND b.status = 'approved'
          AND (
            COALESCE(s.date, b.booking_date) > p_today 
            OR 
            (COALESCE(s.date, b.booking_date) = p_today AND COALESCE(s.start_time, b.booking_start_time) >= p_now_time)
          )
        ORDER BY COALESCE(s.date, b.booking_date) ASC, COALESCE(s.start_time, b.booking_start_time) ASC
        LIMIT 5
    ) sub;

    -- 6. Calendar Bookings (Week)
    SELECT jsonb_agg(sub) INTO v_calendar_bookings
    FROM (
        SELECT 
            b.*,
            CASE 
                WHEN s.id IS NOT NULL THEN jsonb_build_object(
                    'id', s.id,
                    'date', s.date,
                    'start_time', s.start_time,
                    'end_time', s.end_time,
                    'equipment', s.equipment,
                    'quantity', s.quantity,
                    'studios', CASE 
                        WHEN st.id IS NOT NULL THEN jsonb_build_object(
                            'id', st.id,
                            'name', st.name,
                            'location', st.location,
                            'logo_url', st.logo_url,
                            'owner_id', st.owner_id
                        )
                        ELSE NULL
                    END
                )
                ELSE jsonb_build_object(
                    'id', NULL,
                    'date', b.booking_date,
                    'start_time', b.booking_start_time,
                    'end_time', b.booking_end_time,
                    'equipment', (b.price_breakdown->>'equipment'),
                    'quantity', 1,
                    'studios', NULL
                )
            END as slots,
            jsonb_build_object(
                'full_name', p.full_name,
                'email', p.email,
                'avatar_url', p.avatar_url,
                'bio', p.bio,
                'medical_conditions', p.medical_conditions,
                'other_medical_condition', p.other_medical_condition,
                'date_of_birth', p.date_of_birth
            ) as client
        FROM bookings b
        LEFT JOIN slots s ON b.slot_id = s.id
        LEFT JOIN studios st ON s.studio_id = st.id
        JOIN profiles p ON b.client_id = p.id
        WHERE b.instructor_id = p_instructor_id
          AND COALESCE(s.date, b.booking_date) >= p_week_start 
          AND COALESCE(s.date, b.booking_date) <= p_week_end
    ) sub;

    -- 7. Availability (Week)
    SELECT jsonb_agg(sub) INTO v_availability
    FROM (
        SELECT * FROM instructor_availability
        WHERE instructor_id = p_instructor_id
          AND (date IS NULL OR (date >= p_week_start AND date <= p_week_end))
        ORDER BY day_of_week ASC, start_time ASC
    ) sub;

    -- 8. Pending Earnings (Approved + Future)
    SELECT COALESCE(SUM((price_breakdown->>'instructor_fee')::NUMERIC), 0)
    INTO v_pending_earnings
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    WHERE b.instructor_id = p_instructor_id
      AND b.status = 'approved'
      AND (
        COALESCE(s.date, b.booking_date) > p_today 
        OR 
        (COALESCE(s.date, b.booking_date) = p_today AND COALESCE(s.start_time, b.booking_start_time) >= p_now_time)
      );

    RETURN jsonb_build_object(
        'balance', COALESCE(v_balance, 0),
        'pending_earnings', v_pending_earnings,
        'total_sessions', v_total_sessions,
        'has_pending_payout', v_has_pending_payout,
        'is_verified', COALESCE(v_is_verified, false),
        'upcoming_bookings', COALESCE(v_upcoming_bookings, '[]'::jsonb),
        'calendar_bookings', COALESCE(v_calendar_bookings, '[]'::jsonb),
        'availability', COALESCE(v_availability, '[]'::jsonb),
        'profile', v_profile
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
