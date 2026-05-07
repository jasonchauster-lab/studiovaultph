import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RolesView from '@/components/management/RolesView'
import { getCachedStudio } from '@/lib/studio/data'

export default async function RolesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const studio = await getCachedStudio()
    
    if (!studio) {
        return <div className="p-8 text-charcoal/60">Studio not found.</div>
    }

    // Fetch Roles
    const { data: rolesData, error: rolesError } = await supabase
        .from('studio_roles')
        .select(`
            *,
            creator:profiles!studio_roles_created_by_fkey(full_name)
        `)
        .eq('studio_id', studio.id)

    if (rolesError) {
        console.error('Error fetching roles:', JSON.stringify(rolesError, null, 2))
    }

    // Fetch member role counts separately since there's no FK to join on directly in select()
    const { data: membersData } = await supabase
        .from('studio_members')
        .select('role')
        .eq('studio_id', studio.id)

    const roles = (rolesData || []).map(r => {
        const memberCount = (membersData || []).filter(m => m.role === r.id).length
        
        return {
            id: r.id,
            name: r.name,
            type: r.type as 'system' | 'custom',
            created_on: new Date(r.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }),
            created_by_name: r.creator?.full_name || 'System',
            user_count: memberCount
        }
    })

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <RolesView 
                studioId={studio.id}
                initialRoles={roles}
            />
        </div>
    )
}
