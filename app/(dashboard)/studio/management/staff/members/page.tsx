import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffManagementView from '@/components/management/StaffManagementView'
import { getCachedStudio, getCachedOutlets } from '@/lib/studio/data'

export default async function StaffMembersPage() {
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

    let members: any[] = []
    let outlets: any[] = []
    let roles: any[] = []

    try {
        const [membersRes, rolesRes, outletsRes] = await Promise.all([
            supabase.from('studio_members').select('*').eq('studio_id', studio.id),
            supabase.from('studio_roles').select('*').eq('studio_id', studio.id),
            getCachedOutlets(studio.id).catch(() => [])
        ])

        const rawMembers = membersRes.data || []
        roles = rolesRes.data || []
        outlets = (Array.isArray(outletsRes) ? outletsRes : [])

        // Fetch profiles for these members
        const profileIds = rawMembers.map(m => m.profile_id).filter(Boolean)
        const invitedByIds = rawMembers.map(m => m.invited_by_id).filter(Boolean)
        const allProfileIds = Array.from(new Set([...profileIds, ...invitedByIds]))

        const { data: profilesData } = allProfileIds.length > 0 
            ? await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', allProfileIds)
            : { data: [] }

        const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p
            return acc
        }, {})

        const rolesMap = roles.reduce((acc: any, r: any) => {
            acc[r.id] = r.name
            return acc
        }, {})

        members = rawMembers.map((m: any) => ({
            ...m,
            profile: profilesMap[m.profile_id] || { full_name: 'Unknown', email: 'No email', avatar_url: '' },
            invited_by: m.invited_by_id ? { full_name: profilesMap[m.invited_by_id]?.full_name || 'System' } : { full_name: 'System' },
            role: rolesMap[m.role] || m.role
        }))
    } catch (err) {
        console.error('CRITICAL PAGE ERROR:', err)
    }
    
    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <StaffManagementView 
                studio={studio}
                initialMembers={members}
                outlets={outlets}
                roles={roles}
            />
        </div>
    )
}
