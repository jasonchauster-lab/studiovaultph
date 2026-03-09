-- Add equipment array to instructor_availability to allow instructors to specify what equipment they can teach on
ALTER TABLE public.instructor_availability
ADD COLUMN IF NOT EXISTS equipment text[] DEFAULT '{}'::text[];

-- Add an index for faster filtering when we implement Phase 2 (client-side equipment filtering)
CREATE INDEX IF NOT EXISTS idx_instructor_availability_equipment ON public.instructor_availability USING GIN (equipment);
