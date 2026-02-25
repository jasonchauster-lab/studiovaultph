-- Add google_maps_url to the studios table
ALTER TABLE public.studios ADD COLUMN IF NOT EXISTS google_maps_url text;
