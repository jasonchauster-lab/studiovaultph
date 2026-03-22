-- Fix: Add funds_unlocked to get_studio_rental_history_v2
-- Without this column, the frontend receives undefined for funds_unlocked, 
-- causing it to always display "Funds Held" regardless of the database state.

DROP FUNCTION IF EXISTS get_studio_rental_history_v2(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_studio_rental_history_v2(
    p_studio_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    status TEXT,
    funds_unlocked BOOLEAN,
    price_breakdown JSONB,
    client_id UUID,
    instructor_id UUID,
    slot_id UUID,
    session_date DATE,
    start_time TIME,
    end_time TIME,
    equipment JSONB,
    studio_name TEXT,
    instructor_name TEXT,
    instructor_avatar TEXT,
    client_name TEXT,
    client_avatar TEXT,
    client_email TEXT,
    client_medical TEXT[],
    client_other_medical TEXT,
    client_bio TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.created_at,
        b.status::TEXT,
        b.funds_unlocked,
        b.price_breakdown,
        b.client_id,
        b.instructor_id,
        b.slot_id,
        COALESCE(s.date, b.created_at::DATE) as session_date,
        s.start_time,
        s.end_time,
        s.equipment,
        st.name as studio_name,
        ip.full_name as instructor_name,
        ip.avatar_url as instructor_avatar,
        cp.full_name as client_name,
        cp.avatar_url as client_avatar,
        cp.email as client_email,
        cp.medical_conditions as client_medical,
        cp.other_medical_condition as client_other_medical,
        cp.bio as client_bio
    FROM bookings b
    LEFT JOIN slots s ON b.slot_id = s.id
    LEFT JOIN studios st ON COALESCE(b.studio_id, s.studio_id) = st.id
    LEFT JOIN profiles ip ON b.instructor_id = ip.id
    JOIN profiles cp ON b.client_id = cp.id
    WHERE (b.studio_id = p_studio_id OR s.studio_id = p_studio_id)
    AND b.status::TEXT IN ('approved', 'completed', 'cancelled_refunded', 'cancelled_charged', 'pending', 'rejected', 'cancelled')
    AND (p_start_date IS NULL OR COALESCE(s.date, b.created_at::DATE) >= p_start_date)
    AND (p_end_date IS NULL OR COALESCE(s.date, b.created_at::DATE) <= p_end_date)
    ORDER BY COALESCE(s.date, b.created_at::DATE) DESC, s.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
