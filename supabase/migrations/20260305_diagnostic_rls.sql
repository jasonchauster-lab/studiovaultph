-- Diagnostic SQL to check policies
CREATE OR REPLACE FUNCTION public.get_profiles_policies()
RETURNS TABLE (
    p_policyname text,
    p_roles text[],
    p_cmd text,
    p_qual text,
    p_with_check text
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        policyname::text, 
        roles::text[], 
        cmd::text, 
        qual::text, 
        with_check::text 
    FROM pg_policies 
    WHERE tablename = 'profiles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
