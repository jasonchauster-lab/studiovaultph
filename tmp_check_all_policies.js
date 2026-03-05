const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function checkAllPolicies() {
    console.log('--- Fetching all policies on profiles ---');
    const { data: policies, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';"
    });

    if (error) {
        console.error('Failed to fetch policies:', error);
    } else {
        console.log('Policies:', policies);
    }

    console.log('--- Checking if any other tables reference profiles in their RLS ---');
    const { data: otherPolicies, error: otherError } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT tablename, policyname, qual FROM pg_policies WHERE qual LIKE '%profiles%' OR with_check LIKE '%profiles%';"
    });

    if (otherError) {
        console.error('Failed to fetch other policies:', otherError);
    } else {
        console.log('Related Policies:', otherPolicies);
    }
}

checkAllPolicies();
