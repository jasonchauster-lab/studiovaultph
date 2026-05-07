-- Migration: 20260404_add_payment_config.sql
-- Support for Xendit and Manual Payments (GCash/Bank Transfer) in the CMA

ALTER TABLE studios 
ADD COLUMN IF NOT EXISTS xendit_api_key TEXT,
ADD COLUMN IF NOT EXISTS xendit_callback_token TEXT,
ADD COLUMN IF NOT EXISTS manual_payment_instructions TEXT,
ADD COLUMN IF NOT EXISTS enable_xendit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_manual_payments BOOLEAN DEFAULT true;

COMMENT ON COLUMN studios.manual_payment_instructions IS 'GCash/Bank Transfer instructions for the studio.';

-- Add payment_method to bookings to distinguish between Xendit and Manual/Bank Transfer
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'xendit';

COMMENT ON COLUMN bookings.payment_method IS 'Method used for payment: xendit, manual';
