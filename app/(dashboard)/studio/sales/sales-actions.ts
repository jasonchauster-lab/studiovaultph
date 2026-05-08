'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cancelCustomerPlan } from './package-actions'
import { cancelBookingByStudio } from '../booking-actions'

export async function recordManualSale(formData: {
    customerId: string;
    planType: 'package' | 'membership';
    planId: string;
    amount: number;
    paymentMethod: string;
    notes?: string;
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    // 1. Verify studio ownership
    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!studio) return { error: 'Studio not found' }

    // 2. Fetch Plan Details
    const table = formData.planType === 'package' ? 'packages' : 'memberships'
    const { data: plan, error: planError } = await supabase
        .from(table)
        .select('*')
        .eq('id', formData.planId)
        .single()

    if (planError || !plan) return { error: 'Plan not found' }

    // 3. Calculate Expiry
    let expiresAt = null
    if (plan.validity_days) {
        const date = new Date()
        date.setDate(date.getDate() + plan.validity_days)
        expiresAt = date.toISOString()
    }

    // 4. Create Customer Plan
    const { data: customerPlan, error: insertError } = await supabase
        .from('customer_plans')
        .insert({
            user_id: formData.customerId,
            studio_id: studio.id,
            plan_type: formData.planType,
            package_id: formData.planType === 'package' ? formData.planId : null,
            membership_id: formData.planType === 'membership' ? formData.planId : null,
            remaining_credits: plan.credits || null, // NULL for unlimited memberships
            expires_at: expiresAt,
            status: 'active',
            payment_method: 'manual',
            total_amount: formData.amount,
            verified_by: user.id,
            verified_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (insertError) {
        console.error('Manual sale error:', insertError)
        return { error: insertError.message }
    }

    // 5. Log Audit Trail
    await supabase.from('audit_logs').insert({
        studio_id: studio.id,
        actor_id: user.id,
        action: 'RECORD_MANUAL_SALE',
        entity_type: 'customer_plan',
        entity_id: customerPlan.id,
        metadata: {
            plan_type: formData.planType,
            amount: formData.amount,
            customer_id: formData.customerId
        }
    })

    revalidatePath('/studio/sales')
    revalidatePath('/studio/customers/' + formData.customerId)
    
    return { success: true, planId: customerPlan.id }
}

export async function getCustomersForSale(query: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

    if (error) return []
    return data
}

export async function refundTransaction(transaction: {
    type: string;
    reference_id: string;
    reason?: string;
}) {
    let result: any = null;
    if (transaction.type === 'Booking') {
        result = await cancelBookingByStudio(transaction.reference_id, transaction.reason || 'Requested by studio owner');
    } else if (transaction.type === 'Sale') {
        result = await cancelCustomerPlan(transaction.reference_id, transaction.reason || 'Requested by studio owner');
    }
    
    if (result && result.success) {
        // Log Audit Trail
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser();
    const user = data?.user
        const { data: studio } = await supabase.from('studios').select('id').eq('owner_id', user?.id).single()
        
        if (studio && user) {
            await supabase.from('audit_logs').insert({
                studio_id: studio.id,
                actor_id: user.id,
                action: 'REFUND_TRANSACTION',
                entity_type: transaction.type === 'Booking' ? 'booking' : 'customer_plan',
                entity_id: transaction.reference_id as any,
                metadata: {
                    reason: transaction.reason,
                    type: transaction.type
                }
            })
        }
    }

    return result || { error: 'This transaction type cannot be refunded.' }
}
