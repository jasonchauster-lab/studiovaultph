
const { createClient } = require('@supabase/supabase-js');

async function debug() {
    const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = '87cf6e4d-9057-431d-9db4-7c458c8728cb';

    // 1. Check profile creation
    const { data: profile } = await supabase.from('profiles').select('created_at, full_name').eq('id', userId).single();
    console.log('Profile created at:', profile?.created_at, 'Name:', profile?.full_name);

    // 2. Check admin_activity_logs
    // Check if the table exists first
    const { data: logs, error: lError } = await supabase.from('admin_activity_logs').select('*').eq('target_id', userId);
    if (lError) {
        console.log('admin_activity_logs error (maybe table doesnt exist):', lError.message);
    } else {
        console.log('Admin logs for user:', logs);
    }
}

debug();
