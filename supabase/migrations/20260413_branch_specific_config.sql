-- Add website_config to outlets
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS website_config JSONB DEFAULT NULL;

-- Migrate existing studio website config to all its outlets
-- We do this so each branch starts with a copy of what was there before
UPDATE public.outlets o
SET website_config = s.website_config
FROM public.studios s
WHERE o.studio_id = s.id
AND s.website_config IS NOT NULL;

-- Optional: Clean up studio config to only keep branding (Theme/Header/Favicon)
-- We'll keep the full JSON in studios for now just in case, but my code will
-- eventually prioritize the branch-specific content.
