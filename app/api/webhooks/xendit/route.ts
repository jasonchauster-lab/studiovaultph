import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import PurchaseConfirmationEmail from '@/components/emails/PurchaseConfirmationEmail'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import { getStudioBranding } from '@/lib/studio/branding'
import { format } from 'date-fns'
import { dispatchNotification } from '@/lib/studio/notifications'

/**
 * Xendit Webhook Handler (Hardened Phase 14)
 * 
 * Features:
 * 1. Atomic Status Management.
 * 2. Idempotency handling.
 * 3. Late Payment Alerts for Studio Owners.
 */

export async function POST(req: Request) {
    const body = await req.json()
    const callbackToken = req.headers.get('x-callback-token')

    if (!callbackToken) {
        return NextResponse.json({ error: 'Missing callback token' }, { status: 401 })
    }

    const { external_id, status, id: invoiceId } = body
    if (!external_id) {
        return NextResponse.json({ error: 'Missing external_id' }, { status: 400 })
    }

    const supabase = createAdminClient()

    try {
        let studioId: string | null = null
        let entityId: string | null = null
        let type: 'booking' | 'plan' | null = null

        if (external_id.startsWith('book_')) {
            entityId = external_id.replace('book_', '')
            type = 'booking'
            const { data: booking } = await supabase.from('bookings').select('studio_id').eq('id', entityId).single()
            studioId = booking?.studio_id
        } else if (external_id.startsWith('plan_')) {
            entityId = external_id.replace('plan_', '')
            type = 'plan'
            const { data: plan } = await supabase.from('customer_plans').select('studio_id').eq('id', entityId).single()
            studioId = plan?.studio_id
        }

        if (!studioId) {
            console.error('[Xendit Webhook] Studio not found for external_id:', external_id)
            return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
        }

        // Verify Callback Token
        const { data: config } = await supabase
            .from('studio_payment_configs')
            .select('xendit_callback_token')
            .eq('id', studioId)
            .single()

        if (!config || config.xendit_callback_token !== callbackToken) {
            console.error('[Xendit Webhook] Invalid callback token for studio:', studioId)
            return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 })
        }

        // --- FINANCIAL INTEGRITY: Log the Webhook Event ---
        await supabase.from('payment_webhook_logs').insert({
            studio_id: studioId,
            external_id: external_id,
            invoice_id: invoiceId,
            status: status,
            payload: body
        })

        // --- FINANCIAL INTEGRITY: Verify Amount for Plans ---
        if (type === 'plan' && (status === 'PAID' || status === 'SETTLED')) {
            const { data: plan } = await supabase.from('customer_plans').select('total_amount').eq('id', entityId).single()
            if (plan && body.amount !== undefined && Math.abs(plan.total_amount - body.amount) > 1) {
                console.error(`[Xendit Webhook] Amount mismatch for plan ${entityId}. Expected ${plan.total_amount}, got ${body.amount}`)
                
                await dispatchNotification({
                    studioId: studioId,
                    category: 'earnings',
                    event: 'payment_received',
                    title: 'CRITICAL: Payment Amount Mismatch',
                    description: `Plan ${entityId} received ₱${body.amount} but expected ₱${plan.total_amount}. Manual review REQUIRED.`,
                    link: `/studio/sales/history`,
                    metadata: { planId: entityId, expected: plan.total_amount, received: body.amount }
                })
                
                return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
            }
        }

        // Process Payment Success
        if (status === 'PAID' || status === 'SETTLED') {
            if (type === 'booking') {
                const { data: updatedBooking, error: updateError } = await supabase
                    .from('bookings')
                    .update({
                        status: 'approved',
                        payment_status: 'paid',
                        xendit_invoice_id: invoiceId
                    })
                    .eq('id', entityId)
                    .in('status', ['pending', 'confirmed'])
                    .select('*, client:profiles!client_id(full_name, email, id), slots(date, start_time, studios(name, address, id))')
                    .maybeSingle()

                if (updateError) throw updateError

                if (!updatedBooking) {
                    // LATE PAYMENT CASE
                    const { data: finalStatus } = await supabase.from('bookings').select('status, studio_id, client_id, profiles!client_id(full_name)').eq('id', entityId).single()
                    
                    if (finalStatus?.status === 'expired' || finalStatus?.status === 'cancelled_refunded') {
                        console.warn(`[Xendit Webhook] Late payment received for ${entityId}`)
                        
                        await supabase.from('bookings').update({
                            payment_status: 'paid_late',
                            xendit_invoice_id: invoiceId
                        }).eq('id', entityId)

                        // --- ALERT STUDIO OWNER ---
                        await dispatchNotification({
                            studioId: studioId,
                            category: 'earnings',
                            event: 'payment_received',
                            title: 'Late Payment Alert',
                            description: `Received payment for an EXPIRED booking (${(finalStatus.profiles as any)?.full_name || (finalStatus.profiles as any)?.[0]?.full_name || 'Client'}). Manual intervention required.`,
                            link: `/studio/history`,
                            metadata: { bookingId: entityId, status: 'late_payment' }
                        })

                        return NextResponse.json({ success: true, note: 'late_payment_recorded' })
                    }
                    
                    return NextResponse.json({ success: true, note: 'already_processed' })
                }

                // Normal Success Confirmation
                try {
                    if (updatedBooking?.client?.email && studioId) {
                        const branding = await getStudioBranding(studioId);
                        await sendEmail({
                            to: updatedBooking.client.email,
                            subject: 'Booking Confirmed!',
                            fromName: branding?.fromName,
                            react: BookingNotificationEmail({
                                recipientName: updatedBooking.client.full_name || 'Valued Client',
                                bookingType: 'Booking Confirmed',
                                studioName: updatedBooking.slots?.studios?.name,
                                date: format(new Date(updatedBooking.slots?.date), 'MMMM dd, yyyy'),
                                time: updatedBooking.slots?.start_time?.slice(0, 5),
                                address: updatedBooking.slots?.studios?.address,
                                studioLogo: branding?.logoUrl,
                                primaryColor: branding?.primaryColor
                            })
                        })
                    }
                } catch (emailErr) {
                    console.error('[Xendit Webhook] email failed:', emailErr)
                }
            } else if (type === 'plan') {
                const { data: studio } = await supabase.from('studios').select('owner_id, name').eq('id', studioId).single()
                
                const { error: rpcError } = await supabase.rpc('activate_customer_plan', {
                    p_plan_id: entityId,
                    p_verified_by: studio?.owner_id
                })

                if (rpcError) throw rpcError

                await supabase.from('customer_plans').update({
                    xendit_invoice_id: invoiceId
                }).eq('id', entityId)

                // Send Confirmation
                try {
                    const { data: activatedPlan } = await supabase
                        .from('customer_plans')
                        .select('*, profiles!user_id(full_name, email), packages(name), memberships(name)')
                        .eq('id', entityId)
                        .single()

                    const profile = Array.isArray(activatedPlan?.profiles) ? activatedPlan.profiles[0] : activatedPlan?.profiles;
                    if (profile?.email && studioId) {
                        const branding = await getStudioBranding(studioId);
                        const planName = activatedPlan.packages?.name || activatedPlan.memberships?.name || 'Package';
                        
                        await sendEmail({
                            to: activatedPlan.profiles.email,
                            subject: `Purchase Confirmed: ${planName}`,
                            fromName: branding?.fromName,
                            react: PurchaseConfirmationEmail({
                                recipientName: profile.full_name || 'Valued Client',
                                studioName: studio?.name || 'Studio',
                                planName,
                                amount: activatedPlan.total_amount,
                                expiryDate: activatedPlan.expires_at ? format(new Date(activatedPlan.expires_at), 'MMMM dd, yyyy') : undefined,
                                studioLogo: branding?.logoUrl,
                                primaryColor: branding?.primaryColor
                            })
                        })
                    }
                } catch (emailErr) {
                    console.error('[Xendit Webhook] Plan email failed:', emailErr)
                }
            }
        } else if (status === 'EXPIRED') {
            if (type === 'booking') {
                await supabase.rpc('release_booking_atomic', {
                    p_booking_id: entityId,
                    p_new_status: 'expired'
                })
            } else if (type === 'plan') {
                await supabase.from('customer_plans').update({
                    status: 'cancelled'
                }).eq('id', entityId)
            }
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[Xendit Webhook] Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
