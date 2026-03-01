-- 1. Add a temporary JSONB column for equipment
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS equipment_jsonb JSONB DEFAULT '{}'::jsonb;

-- 2. Populate the temporary column from the old text[] column
UPDATE public.slots 
SET equipment_jsonb = (
  SELECT COALESCE(jsonb_object_agg(elem, 1), '{}'::jsonb)
  FROM unnest(equipment) AS elem
)
WHERE equipment IS NOT NULL AND array_length(equipment, 1) > 0;

-- 3. Drop the old text[] column and rename the new jsonb one
ALTER TABLE public.slots DROP COLUMN IF EXISTS equipment;
ALTER TABLE public.slots RENAME COLUMN equipment_jsonb TO equipment;

-- 4. Add equipment_inventory column (matching the user's manual edits)
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS equipment_inventory JSONB DEFAULT '{}'::jsonb;
UPDATE public.slots SET equipment_inventory = equipment;

-- 5. Add quantity column to track total capacity per slot record
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- 6. Update quantity by summing up the units in the JSONB equipment object
UPDATE public.slots
SET quantity = (
  SELECT COALESCE(SUM(val::int), 0)
  FROM jsonb_each_text(equipment) AS x(key, val)
)
WHERE equipment IS NOT NULL AND jsonb_typeof(equipment) = 'object';

-- 7. Set defaults and constraints
UPDATE public.slots SET quantity = 1 WHERE quantity IS NULL OR quantity = 0;
ALTER TABLE public.slots ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE public.slots ALTER COLUMN quantity SET NOT NULL;
