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

        const studioFields = `
            id, name, slug, owner_id, business_industry, 
            company_registered_name, company_registration_no,
            opening_time, closing_time, is_cma_enabled,
            website_config, marketplace_status, subscription_tier,
            verified, is_public, inventory, equipment, tax_inclusive,
            monthly_marketing_sent, marketing_limit_reset_at,
            whatsapp_number, show_whatsapp_button,
            business_contact_email, business_contact_number,
            address, floor_or_unit, business_country,
            enable_xendit, enable_manual_payments, manual_payment_methods,
            logo_url, banner_url
        `

        // 1. Try Owner lookup first (Most common case)
        const { data: ownerStudio, error: ownerError } = await supabase
            .from('studios')
            .select(studioFields)
            .eq('owner_id', user.id)
            .maybeSingle()

        if (ownerStudio) return ownerStudio

        if (ownerError && ownerError.code !== 'PGRST116') {
            console.error('[getCachedStudio] Owner lookup error:', ownerError)
        }

        // 2. Fallback to Staff Member lookup
        // We use a separate query to check membership to avoid complex join issues in production
        const { data: membership } = await supabase
            .from('studio_members')
            .select('studio_id')
            .eq('profile_id', user.id)
            .maybeSingle()

        if (membership?.studio_id) {
            const { data: memberStudio, error: memberError } = await supabase
                .from('studios')
                .select(studioFields)
                .eq('id', membership.studio_id)
                .maybeSingle()
            
            if (memberStudio) return memberStudio
            
            if (memberError && memberError.code !== 'PGRST116') {
                console.error('[getCachedStudio] Member studio fetch error:', memberError)
            }
        }

        return null
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

        // Fallback for Staff Members
        const { data: staffMemberships } = await supabase
            .from('studio_members')
            .select('id')
            .eq('profile_id', user.id)
            .eq('studio_id', studioId)
        
        if (staffMemberships && staffMemberships.length > 0) {
            const membershipIds = staffMemberships.map(m => m.id)
            const { data: memberOutlets } = await supabase
                .from('outlets')
                .select('*, outlet_members!inner(member_id)')
                .eq('studio_id', studioId)
                .in('outlet_members.member_id', membershipIds)
                .order('name', { ascending: true })
            
            return memberOutlets || []
        }
            
        return []
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
            .select('*')
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
