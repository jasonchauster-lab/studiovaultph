const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditPolicies() {
    console.log('--- FINAL RLS POLICY AUDIT ---');
    const tables = ['profiles', 'admin_activity_logs', 'bookings', 'payout_requests'];

    for (const table of tables) {
        console.log(`Table: ${table}`);
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: `SELECT policyname, definition FROM pg_policies WHERE tablename = '${table}'`
        });
        if (error) {
            console.error(`Error auditing ${table}:`, error.message);
        } else {
            data.forEach(p => {
                console.log(`  Policy: ${p.policyname}`);
                console.log(`  Definition: ${p.definition}`);
                if (p.definition.includes("'admin'") && !p.definition.includes("check_is_admin")) {
                    console.warn(`  !!! WARNING: Potential recursion in ${p.policyname} !!!`);
                }
            });
        }
    }
}

auditPolicies();
