-- migration: 20260322000005_expire_all_abandoned_bookings_atomic.sql

CREATE OR REPLACE FUNCTION expire_all_abandoned_bookings_atomic()
RETURNS JSONB AS $$
DECLARE
    expired_count INT := 0;
    booking_id UUID;
    now_time TIMESTAMP WITH TIME ZONE := NOW();
    legacy_cutoff TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '15 minutes';
BEGIN
    FOR booking_id IN 
        SELECT id FROM bookings 
        WHERE status = 'pending' 
        AND payment_proof_url IS NULL
        AND (
            (expires_at IS NOT NULL AND expires_at <= now_time)
            OR 
            (expires_at IS NULL AND created_at <= legacy_cutoff)
        )
    LOOP
        PERFORM expire_single_booking_atomic(booking_id);
        expired_count := expired_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'expired_count', expired_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
