const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function checkPolicies() {
    // Try to query pg_policies using service role
    // Service role should be able to see this if we use a helper RPC or if we can query it directly (rare)
    // Most Supabase setups have an 'exec_sql' or similar for admins.

    // Let's try to find potential RPCs first
    const { data: rpcs, error: rpcError } = await supabase.rpc('get_my_functions'); // common custom RPC name
    if (rpcs) console.log('Found RPCs:', rpcs);

    // If no RPC, let's try to inspect the structure of policies by testing different queries
    // But wait, the user says the button doesn't work.

    // Maybe the 'selectRole' action is being blocked?

    const { data, error } = await supabase.from('profiles').select('id, role').eq('email', 'clubpilatesph@gmail.com');
    console.log('Service Role check:', { data, error });
}

checkPolicies();
