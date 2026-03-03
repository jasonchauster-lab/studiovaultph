
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'bookings' });

    if (error) {
        // Fallback: try querying a single row to see columns
        console.log("RPC Error, trying direct query...");
        const { data: row, error: rError } = await supabase.from('bookings').select('*').limit(1);
        if (rError) {
            console.error("Direct query error:", rError);
        } else {
            console.log("Columns:", Object.keys(row[0] || {}));
        }
    } else {
        console.log("Schema:", data);
    }
}

checkSchema();
