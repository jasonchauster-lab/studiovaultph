'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Ensures a customer has a membership record for a specific studio.
 * If it doesn't exist, it creates one with 0 balance.
 * Uses admin client to bypass RLS policies on customer_memberships and studio_customers.
 */
export async function ensureStudioMembership(userId: string, studioId: string) {
    const supabase = createAdminClient()

    // 1. Ensure record in customer_memberships (for wallet/billing)
    const { data, error } = await supabase
        .from('customer_memberships')
        .upsert({
            user_id: userId,
            studio_id: studioId,
            updated_at: new Date().toISOString()
        }, { 
            onConflict: 'user_id, studio_id',
            ignoreDuplicates: true 
        })
        .select()
        .single()

    if (error && error.code !== '23505') {
        console.error('[ensureStudioMembership] Error:', error)
        return { error: error.message }
    }

    // 2. Ensure record in studio_customers (for CRM visibility)
    const { error: customerError } = await supabase
        .from('studio_customers')
        .upsert({
            studio_id: studioId,
            profile_id: userId,
            created_at: new Date().toISOString()
        }, {
            onConflict: 'studio_id, profile_id',
            ignoreDuplicates: true
        })

    if (customerError && customerError.code !== '23505') {
        console.error('[ensureStudioMembership] CRM Link Error:', customerError)
    }

    return { success: true, data }
}

/**
 * Fetches the studio-specific balance for a user.
 */
export async function getStudioBalance(userId: string, studioId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('customer_memberships')
        .select('available_balance, pending_balance')
        .eq('user_id', userId)
        .eq('studio_id', studioId)
        .maybeSingle()

    if (error) {
        console.error('[getStudioBalance] Error:', error)
        return { available_balance: 0, pending_balance: 0 }
    }

    return data || { available_balance: 0, pending_balance: 0 }
}
