import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffManagementView from '@/components/management/StaffManagementView'

type Params = Promise<{ outletId: string }>

export default async function StaffMembersPage(props: {
    params: Params
}) {
    const params = await props.params
    const outletId = params.outletId
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Studio & Tier
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('id, name, subscription_tier')
        .eq('owner_id', user.id)
        .single()

    if (studioError || !studio) {
        return <div className="p-8 text-charcoal/60">Studio not found.</div>
    }

    // 2. Fetch Members with their location assignments
    const [membersRes, rolesRes, outletsRes] = await Promise.all([
        supabase
            .from('studio_members')
            .select(`
                id,
                role,
                created_at,
                profile:profiles!studio_members_profile_id_fkey(id, full_name, email, avatar_url),
                invited_by:profiles!studio_members_invited_by_id_fkey(full_name),
                outlet_members(id, outlet_id)
            `)
            .eq('studio_id', studio.id),
        supabase
            .from('studio_roles')
            .select('id, name')
            .eq('studio_id', studio.id),
        supabase
            .from('outlets')
            .select('*')
            .eq('studio_id', studio.id)
    ])

    const rolesMap = (rolesRes.data || []).reduce((acc: any, r: any) => {
        acc[r.id] = r.name
        return acc
    }, {})

    const members = (membersRes.data || []).map((m: any) => ({
        ...m,
        role: rolesMap[m.role] || m.role
    }))

    const outlets = outletsRes.data || []

    const isPro = studio.subscription_tier !== 'starter' && !!studio.subscription_tier

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <StaffManagementView 
                studio={studio}
                initialMembers={members as any || []}
                outlets={outlets || []}
                roles={rolesRes.data || []}
            />
        </div>
    )
}
