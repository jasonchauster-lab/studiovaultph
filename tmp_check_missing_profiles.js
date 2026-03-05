const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function checkMissingProfiles() {
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error(authError);
        return;
    }

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id');

    if (profileError) {
        console.error(profileError);
        return;
    }

    const profileIds = new Set(profiles.map(p => p.id));
    const missing = users.filter(u => !profileIds.has(u.id));

    console.log('Users missing a profile:', missing.map(u => ({ id: u.id, email: u.email })));
}

checkMissingProfiles();
