'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { createXenditRefund } from '@/lib/xendit'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import AccountFrozenEmail from '@/components/emails/AccountFrozenEmail'
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'
import { dispatchNotification } from '@/lib/studio/notifications'
import { getStudioBranding } from '@/lib/studio/branding'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { PriceBreakdownSchema, STUDIO_TAGS } from '@/lib/studio/schemas'

/**
 * Hardened Booking Management (Phase 12)
 * 
 * Key Improvements:
 * 1. Zod-hardened JSONB parsing for PriceBreakdown.
 * 2. Tag-based revalidation for instant dashboard sync.
 * 3. High-integrity refund logging.
 */

export async function cancelBookingByStudio(bookingId: string, reason: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    if (!reason?.trim()) return { error: 'Cancellation reason is required.' }

    // 1. Fetch booking with details
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots!inner(
                id,
                start_time,
                end_time,
                date,
                studios!inner(id, name, owner_id, address)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) return { error: 'Booking not found.' }

    const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
    const studio = (slotData as any)?.studios
    const studioId = studio?.id

    // 2. Permission Check
    const { permissions, isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions.manage_bookings) {
        return { error: 'Unauthorized: You do not have permission to manage bookings.' }
    }

    // 3. Type-Safe JSONB Parsing
    const breakdown = PriceBreakdownSchema.parse(booking.price_breakdown)

    // 4. Refund Logic
    if (booking.payment_method === 'xendit' && booking.xendit_invoice_id) {
        try {
            await createXenditRefund({
                studioId,
                paymentId: booking.xendit_invoice_id,
                amount: booking.total_price,
                reason: reason || 'Booking cancelled by studio'
            });
        } catch (err: any) {
            console.error('[cancelBookingByStudio] Refund Failed:', err);
            return { error: `Automated refund failed: ${err.message}. The booking was NOT cancelled.` };
        }
    }

    // 5. Atomic Status Update
    const { data: result, error: rpcError } = await supabase.rpc('cancel_booking_atomic_v3', {
        p_booking_id: bookingId,
        p_reason: reason
    });

    if (rpcError || !result?.success) {
        return { error: rpcError?.message || result?.error || 'Failed to cancel booking record.' };
    }

    // 6. Notifications & Branding
    const branding = await getStudioBranding(studioId)
    const client = Array.isArray(booking.client) ? booking.client[0] : booking.client
    const date = formatManilaDateStr(slotData?.date)
    const time = formatTo12Hour(slotData?.start_time)

    // Parallelize notifications
    await Promise.all([
        client?.email ? sendEmail({
            to: client.email,
            subject: `Session Cancelled by Studio: ${studio.name}`,
            fromName: branding?.fromName,
            react: BookingNotificationEmail({
                recipientName: client.full_name || 'Client',
                bookingType: 'Booking Cancelled',
                studioName: studio.name,
                date,
                time,
                cancellationReason: reason,
                equipment: breakdown.equipment,
                quantity: breakdown.quantity,
                studioLogo: branding?.logoUrl,
                primaryColor: branding?.primaryColor
            })
        }) : Promise.resolve(),
        dispatchNotification({
            studioId,
            category: 'bookings',
            event: 'class_booking_cancelled',
            title: 'Booking Cancelled',
            description: `Session for ${client?.full_name || 'Client'} on ${date} at ${time} was cancelled.`,
            link: `/studio/history`,
            metadata: { bookingId }
        })
    ])

    // 7. Granular Revalidation
    ;(revalidateTag as any)(STUDIO_TAGS.BOOKINGS(studioId))
    ;(revalidateTag as any)(STUDIO_TAGS.SCHEDULE(studioId))

    return { success: true }
}

export async function approveManualBooking(bookingId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots!inner(
                id,
                date,
                start_time,
                end_time,
                studios!inner(id, name, owner_id, address)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) return { error: 'Booking not found.' }
    
    const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
    const studio = (slotData as any)?.studios
    const studioId = studio?.id

    const { permissions, isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions.manage_bookings) {
        return { error: 'Unauthorized.' }
    }

    if (booking.status !== 'pending') return { error: 'Only pending bookings can be approved.' }

    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', bookingId)

    if (updateError) return { error: 'Failed to approve booking.' }

    ;(revalidateTag as any)(STUDIO_TAGS.BOOKINGS(studioId))
    ;(revalidateTag as any)(STUDIO_TAGS.SCHEDULE(studioId))

    return { success: true }
}

export async function checkInInstructor(bookingId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`id, instructor_id, slots!inner(studios!inner(id))`)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) return { error: 'Booking not found.' }

    const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
    const studioData: any = Array.isArray(slotData?.studios) ? slotData?.studios[0] : slotData?.studios
    const studioId = studioData?.id

    const { permissions, isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions.manage_bookings && booking.instructor_id !== user.id) {
        return { error: 'Unauthorized.' }
    }

    const { error: updateError } = await supabase
        .from('bookings')
        .update({ instructor_checked_in_at: new Date().toISOString() })
        .eq('id', bookingId)

    if (updateError) return { error: 'Check-in failed.' }

    ;(revalidateTag as any)(STUDIO_TAGS.BOOKINGS(studioId))
    return { success: true }
}
