
import { createClient } from './lib/supabase/server'

async function debug() {
    const supabase = await createClient()
    const email = 'johnca932@gmail.com'
    
    console.log('Searching for profile:', email)
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single()
        
    if (!profile) {
        console.log('Profile not found')
        return
    }
    
    console.log('Profile found:', profile.id)
    
    const { data: members } = await supabase
        .from('studio_members')
        .select('id, studio_id, role, created_at')
        .eq('profile_id', profile.id)
        
    console.log('Member records found:', members)
    
    if (members && members.length > 0) {
        for (const m of members) {
            const { data: studio } = await supabase
                .from('studios')
                .select('id, name')
                .eq('id', m.studio_id)
                .single()
            console.log(`Studio: ${studio?.name} (${studio?.id})`)
        }
    }
}

debug()
