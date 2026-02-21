-- Add custom fee columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_founding_partner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_fee_percentage INTEGER DEFAULT 20;

-- Add custom fee columns to studios
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS is_founding_partner BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_fee_percentage INTEGER DEFAULT 20;
