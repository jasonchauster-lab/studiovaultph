-- migration: 20260322000003_request_payout_atomic.sql

CREATE OR REPLACE FUNCTION request_payout_atomic(
    p_user_id UUID,
    p_amount NUMERIC,
    p_method TEXT,
    p_account_name TEXT,
    p_account_number TEXT,
    p_bank_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    current_balance NUMERIC;
BEGIN
    -- 1. Fetch and lock profile for the user
    SELECT available_balance INTO current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    -- 2. Verify sufficient funds
    IF current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
    END IF;

    -- 3. Deduct from balance
    UPDATE profiles 
    SET available_balance = available_balance - p_amount 
    WHERE id = p_user_id;

    -- 4. Create payout request record
    INSERT INTO payout_requests (
        user_id, 
        amount, 
        status, 
        payment_method, 
        account_name, 
        account_number, 
        bank_name,
        created_at
    )
    VALUES (
        p_user_id, 
        p_amount, 
        'pending', 
        p_method, 
        p_account_name, 
        p_account_number, 
        p_bank_name,
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
