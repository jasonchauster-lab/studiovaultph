-- Fix to allow anyone authenticated to view public certifications
-- Required for discovery page viewing and client dashboard, as previous RLS changes accidentally removed the global SELECT permission.

DROP POLICY IF EXISTS "Public can view all certifications" ON public.certifications;
CREATE POLICY "Public can view all certifications" ON public.certifications
    FOR SELECT TO authenticated
    USING (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
