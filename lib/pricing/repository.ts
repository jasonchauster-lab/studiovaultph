import { createClient } from "@/lib/supabase/server";
import { Membership, Package } from "@/types/agency";

/**
 * Fetches a membership or package by ID.
 */
export async function fetchPricingPlan(id: string, studioId: string, type: 'membership' | 'package') {
    const supabase = await createClient();
    const table = type === 'membership' ? 'memberships' : 'packages';
    
    return await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('studio_id', studioId)
        .eq('is_deleted', false)
        .single();
}

/**
 * Fetches a promo code and performs basic status checks.
 */
export async function fetchPromoCode(code: string, studioId: string) {
    const supabase = await createClient();
    return await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('studio_id', studioId)
        .eq('is_active', true)
        .single();
}

/**
 * Fetches a referral reward.
 */
export async function fetchReferralReward(id: string, userId: string) {
    const supabase = await createClient();
    return await supabase
        .from('referral_rewards')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .eq('is_used', false)
        .single();
}

/**
 * Checks for an existing pending customer plan.
 */
export async function findPendingPlan(userId: string, studioId: string, planId: string, planType: 'membership' | 'package') {
    const supabase = await createClient();
    const planColumn = planType === 'package' ? 'package_id' : 'membership_id';
    
    return await supabase
        .from('customer_plans')
        .select('id')
        .eq('user_id', userId)
        .eq('studio_id', studioId)
        .eq(planColumn, planId)
        .eq('status', 'pending_payment')
        .maybeSingle();
}

/**
 * Saves (inserts or updates) a customer plan.
 */
export async function saveCustomerPlan(planData: any, id?: string) {
    const supabase = await createClient();
    if (id) {
        return await supabase
            .from('customer_plans')
            .update({ ...planData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
    } else {
        return await supabase
            .from('customer_plans')
            .insert(planData)
            .select()
            .single();
    }
}
