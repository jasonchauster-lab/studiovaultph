-- Add custom_domain to studios
ALTER TABLE studios ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_studios_custom_domain ON studios(custom_domain);
