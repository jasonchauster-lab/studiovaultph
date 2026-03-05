const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function checkRLS() {
    const { data: policies, error: polError } = await supabase
        .rpc('get_policies_for_table', { table_name: 'profiles' });

    if (polError) {
        // If RPC doesn't exist, try querying pg_policies directly via a raw SQL-like RPC if available, 
        // or just try to read a profile as a non-owner (testing anonymously)
        console.log('RPC get_policies_for_table not found, trying fallback check...');

        // Fallback: Check if RLS is enabled
        const { data: rlsStatus, error: rlsError } = await supabase
            .rpc('check_rls_enabled', { p_table_name: 'profiles' });

        if (rlsError) {
            console.log('Could not check RLS via RPC. Running manual test query.');
            const { data, error } = await supabase.from('profiles').select('id').limit(1);
            console.log('Anon profile read result:', { data, error });
        } else {
            console.log('RLS Status:', rlsStatus);
        }
        return;
    }

    console.log('Policies for profiles:', policies);
}

// Since I don't know the RPCs, I'll just try to query pg_policies using the service role via a custom RPC if it exists, 
// or I can't.
// Let's just try to read ALL profiles (service role should bypass RLS anyway).
// The issue isn't whether I can read, but whether the AUTH user can read.

async function testAuthRead() {
    // I can't easily masquerade as a user here without their token.
    // But I can check the database to see if the policies EXIST in pg_policies.

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'profiles';"
    });

    if (error) {
        console.error('exec_sql failed:', error);
        return;
    }

    console.log('Active policies on profiles:', data);
}

testAuthRead();
