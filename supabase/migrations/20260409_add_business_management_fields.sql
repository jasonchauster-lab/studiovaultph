-- Add business management fields to studios table
ALTER TABLE studios ADD COLUMN IF NOT EXISTS company_registered_name TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS company_registration_no TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS business_industry TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS business_contact_email TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS business_contact_number TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS show_whatsapp_button BOOLEAN DEFAULT false;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS business_country TEXT;
