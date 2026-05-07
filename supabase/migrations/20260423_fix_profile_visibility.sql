-- Migration: Allow Studio Owners to view profiles of users with plans
-- Updates check_is_partner_of to include customer_plans check.

CREATE OR REPLACE FUNCTION public.check_is_partner_of(client_uid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        -- 1. Check Bookings
        SELECT 1 FROM public.bookings b
        JOIN public.slots s ON b.slot_id = s.id
        JOIN public.studios st ON s.studio_id = st.id
        WHERE b.client_id = client_uid
        AND (b.instructor_id = auth.uid() OR st.owner_id = auth.uid())
        
        UNION
        
        -- 2. Check Customer Plans (New!)
        SELECT 1 FROM public.customer_plans cp
        JOIN public.studios st ON cp.studio_id = st.id
        WHERE cp.user_id = client_uid
        AND st.owner_id = auth.uid()
        
        UNION
        
        -- 3. Check Studio Members (for staff/instructors)
        SELECT 1 FROM public.studio_members sm
        JOIN public.studios st ON sm.studio_id = st.id
        WHERE sm.profile_id = client_uid
        AND st.owner_id = auth.uid()
        
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
