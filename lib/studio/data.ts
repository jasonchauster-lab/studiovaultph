import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Fetches the current authenticated user.
 * Wrapped in React cache to memoize across a single request.
 */
export const getCachedUser = cache(async () => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        return user
    } catch (err) {
        console.error('[getCachedUser] Unexpected crash:', err)
        return null
    }
})

/**
 * Fetches the studio associated with the current user (owner or member).
 * Wrapped in React cache to memoize across a single request.
 * Parallelizes owner and member checks for maximum performance.
 */
export const getCachedStudio = cache(async () => {
    try {
        const supabase = await createClient()
        const user = await getCachedUser()
        if (!user) return null

        const studioFields = 'id, name, slug, logo_url, banner_url, website_config, is_public, owner_id, equipment, inventory, subscription_tier'

        // FIX PERF: Parallelize Owner and Member lookups
        const [ownerRes, memberRes] = await Promise.all([
            supabase.from('studios').select(studioFields).eq('owner_id', user.id).maybeSingle(),
            supabase.from('studios')
                .select(`${studioFields}, studio_members!inner(profile_id)`)
                .eq('studio_members.profile_id', user.id)
                .maybeSingle()
        ])

        if (ownerRes.error && ownerRes.error.code !== 'PGRST116') {
            console.error('[getCachedStudio] Owner lookup error:', ownerRes.error)
        }
        if (memberRes.error && memberRes.error.code !== 'PGRST116') {
            console.error('[getCachedStudio] Member lookup error:', memberRes.error)
        }

        const studioData = ownerRes.data || memberRes.data
        if (!studioData) return null

        return {
            ...studioData,
            id: studioData.id,
            name: studioData.name,
            slug: studioData.slug,
            logo_url: studioData.logo_url,
            banner_url: studioData.banner_url,
            website_config: studioData.website_config,
            is_public: studioData.is_public,
            owner_id: studioData.owner_id,
            equipment: studioData.equipment,
            inventory: studioData.inventory,
            subscription_tier: studioData.subscription_tier
        }
    } catch (err) {
        console.error('[getCachedStudio] Unexpected error:', err)
        return null
    }
})

/**
 * Fetches all outlets for the studio, filtered by user permissions.
 */
export const getCachedOutlets = cache(async (studioId: string, isOwner?: boolean) => {
    try {
        const supabase = await createClient()
        const user = await getCachedUser()
        if (!user) return []

        let isStudioOwner = isOwner
        if (isStudioOwner === undefined) {
            const { data: studio } = await supabase.from('studios').select('owner_id').eq('id', studioId).maybeSingle()
            isStudioOwner = studio?.owner_id === user.id
        }

        if (isStudioOwner) {
            const { data: outlets } = await supabase
                .from('outlets')
                .select('*')
                .eq('studio_id', studioId)
                .order('name', { ascending: true })
            return outlets || []
        }

        const { data: staffOutlets } = await supabase
            .from('outlets')
            .select('*, outlet_members!inner(member_id, studio_members!inner(profile_id))')
            .eq('studio_id', studioId)
            .eq('outlet_members.studio_members.profile_id', user.id)
            .order('name', { ascending: true })
            
        return staffOutlets || []
    } catch (err) {
        console.error('[getCachedOutlets] Unexpected crash:', err)
        return []
    }
})

/**
 * Fetches the user profile.
 */
export const getCachedProfile = cache(async () => {
    try {
        const supabase = await createClient()
        const user = await getCachedUser()
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, avatar_url, full_name, id, is_suspended, wallet_balance, available_balance, gov_id_expiry, bir_expiry')
            .eq('id', user.id)
            .maybeSingle()

        return profile
    } catch (err) {
        console.error('[getCachedProfile] Unexpected crash:', err)
        return null
    }
})

/**
 * Fetches all tax settings for the studio.
 */
export const getCachedStudioTaxes = cache(async (studioId: string) => {
    try {
        const supabase = await createClient()
        const { data: taxes, error } = await supabase
            .from('studio_taxes')
            .select('*')
            .eq('studio_id', studioId)
            .order('created_at', { ascending: true })
        
        if (error) {
            console.error('[getCachedStudioTaxes] Error:', error)
            return []
        }
        return taxes || []
    } catch (err) {
        console.error('[getCachedStudioTaxes] Unexpected crash:', err)
        return []
    }
})
