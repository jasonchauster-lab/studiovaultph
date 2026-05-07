'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dispatchNotification } from '@/lib/studio/notifications'
import { createXenditInvoice } from '@/lib/xendit'
import { headers } from 'next/headers'
import { fetchPricingPlan, fetchPromoCode, fetchReferralReward, findPendingPlan, saveCustomerPlan } from '@/lib/pricing/repository'
import { calculateDiscount, calculateExpiration, calculateFinalPrice } from '@/lib/pricing/calculations'

export async function validatePromoCode(code: string, studioId: string, packageId: string) {
    const { data: promo, error } = await fetchPromoCode(code, studioId)

    if (error || !promo) {
        return { success: false, error: 'Invalid or inactive promo code.' }
    }

    // 1. Check Dates
    const now = new Date()
    if (promo.starts_at && new Date(promo.starts_at) > now) {
        return { success: false, error: 'Promo code is not yet active.' }
    }
    if (promo.expires_at && new Date(promo.expires_at) < now) {
        return { success: false, error: 'Promo code has expired.' }
    }

    // 2. Check Usage Limit
    if (promo.usage_limit && promo.current_usage >= promo.usage_limit) {
        return { success: false, error: 'Promo code usage limit reached.' }
    }

    // 3. Check Applicability
    if (promo.applies_to_type === 'specific_plans') {
        const applicableIds = promo.applicable_ids || []
        if (!applicableIds.includes(packageId)) {
            return { success: false, error: 'This code is not applicable to the selected package.' }
        }
    }

    return { 
        success: true, 
        promo: {
            id: promo.id,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value
        } 
    }
}

export async function purchasePlan(formData: {
    planId: string;
    planType: 'package' | 'membership';
    studioId: string;
    paymentMethod: 'xendit' | 'manual';
    promoCodeId?: string;
    referralRewardId?: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch all necessary data in parallel
    const [planResult, promoResult, rewardResult, existingPlanResult] = await Promise.all([
        fetchPricingPlan(formData.planId, formData.studioId, formData.planType),
        formData.promoCodeId 
            ? validatePromoCode(formData.promoCodeId, formData.studioId, formData.planId)
            : Promise.resolve({ success: false, promo: null } as any),
        formData.referralRewardId
            ? fetchReferralReward(formData.referralRewardId, user.id)
            : Promise.resolve({ data: null }),
        findPendingPlan(user.id, formData.studioId, formData.planId, formData.planType)
    ]);

    const plan = planResult.data;
    if (planResult.error || !plan) {
        return { error: `${formData.planType === 'package' ? 'Package' : 'Membership'} not found or unavailable` };
    }

    // 2. Apply Domain Logic
    let discounts: number[] = [];
    
    if (promoResult.success && promoResult.promo) {
        discounts.push(calculateDiscount(plan.price, promoResult.promo));
    }

    const reward = rewardResult.data;
    if (reward) {
        const applicableIds = reward.applicable_item_ids || [];
        if (applicableIds.length === 0 || applicableIds.includes(formData.planId)) {
            discounts.push(calculateDiscount(plan.price, reward));
        }
    }

    const finalPaidAmount = calculateFinalPrice(plan.price, discounts);
    const expiresAt = calculateExpiration(plan.validity_days, plan.activation_type || 'purchase');

    // 3. Persist Plan
    const planData = {
        user_id: user.id,
        studio_id: formData.studioId,
        [formData.planType === 'package' ? 'package_id' : 'membership_id']: formData.planId,
        plan_type: formData.planType,
        remaining_credits: plan.credits,
        expires_at: expiresAt,
        status: finalPaidAmount === 0 ? 'active' : 'pending_payment',
        payment_method: formData.paymentMethod,
        total_amount: finalPaidAmount,
        promo_code_id: formData.promoCodeId || null
    };

    const { data: customerPlan, error: saveError } = await saveCustomerPlan(planData, existingPlanResult.data?.id);

    if (saveError || !customerPlan) {
        console.error('[purchasePlan] Save Error:', saveError);
        return { error: 'Failed to initiate purchase.' };
    }

    let checkoutUrl = null;

    // 4. Handle External Integrations (Xendit)
    if (formData.paymentMethod === 'xendit' && finalPaidAmount > 0) {
        try {
            const headerList = await headers();
            const host = headerList.get('host');
            const protocol = host?.includes('localhost') ? 'http' : 'https';
            const baseUrl = host ? `${protocol}://${host}` : 'https://studiovaultph.com';

            const { data: studio } = await supabase.from('studios').select('name').eq('id', formData.studioId).single();

            const invoice = await createXenditInvoice({
                studioId: formData.studioId,
                externalId: `plan_${customerPlan.id}_${Date.now()}`,
                amount: finalPaidAmount,
                description: `Purchase of ${plan.name} at ${studio?.name || 'Studio'}`,
                payerEmail: user.email || '',
                successUrl: `${baseUrl}/customer/payment-plans/${customerPlan.id}`,
                failureUrl: `${baseUrl}/customer/payment-plans/${customerPlan.id}`
            });

            await saveCustomerPlan({
                xendit_invoice_id: invoice.id,
                xendit_checkout_url: invoice.invoice_url
            }, customerPlan.id);

            checkoutUrl = invoice.invoice_url;
        } catch (err) {
            console.error('[purchasePlan] Xendit Failed:', err);
        }
    }

    // 5. Post-purchase side effects
    if (formData.referralRewardId && (finalPaidAmount === 0 || (reward && calculateDiscount(plan.price, reward) > 0))) {
        await supabase
            .from('referral_rewards')
            .update({ is_used: true, used_at: new Date().toISOString(), used_in_plan_id: customerPlan.id })
            .eq('id', formData.referralRewardId);
    }

    if (formData.promoCodeId && promoResult.success && promoResult.promo) {
        await supabase.rpc('increment_promo_usage', { p_code_id: formData.promoCodeId });
    }

    revalidatePath('/customer')
    return { success: true, planId: customerPlan.id, checkoutUrl };
}

export async function uploadPlanPaymentProof(planId: string, proofUrl: string, promoCodeId?: string, totalAmount?: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const updateData: any = {
        payment_proof_url: proofUrl,
        payment_method: 'manual', 
        updated_at: new Date().toISOString()
    }

    if (promoCodeId) updateData.promo_code_id = promoCodeId
    if (totalAmount !== undefined) updateData.total_amount = totalAmount

    const { error } = await supabase.from('customer_plans').update(updateData).eq('id', planId).eq('user_id', user.id);

    if (error) return { error: 'Failed to upload proof.' };

    // Increment usage if promo was used
    if (promoCodeId) {
        await supabase.rpc('increment_promo_usage', { p_code_id: promoCodeId });
    }

    // Fetch plan details for the notification
    const { data: plan } = await supabase
        .from('customer_plans')
        .select('*, profiles!user_id(full_name), packages(name), memberships(name)')
        .eq('id', planId)
        .single()

    if (plan) {
        const planName = plan.packages?.name || plan.memberships?.name || 'Package'
        await dispatchNotification({
            studioId: plan.studio_id,
            category: 'payments',
            event: 'payment_proof_uploaded',
            title: 'Payment Proof Uploaded',
            description: `${plan.profiles?.full_name} uploaded proof of payment for ${planName}.`,
            link: `/studio/sales/approvals`,
            metadata: { planId }
        })
    }

    revalidatePath('/customer')
    return { success: true };
}

export async function getActivePlans(studioId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('customer_plans')
        .select(`
            *,
            packages(name, applicable_service_ids, applicable_outlet_ids),
            memberships(name, applicable_service_ids, applicable_outlet_ids)
        `)
        .eq('user_id', user.id)
        .eq('studio_id', studioId)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    return data || [];
}
