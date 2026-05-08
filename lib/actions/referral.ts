'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Fetches the referral configuration for a specific studio.
 */
export async function getStudioReferralConfig(studioId: string) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('studio_referral_configs')
        .select('*')
        .eq('studio_id', studioId)
        .maybeSingle()

    if (error) {
        console.error('[getStudioReferralConfig] Error:', error)
        return null
    }

    return data
}

/**
 * Updates or creates the referral configuration for a studio.
 */
export async function updateStudioReferralConfig(studioId: string, payload: any) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    // Verify ownership
    const { data: studio } = await supabase
        .from('studios')
        .select('owner_id')
        .eq('id', studioId)
        .single()

    if (studio?.owner_id !== user.id) {
        return { error: 'Unauthorized' }
    }

    const { error } = await supabase
        .from('studio_referral_configs')
        .upsert({
            studio_id: studioId,
            ...payload,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('[updateStudioReferralConfig] Error:', error)
        return { error: error.message }
    }

    revalidatePath('/studio/referrals')
    return { success: true }
}

/**
 * Records a referral attempt when a user visits a studio site with ?ref=...
 * This is called from the storefront layout or middleware.
 */
export async function trackReferralVisit(studioId: string, referralCode: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    
    // We only track attribution for logged-out / signing up users
    // If they already signed up, we link them later.
    // For now, we can store the attribution in a cookie or session, 
    // but the actual referral record is created upon signup.
    return { success: true }
}

/**
 * Creates the referral link between a referrer and a newly signed-up user.
 */
export async function linkReferral(studioId: string, referredUserId: string, referralCode: string) {
    const supabase = await createClient()

    // 1. Find the referrer by code
    const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

    if (referrerError || !referrer) return { error: 'Referrer not found' }
    if (referrer.id === referredUserId) return { error: 'Self-referral not allowed' }

    // 2. Check if studio referral is enabled
    const config = await getStudioReferralConfig(studioId)
    if (!config?.is_enabled) return { error: 'Referral program disabled' }

    // 3. Create the referral record
    const { error: linkError } = await supabase
        .from('referrals')
        .insert({
            referrer_id: referrer.id,
            referred_id: referredUserId,
            studio_id: studioId,
            status: 'pending'
        })

    if (linkError) {
        console.error('[linkReferral] Error:', linkError)
        return { error: linkError.message }
    }

    return { success: true }
}

/**
 * Finalizes a referral and grants a reward to the referrer.
 * Usually called when the referred user completes their first booking.
 */
export async function fulfillStudioReferral(referredUserId: string, studioId: string) {
    const supabase = await createClient()

    // 1. Atomic check and lock: Update status to 'rewarded' only if it's currently 'pending'
    // This prevents double-claiming if multiple fulfillment requests arrive simultaneously.
    const { data: referral, error: updateError } = await supabase
        .from('referrals')
        .update({ status: 'rewarded' })
        .eq('referred_id', referredUserId)
        .eq('studio_id', studioId)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle()

    if (updateError || !referral) {
        if (updateError) console.error('[fulfillStudioReferral] Atomic update error:', updateError)
        return // Already processed or not found
    }

    // 2. Check if it's the user's first COMPLETED booking at this studio
    const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', referredUserId)
        .eq('studio_id', studioId)
        .eq('status', 'completed')

    // If count is 1, it means the booking that triggered this is their first one.
    if (count !== 1) return

    // 3. Get the studio's reward config
    const config = await getStudioReferralConfig(studioId)
    if (!config || !config.is_enabled) return

    // 4. Grant the reward to the referrer
    if (config.reward_discount_type === 'fixed_amount') {
        // If it's a fixed amount, we credit it directly to their Studio Wallet (Partitioned)
        const { error: walletError } = await supabase.rpc('increment_studio_available_balance', {
            p_user_id: referral.referrer_id,
            p_studio_id: studioId,
            p_amount: config.reward_discount_value
        })

        if (walletError) {
            console.error('[fulfillStudioReferral] Wallet Credit Error:', walletError)
            // We continue anyway so they at least get the reward record, 
            // but we might want to handle this better in production.
        } else {
            // Log the transaction
            await supabase.from('studio_wallet_transactions').insert({
                user_id: referral.referrer_id,
                studio_id: studioId,
                amount: config.reward_discount_value,
                type: 'referral',
                description: `Reward for referring ${referral.id}`
            })
        }
    }

    // 4.1 Create the reward record for history/vouchers
    const { error: rewardError } = await supabase
        .from('referral_rewards')
        .insert({
            user_id: referral.referrer_id,
            studio_id: studioId,
            referral_id: referral.id,
            discount_type: config.reward_discount_type,
            discount_value: config.reward_discount_value,
            is_used: config.reward_discount_type === 'fixed_amount', // Mark as "used" if it was already credited to wallet
            applicable_item_ids: [
                ...(config.applicable_package_ids || []),
                ...(config.applicable_membership_ids || [])
            ]
        })

    if (rewardError) {
        console.error('[fulfillStudioReferral] Reward Record Error:', rewardError)
        return
    }

    // Referral status was updated atomically at the beginning of this function.
    return { success: true }
}

/**
 * Fetches referral statistics for the studio owner dashboard.
 */
export async function getStudioReferralStats(studioId: string) {
    const supabase = await createClient()
    
    const [
        { count: totalReferrals },
        { count: rewardedReferrals },
        { data: recentReferrals, error: recentError }
    ] = await Promise.all([
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('studio_id', studioId),
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('studio_id', studioId).eq('status', 'rewarded'),
        supabase.from('referrals')
            .select('*, referred:profiles!referred_id(full_name, email)')
            .eq('studio_id', studioId)
            .order('created_at', { ascending: false })
            .limit(10)
    ])

    return {
        total: totalReferrals || 0,
        rewarded: rewardedReferrals || 0,
        recent: recentReferrals || []
    }
}

/**
 * Fetches referrals made by a specific student for a specific studio.
 */
export async function getStudentReferralStats(userId: string, studioId: string) {
    const supabase = await createClient()

    const [
        { count: total },
        { data: rewards },
        { data: referrals }
    ] = await Promise.all([
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('studio_id', studioId),
        supabase.from('referral_rewards').select('*').eq('user_id', userId).eq('studio_id', studioId),
        supabase.from('referrals')
            .select('*, referred:profiles!referred_id(full_name)')
            .eq('referrer_id', userId)
            .eq('studio_id', studioId)
            .order('created_at', { ascending: false })
    ])

    return {
        total: total || 0,
        earned: rewards?.length || 0,
        used: (rewards || []).filter(r => r.is_used).length,
        pending: (rewards || []).filter(r => !r.is_used).length,
        referrals: referrals || [],
        rewards: rewards || []
    }
}
