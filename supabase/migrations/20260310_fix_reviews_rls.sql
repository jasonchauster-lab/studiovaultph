-- FIX REVIEWS RLS POLICY
-- This migration ensures that participants (Customers/Instructors) can submit reviews for their bookings.

-- 1. Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can submit reviews" ON public.reviews;

-- 2. Create a more robust policy that allows insertion if you are the reviewer
-- and part of the booking.
CREATE POLICY "Participants can submit reviews" ON public.reviews
    FOR INSERT 
    WITH CHECK (
        auth.uid() = reviewer_id
    );

-- 3. Ensure select is still correct (Everyone can read public reviews)
-- This was already fixed in 20260309_make_reviews_public.sql but we re-enforce it here.
DROP POLICY IF EXISTS "Everyone can read reviews" ON public.reviews;
CREATE POLICY "Everyone can read reviews" 
    ON public.reviews FOR SELECT 
    USING (true);

-- 4. Admins have full access
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
CREATE POLICY "Admins have full access to reviews" 
    ON public.reviews FOR ALL 
    USING (public.check_is_admin());

NOTIFY pgrst, 'reload schema';
