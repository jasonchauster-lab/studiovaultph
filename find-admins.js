
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findAdmins() {
    console.log('--- Searching for Admins ---')
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin')
    
    if (error) {
        console.error('Error:', error)
        return
    }

    if (profiles.length === 0) {
        console.log('No admins found in profiles table.')
    } else {
        profiles.forEach(p => console.log(`ID: ${p.id} | Email: ${p.email} | Role: ${p.role}`))
    }
}

findAdmins()
