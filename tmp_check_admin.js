const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function checkAdmin() {
    const { data, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }

    const allUsers = data.users;
    const adminUsers = allUsers.filter(u =>
        u.role === 'service_role' ||
        u.app_metadata?.role === 'admin' ||
        u.user_metadata?.role === 'admin'
    );

    console.log('Admin Users in Auth:', adminUsers.map(u => ({ id: u.id, email: u.email })));

    // Also check profiles table for role = admin
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin');

    if (profileError) {
        console.error('Profile Error:', profileError);
    } else {
        console.log('Admin profiles in DB:', profiles);
    }
}

checkAdmin();
