'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function selectCmsPlanAction(planId: string, billingCycle: 'monthly' | 'annually') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // 1. Fetch Studio
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (!studio) return { error: 'Studio not found' }

    // 2. Update Plan via Admin Client to bypass RLS for sensitive billing fields
    // Note: We removed 'subscription_period' and 'origin_portal' as they don't exist in the 'studios' table schema.
    const adminSupabase = createAdminClient()
    const timestamp = new Date().toISOString()
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: studioError } = await adminSupabase
        .from('studios')
        .update({
            subscription_tier: planId,
            subscription_status: 'trialing',
            trial_ends_at: trialEndsAt,
            updated_at: timestamp
        })
        .eq('id', studio.id)

    if (studioError) {
        console.error('[selectCmsPlanAction] Error updating studio plan:', studioError)
        return { error: `Database Error: ${studioError.message} (Code: ${studioError.code})` }
    }

    // 3. Mark the User Profile as having onboarded to CMS
    const { error: profileError } = await adminSupabase
        .from('profiles')
        .update({
            origin_portal: 'cms',
            updated_at: timestamp
        })
        .eq('id', user.id)

    if (profileError) {
        console.warn('[selectCmsPlanAction] Non-fatal error updating profile origin:', profileError)
    }

    revalidatePath('/studio')
    return { success: true }
}
