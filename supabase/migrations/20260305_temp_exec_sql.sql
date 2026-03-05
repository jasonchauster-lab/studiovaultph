-- Create a temporary exec_sql function to help with diagnostics
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
