
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findUser(email) {
    console.log('--- Finding User:', email, '---')
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
    
    if (error) {
        console.error('Error:', error)
    } else if (profile) {
        console.log('Found Profile:', profile)
        
        // Also check studio
        const { data: studio, error: studioError } = await supabase
            .from('studios')
            .select('*')
            .eq('owner_id', profile.id)
            .maybeSingle()
        
        if (studioError) {
            console.error('Studio Error:', studioError)
        } else {
            console.log('Studio:', studio)
        }
    } else {
        console.log('User not found in profiles table.')
    }
}

findUser('clubpilatesph@gmail.com')
