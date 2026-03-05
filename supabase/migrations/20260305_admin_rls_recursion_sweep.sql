-- COMPREHENSIVE RLS RECURSION SWEEP (PHASE 2)
-- replaces direct recursive 'role = admin' checks with the safe check_is_admin() function.

-- 1. Ensure the helper function exists and is robust
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. FIX ADMIN ACTIVITY LOGS
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can view all activity logs" 
    ON public.admin_activity_logs FOR SELECT 
    USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can insert activity logs" 
    ON public.admin_activity_logs FOR INSERT 
    WITH CHECK (public.check_is_admin());

-- 3. FIX SUPPORT TICKETS
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (public.check_is_admin());

-- 4. FIX SUPPORT MESSAGES
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages"
ON public.support_messages FOR SELECT
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can insert messages" ON public.support_messages;
CREATE POLICY "Admins can insert messages"
ON public.support_messages FOR INSERT
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can update messages" ON public.support_messages;
CREATE POLICY "Admins can update messages"
ON public.support_messages FOR UPDATE
USING (public.check_is_admin());

-- 5. ENSURE ADMIN ACCESS TO STUDIOS
-- Studio owners already have manage access, but admins need to see all for verification
DROP POLICY IF EXISTS "Admins can view all studios" ON public.studios;
CREATE POLICY "Admins can view all studios"
    ON public.studios FOR SELECT
    TO authenticated
    USING (public.check_is_admin());

-- 6. ENSURE ADMIN ACCESS TO CERTIFICATIONS
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
CREATE POLICY "Admins can view all certifications"
    ON public.certifications FOR SELECT
    TO authenticated
    USING (public.check_is_admin());
