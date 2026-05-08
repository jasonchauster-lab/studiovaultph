
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMembers(userId) {
    console.log('--- Checking studio_members for:', userId, '---')
    const { data: members, error } = await supabase
        .from('studio_members')
        .select('*')
        .eq('profile_id', userId)
    
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Found Memberships:', members)
    }
}

checkMembers('909c5932-4410-415e-8743-26d5f3b4d8d4')
