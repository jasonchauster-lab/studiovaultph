'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import AccountFrozenEmail from '@/components/emails/AccountFrozenEmail'
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'

export async function cancelBookingByStudio(bookingId: string, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check Studio Owner's balance and suspension
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('available_balance, is_suspended')
        .eq('id', user.id)
        .single()

    if (ownerProfile?.is_suspended) {
        return { error: 'Your account is currently suspended. You cannot cancel bookings.' }
    }

    if (ownerProfile && (ownerProfile.available_balance || 0) < 0) {
        return { error: 'You have a negative balance. Please settle your outstanding balance before cancelling bookings.' }
    }

    if (!reason?.trim()) return { error: 'Cancellation reason is required.' }

    // Fetch booking and verify studio ownership
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots!inner(
                start_time,
                end_time,
                date,
                studios!inner(id, name, owner_id, address)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for cancellation:', fetchError)
        return { error: 'Booking not found.' }
    }

    const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
    const studio = (slotData as any)?.studios
    if (studio?.owner_id !== user.id) {
        return { error: 'Unauthorized to cancel this booking.' }
    }

    if (['cancelled_refunded', 'cancelled_charged', 'rejected'].includes(booking.status)) {
        return { error: 'Booking is already cancelled or rejected.' }
    }

    // Mark as cancelled atomically using RPC
    const { data: result, error: rpcError } = await supabase.rpc('cancel_booking_atomic', {
        p_booking_id: bookingId,
        p_reason: reason,
        p_cancelled_by: user.id
    });

    if (rpcError || !result?.success) {
        console.error('Studio cancel RPC error:', rpcError || result?.error);
        return { error: rpcError?.message || result?.error || 'Failed to cancel booking.' };
    }

    // Handle Auto-Suspension Email
    if (result.is_suspended && user.email) {
        await sendEmail({
            to: user.email,
            subject: 'Action Required: Your Studio Vault PH Listing has been Suspended',
            react: AccountFrozenEmail({
                studioName: result.studio_name,
            })
        });
    }

    // Send Emails
    const client = Array.isArray(booking.client) ? booking.client[0] : booking.client
    const instructor = Array.isArray(booking.instructor) ? booking.instructor[0] : booking.instructor
    const date = formatManilaDateStr(slotData?.date)
    const time = formatTo12Hour(slotData?.start_time)

    // Notify Client
    if (client?.email) {
        await sendEmail({
            to: client.email,
            subject: `Session Cancelled by Studio: ${studio.name}`,
            react: BookingNotificationEmail({
                recipientName: client.full_name || 'Client',
                bookingType: 'Booking Cancelled',
                studioName: studio.name,
                date,
                time,
                cancellationReason: reason,
                equipment: (booking.price_breakdown as any)?.equipment,
                quantity: (booking.price_breakdown as any)?.quantity
            })
        })
    }

    // Notify Instructor
    if (instructor?.email && booking.instructor_id !== user.id) {
        await sendEmail({
            to: instructor.email,
            subject: `Studio Cancelled Session: ${studio.name}`,
            react: BookingNotificationEmail({
                recipientName: instructor.full_name || 'Instructor',
                bookingType: 'Booking Cancelled',
                studioName: studio.name,
                date,
                time,
                cancellationReason: reason
            })
        })
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function checkInInstructor(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            id, 
            instructor_id, 
            status,
            slots!inner(
                studios!inner(owner_id)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        return { error: 'Booking not found.' }
    }

    const studio = (booking.slots as any)?.studios
    if (studio?.owner_id !== user.id) {
        return { error: 'Unauthorized to check in this instructor.' }
    }

    if (booking.status !== 'approved' && booking.status !== 'completed') {
        return { error: 'Only approved or completed sessions can be checked in.' }
    }

    const { error: updateError } = await supabase
        .from('bookings')
        .update({
            instructor_checked_in_at: new Date().toISOString()
        })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error checking in instructor:', updateError)
        return { error: 'Failed to record check-in.' }
    }

    revalidatePath('/studio/history')
    revalidatePath('/studio')
    return { success: true }
}
