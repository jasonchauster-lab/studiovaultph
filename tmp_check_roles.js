const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'
);

async function checkRoles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    const roleCounts = {};
    data.forEach(p => {
        roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    });

    console.log('Role counts in database:', roleCounts);
}

checkRoles();
