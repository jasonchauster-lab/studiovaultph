import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCachedUser, getCachedProfile } from '@/lib/studio/data'

export async function verifyStudioAccess(studioId: string) {
    const [user, profile] = await Promise.all([
        getCachedUser(),
        getCachedProfile()
    ])
    
    if (!user) throw new Error('Not authenticated')
    const supabase = await createClient()

    // 1. Parallel fetch of core data: Studio (ownership) and Member status
    const adminSupabase = createAdminClient()
    
    const [studioRes, memberRes] = await Promise.all([
        adminSupabase.from('studios').select('id, owner_id').eq('id', studioId.trim()).maybeSingle(),
        supabase.from('studio_members')
            .select('id, role, metadata')
            .eq('studio_id', studioId)
            .eq('profile_id', user.id)
            .maybeSingle()
    ])

    if (profile?.is_suspended) {
        throw new Error('Your account has been suspended. Please contact support.')
    }

    if (studioRes.error) {
        console.error('[verifyStudioAccess] Studio fetch error:', studioRes.error)
        throw new Error('Studio not found')
    }

    const studio = studioRes.data
    const member = memberRes.data

    // 2. Owner check (Short-circuit)
    if (studio?.owner_id === user.id) {
        return { user, isOwner: true, role: 'owner', permissions: {} }
    }

    // 3. Staff check
    if (!member) {
        throw new Error('Unauthorized: You do not have access to this studio')
    }

    // 4. Fetch Role Data (only for staff)
    const { data: roleData } = await supabase
        .from('studio_roles')
        .select('id, name, permissions')
        .eq('id', member.role)
        .maybeSingle()

    return { 
        user, 
        isOwner: false, 
        role: member.role,
        memberId: member.id,
        permissions: (roleData as any)?.permissions || {},
        metadata: (member as any).metadata || {}
    }
}
