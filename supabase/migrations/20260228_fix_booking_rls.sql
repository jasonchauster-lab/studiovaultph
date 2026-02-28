-- Fix RLS for bookings table to allow studio owners to view bookings for their studios

-- Enable RLS (just in case it wasn't enabled, though it usually is)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 1. Studio Owner Policy
DROP POLICY IF EXISTS "Studio owners can view bookings for their studios" ON public.bookings;
CREATE POLICY "Studio owners can view bookings for their studios"
ON public.bookings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.slots s
        JOIN public.studios st ON s.studio_id = st.id
        WHERE s.id = public.bookings.slot_id
        AND st.owner_id = auth.uid()
    )
);

-- 2. Instructor Policy
DROP POLICY IF EXISTS "Instructors can view their own bookings" ON public.bookings;
CREATE POLICY "Instructors can view their own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = instructor_id);

-- 3. Client Policy
DROP POLICY IF EXISTS "Clients can view their own bookings" ON public.bookings;
CREATE POLICY "Clients can view their own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = client_id);

-- 4. Admin Policy
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
