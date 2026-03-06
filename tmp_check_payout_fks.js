const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFKs() {
    console.log('--- CHECKING FOREIGN KEYS FOR PAYOUT_REQUESTS ---');
    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
            SELECT
                conname AS constraint_name,
                a.attname AS column_name,
                confrelid::regclass AS foreign_table,
                af.attname AS foreign_column
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
            JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
            WHERE c.conrelid = 'payout_requests'::regclass AND c.contype = 'f';
        `
    });
    if (error) console.error(error);
    else console.table(data);
}

checkFKs();
