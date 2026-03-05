const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUser() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }

    // Assuming the user is the one with the most recent login or just list some
    console.log('Recent Users:');
    users.slice(0, 5).forEach(u => {
        console.log(`Email: ${u.email}, ID: ${u.id}, Role: ${u.role}`);
    });

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (profileError) {
        console.error('Profile Error:', profileError);
        return;
    }

    console.log('Recent Profiles:');
    profiles.forEach(p => {
        console.log(`ID: ${p.id}, Role: ${p.role}, Full Name: ${p.full_name}`);
    });
}

checkUser();
