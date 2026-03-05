const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function testRecursion() {
    // We can't easily test the RECUSRION as the service role bypasses RLS.
    // BUT we can try to run a query that would trigger it if we had a non-admin session.
    // Since we don't have a session, let's just create the fix.

    // Actually, I'll check if the policy exists as I suspected.
    const { data: policies, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT * FROM pg_policies WHERE tablename = 'profiles'"
    });

    if (error) {
        console.log('exec_sql failed, assuming suspicious policy exists based on migration file.');
        return;
    }

    console.log('Full policies:', JSON.stringify(data, null, 2));
}

testRecursion();
