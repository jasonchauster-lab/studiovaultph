-- Add expiry and insurance columns to studios
ALTER TABLE studios ADD COLUMN IF NOT EXISTS mayors_permit_expiry DATE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS secretary_certificate_expiry DATE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS bir_certificate_expiry DATE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS gov_id_expiry DATE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS insurance_url TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS payout_lock BOOLEAN DEFAULT false;
