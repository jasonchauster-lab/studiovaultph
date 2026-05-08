
import { createClient } from '@/lib/supabase/server'
import { getCachedStudio } from '@/lib/studio/data'

export default async function DebugPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    const studio = await getCachedStudio()
    
    const { data: allStudios } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user?.id)

    const { data: allMembers } = await supabase
        .from('studio_members')
        .select(`
            id,
            studio_id,
            profile:profiles(email)
        `)
        .eq('studio_id', studio?.id)

    return (
        <div className="p-20 space-y-8 font-mono text-xs">
            <div>
                <h1 className="font-bold">User</h1>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
            <div>
                <h1 className="font-bold">Current Studio (Cached)</h1>
                <pre>{JSON.stringify(studio, null, 2)}</pre>
            </div>
            <div>
                <h1 className="font-bold">All Owned Studios</h1>
                <pre>{JSON.stringify(allStudios, null, 2)}</pre>
            </div>
            <div>
                <h1 className="font-bold">Members in Current Studio</h1>
                <pre>{JSON.stringify(allMembers, null, 2)}</pre>
            </div>
        </div>
    )
}
