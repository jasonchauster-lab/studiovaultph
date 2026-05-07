
import { createAdminClient } from './lib/supabase/server'

async function debug() {
    const adminSupabase = createAdminClient()
    const { data: studios } = await adminSupabase.from('studios').select('id, name')
    console.log('Studios:', studios)

    if (studios && studios.length > 0) {
        for (const studio of studios) {
            const { data: members } = await adminSupabase.from('studio_members').select('*, profile:profiles(full_name)').eq('studio_id', studio.id)
            console.log(`Members for ${studio.name} (${studio.id}):`, members)
        }
    }
}

debug()
