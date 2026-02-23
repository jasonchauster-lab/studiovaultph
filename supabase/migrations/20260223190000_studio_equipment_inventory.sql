-- Add inventory column to store equipment quantities
ALTER TABLE public.studios 
ADD COLUMN inventory JSONB DEFAULT '{}'::jsonb;

-- Comment on the column for clarity
COMMENT ON COLUMN public.studios.inventory IS 'Stores equipment type counts, e.g., {"Reformer": 5, "Cadillac": 2}';
