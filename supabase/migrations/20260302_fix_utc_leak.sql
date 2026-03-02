-- 1. Fix the Studio Slots table
-- We must drop policies that depend on the columns we are altering
DROP POLICY IF EXISTS "Users can send messages if active" ON public.messages;

ALTER TABLE slots 
  ADD COLUMN IF NOT EXISTS "date" DATE;

UPDATE slots SET "date" = (start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date;

ALTER TABLE slots 
  ALTER COLUMN start_time TYPE TIME WITHOUT TIME ZONE USING (start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::time,
  ALTER COLUMN end_time TYPE TIME WITHOUT TIME ZONE USING (end_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::time;

-- Recreate the policy for messages
-- Note: This policy ensures users can only send messages for active/recent bookings.
-- We use the new (date + end_time) calculation to check for expiration.
CREATE POLICY "Users can send messages if active" ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.slots s ON b.slot_id = s.id
    WHERE b.id = messages.booking_id
    AND (
      -- Participant check
      (auth.uid() = b.client_id OR auth.uid() = b.instructor_id)
      AND
      -- Time check (Active = not more than 12 hours past session end)
      -- Using Manila wall-clock comparison
      ((s.date + s.end_time) + interval '12 hours') > (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')
    )
  )
);

-- 2. Correct Instructor Availability
-- Note: Check if start_time/end_time are already TIME or TIMESTAMP
-- Looking at actions, they seem to be stored as strings or HH:mm, but if the user ran SQL before, they might be different.
-- We'll force them to TIME WITHOUT TIME ZONE based on the wall-clock Manila time they represent.
ALTER TABLE public.instructor_availability
  ALTER COLUMN start_time TYPE TIME WITHOUT TIME ZONE USING (start_time::time),
  ALTER COLUMN end_time TYPE TIME WITHOUT TIME ZONE USING (end_time::time);
