const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAdminMetadata() {
    const adminId = '0ac887a7-c397-4529-aca6-9fb36165e3fa';
    console.log(`Syncing metadata for admin user: ${adminId}`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        adminId,
        { user_metadata: { role: 'admin' } }
    );

    if (error) {
        console.error('Error syncing metadata:', error.message);
    } else {
        console.log('SUCCESS: Admin metadata updated with role: admin');
        console.log('New Metadata:', JSON.stringify(data.user.user_metadata, null, 2));
    }
}

syncAdminMetadata();
