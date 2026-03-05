const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function findUser() {
    const targetEmail = 'clubpilatesph@gmail.com';

    // 1. Find in Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }

    const user = users.find(u => u.email === targetEmail);
    if (!user) {
        console.log(`User ${targetEmail} not found in Auth.`);
        return;
    }

    console.log(`Auth User found: ID=${user.id}, Email=${user.email}, Last Login=${user.last_sign_in_at}`);

    // 2. Find in Profiles
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Profile Error:', profileError);
    } else {
        console.log('Profile found:', profile);
    }
}

findUser();
