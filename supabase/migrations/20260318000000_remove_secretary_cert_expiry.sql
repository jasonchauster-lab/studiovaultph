-- Remove secretary_certificate_expiry column from studios
ALTER TABLE studios DROP COLUMN IF EXISTS secretary_certificate_expiry;
