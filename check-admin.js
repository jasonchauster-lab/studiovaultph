
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAdmin(userId) {
    console.log('--- Checking Admin:', userId, '---')
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
    if (error) {
        console.error('Error:', error)
        return
    }
    console.log('User Metadata:', user.user_metadata)
}

checkAdmin('0ac887a7-c397-4529-aca6-9fb36165e3fa')
