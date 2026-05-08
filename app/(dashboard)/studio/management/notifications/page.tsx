import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedStudio } from '@/lib/studio/data'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
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

    // Fetch existing recipients
    const { data: recipients } = await supabase
        .from('staff_notification_recipients')
        .select(`
            id,
            profile_id,
            is_enabled,
            preferences,
            profile:profiles(id, full_name, email, avatar_url)
        `)
        .eq('studio_id', studio.id)

    // Fetch potential staff members (studio_members + owner)
    const [memberProfilesRes, rolesRes] = await Promise.all([
        supabase
            .from('studio_members')
            .select(`
                role,
                profile:profiles!studio_members_profile_id_fkey(id, full_name, email, avatar_url)
            `)
            .eq('studio_id', studio.id),
        supabase
            .from('studio_roles')
            .select('id, name')
            .eq('studio_id', studio.id)
    ])

    const rolesMap = (rolesRes.data || []).reduce((acc: any, r: any) => {
        acc[r.id] = r.name
        return acc
    }, {})

    const members = (memberProfilesRes.data || []).map((m: any) => ({
        ...m.profile,
        role: rolesMap[m.role] || 'Staff'
    }))

    // Add owner if not already in members
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', studio.owner_id)
        .single()

    const allStaff = [...members]
    if (ownerProfile && !members.some(m => m.id === ownerProfile.id)) {
        allStaff.push({
            ...ownerProfile,
            role: 'owner'
        })
    }

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <NotificationsClient 
                studioId={studio.id}
                initialRecipients={recipients || []}
                allStaff={allStaff}
            />
        </div>
    )
}
