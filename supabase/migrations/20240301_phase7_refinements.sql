-- Phase 7: Cancellation Refinements & Strike System

-- 1. Add approved_at to bookings to track when a booking was confirmed
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Create studio_strikes table to track late cancellations
CREATE TABLE IF NOT EXISTS studio_strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add is_suspended flag to profiles to allow auto-suspension
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_suspended IS 'Flag to temporarily block users from taking actions if they exceed cancellation limits.';

-- 4. Ensure transfer_balance RPC exists and supports negative balances
-- (Negative balance is supported by default as we don't have a CHECK >= 0 constraint on available_balance)
CREATE OR REPLACE FUNCTION transfer_balance(
    p_from_id UUID,
    p_to_id UUID,
    p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
    -- Deduct from sender (allow negative)
    UPDATE profiles
    SET available_balance = available_balance - p_amount
    WHERE id = p_from_id;

    -- Credit to receiver
    UPDATE profiles
    SET available_balance = available_balance + p_amount
    WHERE id = p_to_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
