-- Migration to add one-time payout approval requirements for studios
ALTER TABLE studios ADD COLUMN IF NOT EXISTS payout_approval_status TEXT DEFAULT 'none';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS mayors_permit_url TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS secretary_certificate_url TEXT;
