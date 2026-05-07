-- Migration: 20260405_add_manual_payment_methods.sql
-- Support for multiple manual payment methods (GCash, Bank, etc.) with QR codes

ALTER TABLE studios 
ADD COLUMN IF NOT EXISTS manual_payment_methods JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN studios.manual_payment_methods IS 'List of manual payment methods with recipient name, account number, and QR code URL.';

-- Example structure:
-- [
--   { "id": "123", "type": "GCash", "recipient_name": "Juan Dela Cruz", "account_number": "09171234567", "qr_code_url": "v1/qr_gcash.png" },
--   { "id": "456", "type": "BDO", "recipient_name": "Juan Dela Cruz", "account_number": "00123456789", "qr_code_url": "v1/qr_bdo.png" }
-- ]
