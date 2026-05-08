'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createXenditRefund } from '@/lib/xendit'
import { sendEmail } from '@/lib/email'
import PurchaseConfirmationEmail from '@/components/emails/PurchaseConfirmationEmail'
import { getStudioBranding } from '@/lib/studio/branding'
import { format } from 'date-fns'

export async function approveCustomerPlan(planId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch Plan to verify ownership of the studio
    const { data: plan, error: fetchError } = await supabase
        .from('customer_plans')
        .select('*, studios!inner(owner_id)')
        .eq('id', planId)
        .single();

    if (fetchError || !plan) return { error: 'Plan not found.' };
    if ((plan.studios as any).owner_id !== user.id) return { error: 'Unauthorized.' };

    // 2. Call the RPC to activate with verifier audit
    const { data: result, error: rpcError } = await supabase.rpc('activate_customer_plan', {
        p_plan_id: planId,
        p_verified_by: user.id
    });

    if (rpcError) return { error: rpcError.message };

    // 3. Send Confirmation Email
    try {
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', plan.user_id).single();
        const { data: studio } = await supabase.from('studios').select('name').eq('id', plan.studio_id).single();
        const branding = await getStudioBranding(plan.studio_id);

        if (profile?.email && studio) {
            const { data: activatedPlan } = await supabase
                .from('customer_plans')
                .select('*, packages(name), memberships(name)')
                .eq('id', planId)
                .single();

            const planName = activatedPlan?.packages?.name || activatedPlan?.memberships?.name || 'Package';

            await sendEmail({
                to: profile.email,
                subject: `Purchase Confirmed: ${planName}`,
                fromName: branding?.fromName,
                react: PurchaseConfirmationEmail({
                    recipientName: profile.full_name || 'Valued Client',
                    studioName: studio.name,
                    planName,
                    amount: plan.total_amount,
                    expiryDate: activatedPlan?.expires_at ? format(new Date(activatedPlan.expires_at), 'MMMM dd, yyyy') : undefined,
                    studioLogo: branding?.logoUrl,
                    primaryColor: branding?.primaryColor
                })
            });
        }
    } catch (emailErr) {
        console.error('Failed to send purchase confirmation email:', emailErr);
    }

    revalidatePath('/studio/sales')
    revalidatePath('/studio/sales/approvals')
    revalidatePath('/customer')
    return { success: true };
}

export async function cancelCustomerPlan(planId: string, reason?: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    // 1. Fetch Plan to verify ownership and check for Xendit payment
    const { data: plan, error: fetchError } = await supabase
        .from('customer_plans')
        .select('*, studios!inner(owner_id)')
        .eq('id', planId)
        .single();

    if (fetchError || !plan) return { error: 'Plan not found.' };
    if ((plan.studios as any).owner_id !== user.id) return { error: 'Unauthorized.' };

    // 2. Perform Refund if it was a Xendit payment
    let refundResult = null;
    if (plan.payment_method === 'xendit' && plan.xendit_invoice_id) {
        try {
            refundResult = await createXenditRefund({
                studioId: plan.studio_id,
                paymentId: plan.xendit_invoice_id,
                amount: plan.total_amount,
                reason: reason || 'Plan cancelled by studio owner'
            });
        } catch (err: any) {
            console.error('[cancelCustomerPlan] Xendit Refund Failed:', err);
            if (err.message === 'REFUND_PERMISSION_DENIED') {
                return { error: 'Automated refund failed: Your Xendit API key lacks refund permissions. Please refund manually in Xendit.' };
            }
            // If it's just already refunded or another error, we might still want to proceed with DB cancellation 
            // but let's be safe and return error for now to let owner know.
            return { error: `Automated refund failed: ${err.message}` };
        }
    }

    const { error } = await supabase
        .from('customer_plans')
        .update({ 
            status: 'cancelled', 
            rejection_reason: reason || null,
            verified_by: user.id,
            verified_at: new Date().toISOString()
        })
        .eq('id', planId);

    if (error) return { error: error.message };

    revalidatePath('/studio/sales')
    revalidatePath('/studio/sales/approvals')
    return { success: true, refunded: !!refundResult };
}
