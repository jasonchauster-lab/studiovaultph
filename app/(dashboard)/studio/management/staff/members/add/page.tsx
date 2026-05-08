import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddStaffFlow from '@/components/management/AddStaffFlow'
import { getCachedStudio, getCachedOutlets } from '@/lib/studio/data'

export default async function AddStaffPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    const studio = await getCachedStudio()
    
    if (!studio) {
        return <div className="p-8 text-charcoal/60">Studio not found.</div>
    }

    const [rolesRes, outlets] = await Promise.all([
        supabase
            .from('studio_roles')
            .select('*')
            .eq('studio_id', studio.id)
            .order('name'),
        getCachedOutlets(studio.id)
    ])

    const roles = rolesRes.data || []

    return (
        <div className="max-w-7xl mx-auto py-12 px-6">
            <AddStaffFlow 
                studioId={studio.id} 
                roles={roles}
                outlets={outlets}
            />
        </div>
    )
}
