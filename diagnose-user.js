
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose(userId) {
    console.log('--- Diagnosing User:', userId, '---')

    // 1. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    
    if (profileError) {
        console.error('Profile Error:', profileError)
    } else {
        console.log('Profile:', {
            role: profile.role,
            origin_portal: profile.origin_portal,
            email: profile.email
        })
    }

    // 2. Check Studio
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle()
    
    if (studioError) {
        console.error('Studio Error:', studioError)
    } else {
        console.log('Studio:', studio ? {
            id: studio.id,
            name: studio.name,
            subscription_tier: studio.subscription_tier,
            is_public: studio.is_public
        } : 'None')
    }

    // 3. Check Auth Metadata
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError) {
        console.error('Auth Error:', authError)
    } else {
        console.log('Auth Metadata:', user.user_metadata)
    }
}

const userId = 'b675f782-b5df-42f2-8958-8b770f3f2d25'
diagnose(userId)
