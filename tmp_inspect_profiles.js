const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function inspectTable() {
    // 1. Check columns and types
    const { data: cols, error: colError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles';"
    });
    console.log('Columns:', cols);

    // 2. Check for check constraints (especially on role)
    const { data: checks, error: checkError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass;"
    });
    console.log('Constraints:', checks);

    // 3. Check for triggers
    const { data: triggers, error: trigError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass;"
    });
    console.log('Triggers:', triggers);
}

inspectTable();
