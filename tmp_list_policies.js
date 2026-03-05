const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function listPolicies() {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' OR schemaname = 'storage'"
    });

    if (error) {
        console.error('Error fetching policies:', error);
        return;
    }

    console.log('Active Policies:');
    data.forEach(p => {
        console.log(`- [${p.tablename}] ${p.policyname} (${p.cmd})`);
        console.log(`  QUAL: ${p.qual}`);
        if (p.with_check) console.log(`  CHECK: ${p.with_check}`);
    });
}

listPolicies();
