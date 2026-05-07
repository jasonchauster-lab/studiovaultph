-- ==========================================
-- FIX: ADD COUNTRY FIELDS TO STUDIOS AND OUTLETS
-- ==========================================

-- 1. Ensure business_country exists in studios (Brand Level Country)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='studios' AND column_name='business_country') THEN
        ALTER TABLE public.studios ADD COLUMN business_country TEXT DEFAULT 'Philippines';
    END IF;
END $$;

-- 2. Ensure country exists in outlets (Location Level Country)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='outlets' AND column_name='country') THEN
        ALTER TABLE public.outlets ADD COLUMN country TEXT DEFAULT 'Philippines';
    END IF;
END $$;

-- 3. Sync data: default outlet country to the studio's business country
-- Only update if the outlet country is still the default
UPDATE public.outlets o
SET country = s.business_country
FROM public.studios s
WHERE o.studio_id = s.id 
AND (o.country IS NULL OR o.country = 'Philippines');
