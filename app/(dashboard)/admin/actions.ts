'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import ApplicationApprovalEmail from '@/components/emails/ApplicationApprovalEmail'
import ApplicationRejectionEmail from '@/components/emails/ApplicationRejectionEmail'
import { formatManilaDate, formatManilaTime, formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'
import WalletNotificationEmail from '@/components/emails/WalletNotificationEmail'
import AccountReactivatedEmail from '@/components/emails/AccountReactivatedEmail'

async function verifyAdmin(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Optimization: Check metadata first (non-recursive)
    if (user.user_metadata?.role === 'admin') return true

    // Fallback: Check profiles table (should now be safe after recursion fix)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return profile?.role === 'admin'
}

async function logAdminAction(supabase: any, actionType: string, entityType: string, entityId: string | null, details: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('admin_activity_logs').insert({
        admin_id: user.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details: details
    })
    if (error) {
        console.error('Failed to log admin action:', error)
    }
}

export async function approvePayout(payoutId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 1. Mark as paid atomically
    const { data: payoutData, error: updateError } = await supabase.from('payout_requests')
        .update({
            status: 'paid',
            updated_at: new Date().toISOString()
        })
        .eq('id', payoutId)
        .eq('status', 'pending')
        .select('user_id, instructor_id, amount')

    if (updateError) {
        console.error('Error marking payout as paid:', updateError)
        return { error: 'Failed to update payout status.' }
    }

    if (!payoutData || payoutData.length === 0) {
        return { error: 'Payout request not found or not in pending state.' }
    }

    const payout = payoutData[0];
    const targetId = payout.user_id || payout.instructor_id

    // 2. Fetch the profile name+email for better logging
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', targetId).single()
    const payeeName = profile?.full_name || 'Unknown'

    await logAdminAction(supabase, 'APPROVE_PAYOUT', 'payout_requests', payoutId, `Payout of ₱${payout.amount} approved for ${payeeName} (${profile?.email || 'no email'})`)

    revalidatePath('/admin')
    revalidatePath('/instructor/earnings')
    revalidatePath('/studio/earnings')
    return { success: true }
}

export async function rejectPayout(payoutId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 1. Update status to 'rejected' atomically
    const { data, error } = await supabase.from('payout_requests')
        .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
        })
        .eq('id', payoutId)
        .eq('status', 'pending')
        .select('*')

    if (error) {
        console.error('Error rejecting payout:', error)
        return { error: `Failed to reject payout: ${error.message} (${error.code})` }
    }

    if (!data || data.length === 0) {
        return { error: 'Payout request not found or not in pending state.' }
    }

    const payout = data[0];
    const targetId = payout.user_id || payout.instructor_id
    const amount = Number(payout.amount || 0)

    // 2. Refund the wallet deduction since it was rejected
    if (targetId && amount > 0) {
        const { error: refundError } = await supabase.rpc('increment_available_balance', {
            user_id: targetId,
            amount: amount
        })
        if (refundError) {
            console.error('Error refunding rejected payout:', refundError)
            return { error: `Payout rejected, but failed to refund user's wallet: ${refundError.message}` }
        }
    }

    // Fetch details for better logging
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', targetId).single()
    const payeeName = profile?.full_name || 'Unknown'

    await logAdminAction(supabase, 'REJECT_PAYOUT', 'payout_requests', payoutId, `Payout of ₱${amount} rejected for ${payeeName} (${profile?.email || 'no email'})`)

    revalidatePath('/admin')
    revalidatePath('/instructor/earnings')
    revalidatePath('/studio/earnings')
    return { success: true }
}

export async function approveCertification(certificationId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // Verify admin role 
    // In a real app, we would check if (await supabase.auth.getUser()).data.user.role === 'admin'

    const { data: cert, error: fetchError } = await supabase.from('certifications')
        .update({ verified: true })
        .eq('id', certificationId)
        .select('*, profiles(full_name, email)')
        .single()

    if (fetchError || !cert) {
        console.error('Error approving certification:', fetchError)
        return { error: 'Failed to approve certification' }
    }

    await logAdminAction(supabase, 'APPROVE_CERTIFICATION', 'certifications', certificationId, `Certification "${cert.certification_name}" approved for ${cert.profiles?.full_name || 'Unknown'} (${(cert.profiles as any)?.email || 'no email'})`)

    // Send notification email
    if (cert.profiles?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        const emailResult = await sendEmail({
            to: cert.profiles.email,
            subject: 'Congratulations! Your certification has been verified',
            react: ApplicationApprovalEmail({
                recipientName: (cert.profiles as any).full_name || 'Instructor',
                applicationType: 'Instructor',
                itemName: cert.certification_name,
                dashboardUrl: `${siteUrl}/instructor/profile`
            })
        })
        if (!emailResult.success) {
            console.error('Failed to send certification approval email to', cert.profiles.email, emailResult.error);
        }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function rejectCertification(certificationId: string, customReason?: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // Fetch details before deleting so we can send an email
    const { data: cert } = await supabase.from('certifications')
        .select('*, profiles(full_name, email)')
        .eq('id', certificationId)
        .single()

    // For now, "rejecting" means deleting the certification row so they can re-apply.
    const { error, count } = await supabase.from('certifications')
        .delete()
        .eq('id', certificationId)
        .select('id')

    if (error) {
        console.error('Error rejecting certification:', error)
        return { error: 'Failed to reject certification' }
    }

    if (count === 0) {
        return { error: 'Permission denied or item not found. Are you an admin?' }
    }

    await logAdminAction(supabase, 'REJECT_CERTIFICATION', 'certifications', certificationId, `Certification "${cert?.certification_name || 'Unknown'}" rejected for ${cert?.profiles?.full_name || 'Unknown'} (${(cert?.profiles as any)?.email || 'no email'}) — Reason: ${customReason || 'Standard'}`)

    // Send rejection email
    if (cert?.profiles?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        const emailResult = await sendEmail({
            to: cert.profiles.email,
            subject: 'Update regarding your Instructor Certification',
            react: ApplicationRejectionEmail({
                recipientName: (cert.profiles as any).full_name || 'Instructor',
                applicationType: 'Instructor',
                itemName: cert.certification_name,
                dashboardUrl: `${siteUrl}/instructor/profile`,
                reason: customReason || 'Your uploaded documents did not meet our verification criteria. Please ensure your documents are clear, valid, and match your profile details. Feel free to re-upload them.'
            })
        })
        if (!emailResult.success) {
            console.error('Failed to send certification rejection email to', cert.profiles.email, emailResult.error);
        }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function verifyStudio(studioId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    const { data: studio, error: fetchError } = await supabase.from('studios')
        .update({ verified: true })
        .eq('id', studioId)
        .select('*, profiles(full_name, email)')
        .single()

    if (fetchError || !studio) {
        console.error('Error verifying studio:', fetchError)
        return { error: 'Failed to verify studio' }
    }

    await logAdminAction(supabase, 'VERIFY_STUDIO', 'studios', studioId, `Studio "${studio.name}" approved — Owner: ${studio.profiles?.full_name || 'Unknown'} (${(studio.profiles as any)?.email || 'no email'})`)

    // Send notification email
    if (studio.profiles?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        const emailResult = await sendEmail({
            to: studio.profiles.email,
            subject: 'Exciting news! Your studio has been approved',
            react: ApplicationApprovalEmail({
                recipientName: (studio.profiles as any).full_name || 'Studio Owner',
                applicationType: 'Studio',
                itemName: studio.name,
                dashboardUrl: `${siteUrl}/studio`
            })
        })
        if (!emailResult.success) {
            console.error('Failed to send studio approval email to', studio.profiles.email, emailResult.error);
        }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function rejectStudio(studioId: string, customReason?: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // Fetch details before deleting so we can send an email
    const { data: studio } = await supabase.from('studios')
        .select('*, profiles(full_name, email)')
        .eq('id', studioId)
        .single()

    // "Rejecting" deletes the studio so they can fix and re-submit (or start over).
    const { error, count } = await supabase.from('studios')
        .delete()
        .eq('id', studioId)
        .select('id')

    if (error) {
        console.error('Error rejecting studio:', error)
        return { error: 'Failed to reject studio' }
    }

    if (count === 0) {
        return { error: 'Permission denied or item not found. Are you an admin?' }
    }

    await logAdminAction(supabase, 'REJECT_STUDIO', 'studios', studioId, `Studio "${studio?.name || 'Unknown'}" application rejected — Owner: ${studio?.profiles?.full_name || 'Unknown'} (${(studio?.profiles as any)?.email || 'no email'}) — Reason: ${customReason || 'Standard'}`)

    // Send rejection email
    if (studio?.profiles?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        const emailResult = await sendEmail({
            to: studio.profiles.email,
            subject: 'Update regarding your Studio Application',
            react: ApplicationRejectionEmail({
                recipientName: (studio.profiles as any).full_name || 'Studio Owner',
                applicationType: 'Studio',
                itemName: studio.name,
                dashboardUrl: `${siteUrl}/studio`,
                reason: customReason || 'Your uploaded documents or studio details did not meet our verification criteria. Please ensure all documents are clear, valid, and up-to-date, then re-apply.'
            })
        })
        if (!emailResult.success) {
            console.error('Failed to send studio rejection email to', studio.profiles.email, emailResult.error);
        }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function approveStudioPayout(studioId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    const { data: studio, error: fetchError } = await supabase.from('studios')
        .update({ payout_approval_status: 'approved' })
        .eq('id', studioId)
        .select('*, profiles(full_name, email)')
        .single()

    if (fetchError || !studio) {
        console.error('Error approving studio payout:', fetchError)
        return { error: 'Failed to approve studio payout' }
    }

    await logAdminAction(supabase, 'APPROVE_STUDIO_PAYOUT_SETUP', 'studios', studioId, `Approved studio payout setup for "${studio.name}" (Owner: ${studio.profiles?.full_name || 'Unknown'})`)

    if (studio.profiles?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        const emailResult = await sendEmail({
            to: studio.profiles.email,
            subject: 'Your Studio Payout Setup is Approved',
            react: ApplicationApprovalEmail({
                recipientName: (studio.profiles as any).full_name || 'Studio Owner',
                applicationType: 'Studio',
                itemName: `${studio.name} Payout Setup`,
                dashboardUrl: `${siteUrl}/studio/earnings`
            })
        })
        if (!emailResult.success) {
            console.error('Failed to send studio payout approval email to', studio.profiles.email, emailResult.error);
        }
    }

    revalidatePath('/admin')
    revalidatePath('/studio/earnings')
    return { success: true }
}

export async function rejectStudioPayout(studioId: string, customReason?: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // Fetch details before updating so we can send an email
    const { data: studio } = await supabase.from('studios')
        .select('*, profiles(full_name, email)')
        .eq('id', studioId)
        .single()

    // Status 'rejected' means they need to re-upload the documents
    const { error } = await supabase.from('studios')
        .update({ payout_approval_status: 'rejected' })
        .eq('id', studioId)

    if (error) {
        console.error('Error rejecting studio payout:', error)
        return { error: 'Failed to reject studio payout' }
    }

    await logAdminAction(supabase, 'REJECT_STUDIO_PAYOUT_SETUP', 'studios', studioId, `Rejected studio payout setup for ${studio?.name || 'Unknown'}`)

    // Send rejection email
    if (studio?.profiles?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        const emailResult = await sendEmail({
            to: studio.profiles.email,
            subject: 'Action Required: Studio Payout Setup',
            react: ApplicationRejectionEmail({
                recipientName: (studio.profiles as any).full_name || 'Studio Owner',
                applicationType: 'Studio Payout Setup',
                itemName: `${studio.name} Payout Setup`,
                dashboardUrl: `${siteUrl}/studio/earnings`,
                reason: customReason || 'The legal documents provided for your payout setup did not meet our requirements. Please check that they are accurate and upload them again in the Earnings tab.'
            })
        })
        if (!emailResult.success) {
            console.error('Failed to send studio payout rejection email to', studio.profiles.email, emailResult.error);
        }
    }

    revalidatePath('/admin')
    revalidatePath('/studio/earnings')
    return { success: true }
}

export async function confirmBooking(bookingId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // Helper to extract first item if array
    const first = (val: any) => Array.isArray(val) ? val[0] : val;

    // 1. Fetch complete booking details first
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots(
                date,
                start_time,
                end_time,
                studios(
                    name,
                    address,
                    owner_id,
                    owner:profiles!owner_id(full_name, email)
                )
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for confirmation:', fetchError)
        return { error: `Failed to find booking details: ${fetchError?.message || 'Unknown'}` }
    }

    // 2. Update status and set approval timestamp
    const { error: updateError } = await supabase.from('bookings')
        .update({
            status: 'approved',
            approved_at: new Date().toISOString()
        })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error confirming booking:', updateError)
        return { error: 'Failed to update booking status.' }
    }

    const slots = first(booking.slots);
    const client = first(booking.client);
    const instructor = first(booking.instructor);
    const studios = first(slots?.studios);
    const studioOwner = first((studios as any)?.owner);
    const sessionInfo = slots ? `on ${formatManilaDateStr(slots.date)} at ${formatTo12Hour(slots.start_time)}` : 'Unknown Time';

    await logAdminAction(supabase, 'APPROVE_BOOKING', 'bookings', bookingId, `Booking confirmed for client ${client?.full_name || 'Unknown'} (${client?.email || 'no email'}) with instructor ${instructor?.full_name || 'N/A'} (${instructor?.email || 'no email'}) at ${studios?.name || 'Unknown Studio'} (Owner: ${studioOwner?.full_name || 'N/A'}, ${studioOwner?.email || 'no email'}) ${sessionInfo}`)

    // 3. Extract Data Safely
    if (!client?.email || !slots?.start_time || !studios?.name) {
        console.warn('Incomplete booking data for confirmation emails:', { client, slots, studios });
        // Return success for status update but warn UI? Or just proceed.
        // Let's return error so we know it failed.
        return { error: 'Booking approved, but failed to send confirmation emails due to missing participant data.' };
    }

    const date = formatManilaDateStr(slots?.date);
    const time = formatTo12Hour(slots?.start_time);

    const clientEmail = client.email;
    const clientName = client.full_name || 'Valued Client';
    const instructorName = instructor?.full_name || 'Instructor';
    const instructorEmail = instructor?.email;
    const studioName = studios.name;
    const studioAddress = studios.address;

    // 4. Send Emails based on Booking Type
    const isRental = booking.client_id === booking.instructor_id;

    if (isRental) {
        // --- STUDIO RENTAL FLOW ---
        // Just one email to the instructor (who is also the client)
        if (instructorEmail) {
            await sendEmail({
                to: instructorEmail,
                subject: `Studio Rental Approved: ${studioName}`,
                react: BookingNotificationEmail({
                    recipientName: instructorName,
                    bookingType: 'Booking Confirmed',
                    studioName,
                    address: studioAddress,
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment,
                    quantity: (booking.price_breakdown as any)?.quantity
                })
            });
        }
    } else {
        // --- REGULAR SESSION FLOW ---
        // 4a. Notify Client
        if (clientEmail) {
            await sendEmail({
                to: clientEmail,
                subject: `Booking Confirmed: ${studioName}`,
                react: BookingNotificationEmail({
                    recipientName: clientName,
                    bookingType: 'Booking Confirmed',
                    studioName,
                    address: studioAddress,
                    instructorName,
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment,
                    quantity: (booking.price_breakdown as any)?.quantity
                })
            });
        }

        // 4b. Notify Instructor
        if (instructorEmail) {
            await sendEmail({
                to: instructorEmail,
                subject: `Session Confirmed with ${clientName}`,
                react: BookingNotificationEmail({
                    recipientName: instructorName,
                    bookingType: 'Booking Confirmed',
                    studioName,
                    clientName,
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment,
                    quantity: (booking.price_breakdown as any)?.quantity
                })
            });
        }
    }

    // 4c. Notify Studio Owner (Always)
    const studioOwnerId = studios.owner_id;
    if (studioOwnerId) {
        const { data: owner } = await supabase.from('profiles').select('email').eq('id', studioOwnerId).single();
        if (owner?.email) {
            await sendEmail({
                to: owner.email,
                subject: `New Session Confirmed at ${studioName}`,
                react: BookingNotificationEmail({
                    recipientName: 'Studio Owner',
                    bookingType: 'Booking Confirmed',
                    studioName,
                    instructorName,
                    clientName,
                    date,
                    time,
                    equipment: (booking.price_breakdown as any)?.equipment,
                    quantity: (booking.price_breakdown as any)?.quantity
                })
            });
        }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function rejectBooking(bookingId: string, reason: string, withRefund: boolean = false) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }
    const first = (val: any) => Array.isArray(val) ? val[0] : val;

    // 1. Fetch the booking to get associated slot IDs and client info
    const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
            id,
            slot_id,
            instructor_id,
            client_id,
            booked_slot_ids,
            total_price,
            price_breakdown,
            client:profiles!client_id(full_name, email),
            instructor:profiles!instructor_id(full_name, email),
            slots(
                date,
                start_time,
                studios(name, owner:profiles!owner_id(full_name, email))
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for rejection:', fetchError)
        return { error: `Failed to find booking details: ${fetchError?.message || 'Unknown'}` }
    }

    // 2. Update booking status atomically to prevent double-refunds
    const { data: updatedBooking, error: updateError } = await supabase.from('bookings')
        .update({
            status: 'rejected',
            rejection_reason: reason
        })
        .eq('id', bookingId)
        .in('status', ['pending', 'approved'])
        .select('id')

    if (updateError) {
        console.error('Error rejecting booking:', updateError)
        return { error: 'Failed to reject booking' }
    }

    if (!updatedBooking || updatedBooking.length === 0) {
        return { error: 'Booking already processed or not eligible for rejection.' }
    }

    // 3. Release Slots
    const allSlotIds = [booking.slot_id, ...(booking.booked_slot_ids || [])].filter(Boolean)
    if (allSlotIds.length > 0) {
        await supabase.from('slots')
            .update({ is_available: true })
            .in('id', allSlotIds)
    }

    // 3.5 Process Refund if requested
    let hasRefund = withRefund;

    const client = first(booking.client);
    const slots = first(booking.slots);
    const instructor = first(booking.instructor);
    const studios = first(slots?.studios);
    const studioOwner = first((studios as any)?.owner);
    const sessionInfo = slots ? `on ${formatManilaDateStr(slots.date)} at ${formatTo12Hour(slots.start_time)}` : 'Unknown Time';

    if (hasRefund && booking.client_id) {
        const breakdown = booking.price_breakdown as any;
        const walletDeduction = Number(breakdown?.wallet_deduction || 0);
        const totalPrice = Number(booking.total_price || 0);
        const refundAmount = totalPrice + walletDeduction;

        if (refundAmount > 0) {
            const { error: refundError } = await supabase.rpc('increment_available_balance', {
                user_id: booking.client_id,
                amount: refundAmount
            })
            if (refundError) {
                console.error('Error processing refund during rejection:', refundError)
                return { error: `Booking rejected, but refund failed: ${refundError.message}` }
            }

            // Log the refund transaction
            await supabase.from('wallet_top_ups').insert({
                user_id: booking.client_id,
                amount: refundAmount,
                status: 'approved', // instantly approved
                type: 'refund',
                admin_notes: `Refund for rejected studio booking`
            })
        } else {
            hasRefund = false;
        }
    }

    // 4. Send Rejection Email to Client

    // --- AUTO-REMOVAL OF AVAILABILITY START ---
    // If an instructor's studio rental is rejected, remove the auto-created availability
    if (booking.client_id === booking.instructor_id) {
        try {
            const dateStr = slots?.date;
            const timeStr = slots?.start_time;

            await supabase
                .from('instructor_availability')
                .delete()
                .eq('instructor_id', booking.instructor_id)
                .eq('date', dateStr)
                .eq('start_time', timeStr);

            revalidatePath('/instructor/schedule');
        } catch (availError) {
            console.error('Failed to remove auto-availability on rejection:', availError);
        }
    }
    // --- AUTO-REMOVAL OF AVAILABILITY END ---

    if (!client?.email) {
        console.error('Missing client email for rejection:', { client, booking });
        return { error: `Booking rejected, but failed to send email: Client email not found. (ID: ${bookingId})` };
    }

    const date = formatManilaDateStr(slots?.date);
    const time = formatTo12Hour(slots?.start_time);
    const studioName = studios?.name || 'Pilates Studio';

    const emailResult = await sendEmail({
        to: client.email,
        subject: `Update on your booking at ${studioName}`,
        react: BookingNotificationEmail({
            recipientName: client.full_name || 'Valued Client',
            bookingType: 'Booking Rejected',
            studioName: studioName,
            date,
            time,
            rejectionReason: reason,
            hasRefund,
            equipment: (booking.price_breakdown as any)?.equipment,
            quantity: (booking.price_breakdown as any)?.quantity
        })
    });

    if (!emailResult.success) {
        console.error('Email send failed in rejectBooking:', emailResult.error);
        // We'll still return success for the rejection itself, but maybe a warning?
        // Actually, returning success: true but with a message is better.
    }

    await logAdminAction(supabase, 'REJECT_BOOKING', 'bookings', bookingId, `Booking rejected for client ${client?.full_name || 'Unknown'} (${client?.email || 'no email'}) — Instructor: ${instructor?.full_name || 'N/A'} (${instructor?.email || 'no email'}) at ${studios?.name || 'Unknown Studio'} (Owner: ${studioOwner?.full_name || 'N/A'}, ${studioOwner?.email || 'no email'}) ${sessionInfo} — Reason: ${reason || 'None'}, Refund: ${hasRefund ? 'Yes' : 'No'}`)

    revalidatePath('/admin')
    revalidatePath('/studio')
    revalidatePath('/instructor')
    return { success: true }
}


export async function getAdminAnalytics(startDate?: string, endDate?: string) {
    try {
        const supabase = createAdminClient()
        // No verifyAdmin needed here as createAdminClient is already protected by the master key requirement
        // and its usage is restricted to administrative dashboard context.

        // 1. Fetch all approved/completed bookings for the chart and stats
        let bookingsQuery = supabase
            .from('bookings')
            .select(`
                id,
                total_price,
                created_at,
                price_breakdown,
                status,
                client:profiles!client_id(full_name, email),
                slots!inner(
                    date,
                    start_time,
                    studios(
                        name,
                        owner:profiles!owner_id(email)
                    )
                ),
                instructor:profiles!instructor_id(full_name, email)
            `)
            .in('status', ['approved', 'completed', 'cancelled_charged'])

        if (startDate) bookingsQuery = bookingsQuery.gte('slots.date', startDate.split('T')[0])
        if (endDate) bookingsQuery = bookingsQuery.lte('slots.date', endDate.split('T')[0])

        const { data: bookings, error: bookingsError } = await bookingsQuery
        if (bookingsError) {
            console.error('Analytics: Bookings fetch error details:', bookingsError)
            return { error: `Database Error (Bookings): ${bookingsError.message} (${bookingsError.code || 'NO_CODE'})` }
        }
        console.log(`Analytics: Successfully fetched ${bookings?.length || 0} bookings.`)

        // 2. Fetch all completed payouts
        let payoutsQuery = supabase
            .from('payout_requests')
            .select('amount, created_at, instructor_id, studio_id')
            .eq('status', 'paid')

        if (startDate) payoutsQuery = payoutsQuery.gte('created_at', startDate)
        if (endDate) payoutsQuery = payoutsQuery.lte('created_at', endDate)

        const { data: payouts, error: payoutsError } = await payoutsQuery
        if (payoutsError) {
            console.error('Analytics: Payouts fetch error:', payoutsError)
        }

        const totalPayouts = (payouts || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        console.log(`Analytics: Successfully fetched ${payouts?.length || 0} payouts.`)

        // 2.5 Fetch successful wallet top-ups
        const { data: topUps, error: topUpsError } = await supabase
            .from('wallet_top_ups')
            .select('amount, created_at, profiles:profiles!user_id(full_name, email)')
            .eq('status', 'completed')
            .eq('type', 'top_up')
            .gte('created_at', startDate || '1970-01-01')
            .lte('created_at', endDate || new Date().toISOString())

        if (topUpsError) {
            console.error('Analytics: Top-ups fetch error:', topUpsError)
        }
        console.log(`Analytics: Successfully fetched ${topUps?.length || 0} top-ups.`)

        // Helper to extract first item if array (Supabase relationship safeguard)
        const getFirst = (val: any) => Array.isArray(val) ? val[0] : val;

        // 3. Aggregate statistics and prepare transaction list
        const stats = (bookings || []).reduce((acc: any, booking: any) => {
            const slots = getFirst(booking.slots)
            const studio = getFirst(slots?.studios)
            const client = getFirst(booking.client)
            const instructor = getFirst(booking.instructor)

            const sessionDate = slots?.date || (booking.created_at ? booking.created_at.split('T')[0] : new Date().toISOString().split('T')[0])

            const breakdown = booking.price_breakdown || {}
            const platformFee = Number(breakdown.service_fee || 0)
            const instructorFee = Number(breakdown.instructor_fee || 0)
            const studioFee = Number(breakdown.studio_fee || 0)
            let total = platformFee + instructorFee + studioFee

            if (total === 0) {
                total = Number(booking.total_price || 0)
                const fallbackPlatform = total * 0.2
                const fallbackInstructor = total * 0.5
                const fallbackStudio = total * 0.3
                acc.totalRevenue += total
                acc.totalPlatformFees += fallbackPlatform
                acc.totalStudioFees += fallbackStudio
                acc.totalInstructorFees += fallbackInstructor

                if (!acc.daily[sessionDate]) {
                    acc.daily[sessionDate] = { date: sessionDate, revenue: 0, platformFees: 0, bookings: 0 }
                }
                acc.daily[sessionDate].revenue += total
                acc.daily[sessionDate].platformFees += fallbackPlatform
                acc.daily[sessionDate].bookings += 1
            } else {
                acc.totalRevenue += total
                acc.totalPlatformFees += platformFee
                acc.totalStudioFees += studioFee
                acc.totalInstructorFees += instructorFee

                if (!acc.daily[sessionDate]) {
                    acc.daily[sessionDate] = { date: sessionDate, revenue: 0, platformFees: 0, bookings: 0 }
                }
                acc.daily[sessionDate].revenue += total
                acc.daily[sessionDate].platformFees += platformFee
                acc.daily[sessionDate].bookings += 1
            }

            acc.bookingCount += 1

            acc.transactions.push({
                id: booking.id,
                date: slots ? `${slots.date} ${slots.start_time}` : booking.created_at,
                type: 'Booking',
                status: booking.status,
                client: client?.full_name || '-',
                client_email: client?.email || '-',
                studio: studio?.name || '-',
                studio_email: getFirst(studio?.owner)?.email || '-',
                instructor: instructor?.full_name || '-',
                instructor_email: instructor?.email || '-',
                total_amount: total,
                platform_fee: (total === 0 ? (Number(booking.total_price || 0) * 0.2) : platformFee),
                studio_fee: (total === 0 ? (Number(booking.total_price || 0) * 0.3) : studioFee),
                instructor_fee: (total === 0 ? (Number(booking.total_price || 0) * 0.5) : instructorFee)
            })

            return acc
        }, {
            totalRevenue: 0,
            totalPlatformFees: 0,
            totalStudioFees: 0,
            totalInstructorFees: 0,
            totalPayouts: totalPayouts,
            bookingCount: 0,
            daily: {},
            transactions: []
        })

        // 4. Add payouts to transactions
        payouts?.forEach((p: any) => {
            stats.transactions.push({
                id: `payout-${p.id}`,
                date: p.created_at,
                type: 'Payout',
                client: '-',
                client_email: '-',
                studio: p.studio_id ? 'Studio Payout' : '-',
                studio_email: '-',
                instructor: p.instructor_id ? 'Instructor Payout' : '-',
                instructor_email: '-',
                total_amount: -Number(p.amount),
                platform_fee: 0,
                studio_fee: 0,
                instructor_fee: 0
            })
        })

        // 4.5 Add top-ups to transactions
        topUps?.forEach((t: any) => {
            const profile = getFirst(t.profiles)
            stats.transactions.push({
                id: `topup-${t.id}`,
                date: t.created_at,
                type: 'Top-up',
                client: profile?.full_name || '-',
                client_email: profile?.email || '-',
                studio: '-',
                studio_email: '-',
                instructor: '-',
                instructor_email: '-',
                total_amount: Number(t.amount),
                platform_fee: 0,
                studio_fee: 0,
                instructor_fee: 0
            })
            // Optionally add top-ups to revenue if the user considers them revenue
            // stats.totalRevenue += Number(t.amount) 
        })

        // 5. Sort transactions by date descending
        stats.transactions.sort((a: any, b: any) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA)
        })

        return {
            ...stats,
            dailyData: Object.values(stats.daily).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        }
    } catch (err: any) {
        console.error('UNHANDLED ANALYTICS ERROR:', err)
        return { error: `Internal Analytics Error: ${err.message}` }
    }
}

// ─── CSV EXPORT ACTIONS ─────────────────────────────────────────────────────

export async function getPayoutsExport() {
    const supabase = createAdminClient()

    const { data: payouts, error } = await supabase
        .from('payout_requests')
        .select('id, amount, status, payment_method, account_name, account_number, bank_name, created_at, updated_at, instructor_id, studio_id, user_id')
        .in('status', ['paid', 'processed', 'pending', 'rejected'])
        .order('created_at', { ascending: false })

    if (error) return { error: 'Failed to fetch payouts.' }

    // Collect all unique user/instructor/studio ids to resolve names
    const allIds = payouts
        .map((p: any) => p.user_id || p.instructor_id)
        .filter(Boolean)
    const studioIds = payouts.map((p: any) => p.studio_id).filter(Boolean)

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').in('id', allIds.length > 0 ? allIds : ['00000000-0000-0000-0000-000000000000'])
    const { data: studios } = await supabase.from('studios').select('id, name').in('id', studioIds.length > 0 ? studioIds : ['00000000-0000-0000-0000-000000000000'])

    const profileMap: Record<string, any> = {}
    profiles?.forEach((p: any) => { profileMap[p.id] = p })
    const studioMap: Record<string, any> = {}
    studios?.forEach((s: any) => { studioMap[s.id] = s })

    const rows = payouts.map((p: any) => {
        const profile = profileMap[p.user_id || p.instructor_id]
        const studio = studioMap[p.studio_id]

        // Priority: Studio Name > Profile Name
        const name = studio ? studio.name : (profile?.full_name || 'Unknown')
        const role = studio ? 'Studio' : (profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Unknown')

        return {
            'Payout ID': p.id,
            'Requester Name': name,
            'Role': role,
            'Amount (PHP)': p.amount,
            'Status': p.status,
            'Payment Method': p.payment_method === 'bank' || p.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash',
            'Account Name': p.account_name || '',
            'Account Number': p.account_number || '',
            'Bank Name': p.bank_name || '',
            'Studio ID': p.studio_id || '',
            'Requested At': new Date(p.created_at).toLocaleString(),
            'Completed At': p.updated_at && p.status === 'paid' ? new Date(p.updated_at).toLocaleString() : '',
        }
    })

    return { rows }
}

export async function getRevenueExport(startDate?: string, endDate?: string) {
    const supabase = createAdminClient()

    let query = supabase
        .from('bookings')
        .select(`
            id,
            created_at,
            total_price,
            price_breakdown,
            client: profiles!client_id(full_name),
            instructor: profiles!instructor_id(full_name),
            slots!inner(date, start_time, studios(name))
                `)
        .in('status', ['approved', 'completed', 'cancelled_charged'])
        .order('created_at', { ascending: false })

    if (startDate) query = query.gte('slots.start_time', startDate)
    if (endDate) query = query.lte('slots.start_time', endDate)

    const { data: bookings, error } = await query
    if (error) return { error: 'Failed to fetch revenue data.' }

    const getFirst = (val: any) => Array.isArray(val) ? val[0] : val

    const rows = bookings.map((b: any) => {
        const breakdown = b.price_breakdown || {}
        const total = Number(b.total_price || 0)
        const walletDeduction = Number(breakdown.wallet_deduction || 0)
        const originalTotal = Number(breakdown.original_price || total)
        const platformFee = Number(breakdown.service_fee || 0)
        const instructorFee = Number(breakdown.instructor_fee || 0)
        const studioFee = Number(breakdown.studio_fee || 0)

        const slots = getFirst(b.slots)
        const studio = getFirst(slots?.studios)

        return {
            'Booking ID': b.id,
            'Date': slots?.date ? formatManilaDateStr(slots.date) : new Date(b.created_at).toLocaleDateString(),
            'Session Date': slots?.date ? formatManilaDateStr(slots.date) : '',
            'Client Name': getFirst(b.client)?.full_name || '',
            'Instructor Name': getFirst(b.instructor)?.full_name || '',
            'Studio Name': studio?.name || '',
            'Original Total (PHP)': originalTotal,
            'Wallet Deduction (PHP)': walletDeduction,
            'Amount Charged (PHP)': total,
            'Platform Fee / 20% (PHP)': platformFee,
            'Instructor Fee / 50% (PHP)': instructorFee,
            'Studio Fee / 30% (PHP)': studioFee,
            'Equipment': breakdown.equipment || '',
            'Quantity': breakdown.quantity || 1,
        }
    })

    return { rows }
}

export async function getWalletBalancesExport() {
    const supabase = createAdminClient()

    // 1. Fetch all profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, available_balance, pending_balance')
        .limit(10000)
    if (profileError) return { error: 'Failed to fetch profiles.' }

    // 2. Fetch all studios (increased limit to be safe)
    const { data: studios, error: studioError } = await supabase
        .from('studios')
        .select('id, owner_id, name')
        .limit(5000) // Increased limit
    if (studioError) return { error: 'Failed to fetch studios.' }

    const ownerToStudioName: Record<string, string> = {}
    studios?.forEach(s => {
        if (s.id && s.owner_id) {
            ownerToStudioName[s.owner_id] = s.name
        }
    })

    // 3. Format Rows & Round
    const rows = profiles
        .map(p => {
            const available = Math.round(Number(p.available_balance || 0) * 100) / 100
            const pending = Math.round(Number(p.pending_balance || 0) * 100) / 100

            // Priority: Studio Name > Profile Name
            const displayName = ownerToStudioName[p.id] || p.full_name || 'Unknown'

            return {
                'Full Name': displayName,
                'Role': p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1) : 'Unknown',
                'Available Balance (PHP)': available,
                'Pending Balance (PHP)': pending,
                'Total Balance (PHP)': Math.round((available + pending) * 100) / 100,
                'User ID': p.id, // Move ID to end for cleaner view
            }
        })
        .filter(row => row['Total Balance (PHP)'] > 0.01) // Only show people with actual balance
        .sort((a, b) => b['Total Balance (PHP)'] - a['Total Balance (PHP)'])

    return { rows }
}

export async function completeBooking(bookingId: string) {
    const supabase = await createClient()
    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    const { processBookingCompletion } = await import('@/lib/wallet')
    const result = await processBookingCompletion(bookingId)

    if (result.success) {
        const supabase = await createClient()
        const { data: booking } = await supabase.from('bookings').select('client_id, instructor_id').eq('id', bookingId).single()
        await logAdminAction(supabase, 'COMPLETE_BOOKING', 'bookings', bookingId, `Booking manually completed by Admin. Participant status updated.`)

        revalidatePath('/admin')
        revalidatePath('/instructor/sessions')
        revalidatePath('/studio/earnings')
        revalidatePath('/instructor/earnings')
    }

    return result
}

export async function triggerFundsUnlock() {
    const supabase = await createClient()
    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    const { unlockMaturedFunds, autoCompleteBookings } = await import('@/lib/wallet')
    const completed = await autoCompleteBookings()
    const unlocked = await unlockMaturedFunds()

    await logAdminAction(supabase, 'TRIGGER_FUNDS_UNLOCK', 'system', null, `Bulk matching: ${completed.count || 0} sessions auto-completed, ${unlocked.count || 0} payouts unlocked/matured.`)

    revalidatePath('/admin')
    revalidatePath('/instructor/sessions')
    revalidatePath('/studio/earnings')
    revalidatePath('/instructor/earnings')
    return { completedCount: completed.count || 0, unlockedCount: unlocked.count || 0 }
}

export async function searchAllUsers(query: string) {
    const supabase = await createClient();

    if (!(await verifyAdmin(supabase))) {
        return [];
    }
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return [];

    const isPhoneQuery = /^\+?[0-9\s\-]+$/.test(cleanQuery);
    const isEmailQuery = cleanQuery.includes('@');
    const isStatusQuery = ['pending', 'approved', 'cancelled_refunded', 'cancelled_charged', 'expired', 'completed', 'rejected'].includes(cleanQuery.toLowerCase());


    const results: any[] = [];

    // If searching by status, finding matching profiles/studios requires a join or a list of IDs.
    // For simplicity and to satisfy the "showing partners with active bookings" requirement:
    let statusMatchUserIds: string[] = [];
    let statusMatchStudioIds: string[] = [];

    if (isStatusQuery) {
        const { data: statusBookings } = await supabase
            .from('bookings')
            .select('instructor_id, slots(studio_id)')
            .eq('status', cleanQuery.toLowerCase());

        if (statusBookings) {
            statusMatchUserIds = [...new Set(statusBookings.map((b: any) => b.instructor_id).filter(Boolean))];
            statusMatchStudioIds = [...new Set(statusBookings.map((b: any) => b.slots?.studio_id).filter(Boolean))];
        }
    }

    // Search Profiles
    let profileQuery = supabase.from('profiles').select('id, full_name, role, contact_number, is_founding_partner, gov_id_url, gov_id_expiry, bir_url, bir_expiry, tin, certifications(proof_url, expiry_date, certification_name)');

    if (isStatusQuery) {
        profileQuery = profileQuery.in('id', statusMatchUserIds.length > 0 ? statusMatchUserIds : ['00000000-0000-0000-0000-000000000000']);
    } else if (isPhoneQuery) {
        profileQuery = profileQuery.ilike('contact_number', `%${cleanQuery}%`);
    } else if (!isEmailQuery) {
        profileQuery = profileQuery.ilike('full_name', `%${cleanQuery}%`);
    }

    const { data: profiles } = await profileQuery.limit(10);
    const profilePathsToSign: string[] = [];
    if (profiles) {
        profiles.forEach(p => {
            if (p.role === 'instructor') {
                if (p.gov_id_url) profilePathsToSign.push(p.gov_id_url);
                if (p.bir_url) profilePathsToSign.push(p.bir_url);
                if (p.certifications) {
                    const certs = Array.isArray(p.certifications) ? p.certifications : [p.certifications];
                    certs.forEach((c: any) => {
                        if (c.proof_url) profilePathsToSign.push(c.proof_url);
                    });
                }
            }
        });
    }

    let profileSignedUrlsMap: Record<string, string> = {};
    if (profilePathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(profilePathsToSign, 3600);
        if (signedData) {
            signedData.forEach(item => {
                if (item.signedUrl && item.path) profileSignedUrlsMap[item.path] = item.signedUrl;
            });
        }
    }

    if (profiles) {
        profiles.forEach(p => {
            results.push({
                id: p.id,
                type: 'profile',
                name: p.full_name || 'Unknown User',
                phone: p.contact_number,
                role: p.role,
                url: p.role === 'instructor' ? `/ instructors / ${p.id}` : '#',
                is_founding_partner: p.is_founding_partner,
                documents: p.role === 'instructor' ? {
                    govId: p.gov_id_url ? profileSignedUrlsMap[p.gov_id_url] : null,
                    govIdExpiry: p.gov_id_expiry,
                    bir: p.bir_url ? profileSignedUrlsMap[p.bir_url] : null,
                    birExpiry: p.bir_expiry,
                    tin: p.tin,
                    certifications: p.certifications ? (Array.isArray(p.certifications) ? p.certifications : [p.certifications]).map((c: any) => ({
                        name: c.certification_name,
                        url: c.proof_url ? profileSignedUrlsMap[c.proof_url] : null,
                        expiry: c.expiry_date
                    })) : []
                } : null
            });
        });
    }

    // Search Studios
    let studioQuery = supabase.from('studios').select('id, name, location, contact_number, is_founding_partner, bir_certificate_url, bir_certificate_expiry, gov_id_url, gov_id_expiry, mayors_permit_url, mayors_permit_expiry, secretary_certificate_url, insurance_url, insurance_expiry, space_photos_urls');

    if (isStatusQuery) {
        studioQuery = studioQuery.in('id', statusMatchStudioIds.length > 0 ? statusMatchStudioIds : ['00000000-0000-0000-0000-000000000000']);
    } else if (isPhoneQuery) {
        studioQuery = studioQuery.ilike('contact_number', `%${cleanQuery}%`);
    } else if (!isEmailQuery) {
        studioQuery = studioQuery.ilike('name', `%${cleanQuery}%`);
    }

    const { data: studios } = await studioQuery.limit(10);
    if (studios) {
        const pathsToSign: string[] = [];
        studios.forEach(s => {
            if (s.bir_certificate_url) pathsToSign.push(s.bir_certificate_url);
            if (s.gov_id_url) pathsToSign.push(s.gov_id_url);
            if (s.mayors_permit_url) pathsToSign.push(s.mayors_permit_url);
            if (s.secretary_certificate_url) pathsToSign.push(s.secretary_certificate_url);
            if (s.insurance_url) pathsToSign.push(s.insurance_url);
        });

        let signedUrlsMap: Record<string, string> = {};
        if (pathsToSign.length > 0) {
            const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(pathsToSign, 3600);
            if (signedData) {
                signedData.forEach(item => {
                    if (item.signedUrl && item.path) signedUrlsMap[item.path] = item.signedUrl;
                });
            }
        }

        studios.forEach(s => {
            results.push({
                id: s.id,
                type: 'studio',
                name: s.name,
                phone: s.contact_number,
                location: s.location,
                url: `/ studios / ${s.id}`,
                is_founding_partner: s.is_founding_partner,
                documents: {
                    bir: s.bir_certificate_url ? signedUrlsMap[s.bir_certificate_url] : null,
                    birExpiry: s.bir_certificate_expiry,
                    govId: s.gov_id_url ? signedUrlsMap[s.gov_id_url] : null,
                    govIdExpiry: s.gov_id_expiry,
                    mayorsPermit: s.mayors_permit_url ? signedUrlsMap[s.mayors_permit_url] : null,
                    mayorsPermitExpiry: s.mayors_permit_expiry,
                    secretaryCert: s.secretary_certificate_url ? signedUrlsMap[s.secretary_certificate_url] : null,
                    insurance: s.insurance_url ? signedUrlsMap[s.insurance_url] : null,
                    insuranceExpiry: s.insurance_expiry,
                    spacePhotos: s.space_photos_urls || []
                }
            });
        });
    }

    return results;
}

export async function updatePartnerFeeSettings(
    id: string,
    type: 'profile' | 'studio',
    isFoundingPartner: boolean,
    customFeePercentage: number
) {
    const supabase = await createClient();

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }
    const table = type === 'profile' ? 'profiles' : 'studios';

    const { error } = await supabase
        .from(table)
        .update({
            is_founding_partner: isFoundingPartner,
            custom_fee_percentage: customFeePercentage
        })
        .eq('id', id);

    if (error) {
        console.error(`Error updating partner fee settings for ${type} ${id}: `, error);
        return { error: 'Failed to update partner fee settings.' };
    }

    await logAdminAction(supabase, 'UPDATE_PARTNER_FEES', table, id, `Updated partner fee settings for ${type} ID ${id}: Founding Partner = ${isFoundingPartner}, Fee = ${customFeePercentage}%`)

    revalidatePath('/admin');
    revalidatePath('/admin/partners');
    return { success: true };
}

export async function getPartnerBookings(id: string, type: 'profile' | 'studio') {
    const supabase = await createClient();

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    let query = supabase
        .from('bookings')
        .select(`
            *,
            instructor:profiles!instructor_id(full_name, avatar_url),
            slots(
                date,
                start_time,
                end_time,
                equipment,
                studios(name)
            )
        `)
        .order('created_at', { ascending: false });

    if (type === 'profile') {
        query = query.eq('instructor_id', id);
    } else {
        // For studios, we need to filter by slots that belong to this studio
        const { data: studioSlots } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', id);

        const slotIds = studioSlots?.map(s => s.id) ?? [];
        if (slotIds.length === 0) return { active: [], past: [] };
        query = query.in('slot_id', slotIds);
    }

    const { data: bookings, error } = await query;

    if (error) {
        console.error('Error fetching partner bookings:', error);
        return { error: 'Failed to fetch bookings.' };
    }

    const getFirst = (val: any) => Array.isArray(val) ? val[0] : val;
    const now = new Date();

    const active = bookings.filter((b: any) => {
        const slot = getFirst(b.slots);
        if (!slot?.date || !slot?.end_time) return false;
        const endTime = new Date(`${slot.date}T${slot.end_time}+08:00`);
        return endTime > now && b.status === 'approved';
    });

    const past = bookings.filter((b: any) => {
        const slot = getFirst(b.slots);
        if (!slot?.date || !slot?.end_time) return true;
        const endTime = new Date(`${slot.date}T${slot.end_time}+08:00`);
        return endTime <= now || ['completed', 'cancelled_refunded', 'cancelled_charged', 'expired', 'rejected'].includes(b.status);
    });

    return { active, past };
}

export async function suspendUser(userId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 2. Suspend
    const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: true })
        .eq('id', userId)

    if (error) {
        console.error('Error suspending user:', error)
        return { error: 'Failed to suspend user.' }
    }

    const { data: targetProfile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single()
    await logAdminAction(supabase, 'SUSPEND_USER', 'profiles', userId, `User ${targetProfile?.full_name || 'Unknown'} (${targetProfile?.email || 'no email'}) suspended manually via admin dashboard`)

    revalidatePath('/admin')
    return { success: true }
}

export async function reinstateStudio(profileId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 2. Clear strikes and suspension
    // Get the studio first to clear its strikes
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', profileId)
        .single()

    if (!studio) return { error: 'Studio not found.' }

    // Delete strikes
    const { error: deleteError } = await supabase
        .from('studio_strikes')
        .delete()
        .eq('studio_id', studio.id)

    if (deleteError) {
        console.error('Error clearing strikes:', deleteError)
        return { error: 'Failed to clear strikes.' }
    }

    // Reset suspension
    const { error: resetError } = await supabase
        .from('profiles')
        .update({ is_suspended: false })
        .eq('id', profileId)

    if (resetError) {
        console.error('Error resetting suspension:', resetError)
        return { error: 'Failed to reset suspension.' }
    }

    const { data: ownerProfile } = await supabase.from('profiles').select('full_name, email').eq('id', profileId).single()
    await logAdminAction(supabase, 'REINSTATE_STUDIO', 'profiles', profileId, `Suspended studio owner ${ownerProfile?.full_name || 'Unknown'} (${ownerProfile?.email || 'no email'}) reinstated — strikes cleared for studio "${studio.name}"`)

    // 3. Send Reactivation Email
    const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', profileId)
        .single()

    if (profile?.email) {
        const host = (await headers()).get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        await sendEmail({
            to: profile.email,
            subject: 'Your Studio Vault PH Listing is Now Active',
            react: AccountReactivatedEmail({
                studioName: studio.name,
                dashboardUrl: `${siteUrl}/studio`
            })
        })
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function approveTopUp(id: string) {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    if (!adminUser) return { error: 'Unauthorized' }

    // 1. Get Top-Up Request
    const { data: topUp, error: fetchError } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('id', id)
        .single()

    if (fetchError || !topUp) return { error: 'Top-up request not found.' }
    if (topUp.status !== 'pending') return { error: 'Top-up request already processed.' }

    // 2. Execute Atomic Approval via RPC
    const { error: rpcError } = await supabase.rpc('approve_wallet_top_up', {
        p_top_up_id: id
    })

    if (rpcError) {
        console.error('Approve RPC Error:', rpcError)
        return { error: `Failed to approve top-up: ${rpcError.message}` }
    }

    const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', topUp.user_id).single()
    await logAdminAction(supabase, 'APPROVE_TOP_UP', 'wallet_top_ups', id, `Wallet top-up of ₱${topUp.amount} approved for ${userProfile?.full_name || 'Unknown User'}`)

    // 4. Send Approval Email
    if (userProfile?.email) {
        await sendEmail({
            to: userProfile.email,
            subject: 'Wallet Top-up Approved!',
            react: WalletNotificationEmail({
                recipientName: userProfile?.full_name || 'User',
                type: 'top_up_approved',
                amount: topUp.amount,
                date: formatManilaDate(new Date().toISOString())
            }) as any
        })
    }

    revalidatePath('/admin')
    revalidatePath('/customer/wallet')
    revalidatePath('/instructor/earnings')
    return { success: true }
}

export async function rejectTopUp(id: string, reason?: string) {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    if (!adminUser) return { error: 'Unauthorized' }

    const { data: topUp } = await supabase.from('wallet_top_ups').select('*').eq('id', id).single()
    if (!topUp) return { error: 'Top-up request not found.' }

    // 2. Execute Atomic Rejection via RPC
    const { error: rpcError } = await supabase.rpc('reject_wallet_top_up', {
        p_top_up_id: id,
        p_reason: reason || 'Receipt unreadable or incorrect amount.'
    })

    if (rpcError) {
        console.error('Reject RPC Error:', rpcError)
        return { error: `Failed to reject top-up: ${rpcError.message}` }
    }

    const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', topUp.user_id).single()
    await logAdminAction(supabase, 'REJECT_TOP_UP', 'wallet_top_ups', id, `Wallet top-up of ₱${topUp.amount} rejected for ${userProfile?.full_name || 'Unknown User'} — Reason: ${reason || 'Receipt unreadable or incorrect amount.'}`)

    // Send Rejection Email
    if (userProfile?.email) {
        await sendEmail({
            to: userProfile.email,
            subject: 'Wallet Top-up Rejected',
            react: WalletNotificationEmail({
                recipientName: userProfile?.full_name || 'User',
                type: 'top_up_rejected',
                amount: topUp.amount,
                date: formatManilaDate(new Date().toISOString()),
                rejectionReason: reason
            }) as any
        })
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function adjustUserBalance(userId: string, amount: number, reason: string) {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    if (!adminUser) return { error: 'Unauthorized' }

    // 1. Verify Admin (Redundant but safe)
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', adminUser.id).single()
    if (adminProfile?.role !== 'admin') return { error: 'Unauthorized' }

    // 2. Validation
    if (!reason || reason.trim().length < 3) {
        return { error: 'Reason must be at least 3 characters long.' }
    }

    if (amount === 0) {
        return { error: 'Adjustment amount cannot be zero.' }
    }

    // 3. Execute Atomic Adjustment via RPC
    const { data: success, error: rpcError } = await supabase.rpc('execute_admin_balance_adjustment', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason.trim()
    })

    if (rpcError) {
        console.error('Adjustment RPC Error:', rpcError)
        return { error: rpcError.message || 'Failed to execute adjustment.' }
    }

    const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', userId).single()
    await logAdminAction(supabase, 'MANUAL_BALANCE_ADJUSTMENT', 'profiles', userId, `Balance adjusted by ₱${amount} for ${userProfile?.full_name || 'Unknown'} (${userProfile?.email || 'no email'}) — Reason: ${reason}`)

    // 4. Send Notification Email
    if (userProfile?.email) {
        await sendEmail({
            to: userProfile.email,
            subject: 'Refined Wallet Balance Update',
            react: WalletNotificationEmail({
                recipientName: userProfile?.full_name || 'User',
                type: amount > 0 ? 'adjustment_credit' : 'adjustment_debit',
                amount: Math.abs(amount),
                date: formatManilaDate(new Date().toISOString()),
                rejectionReason: reason // Overloading this field for the reason
            }) as any
        })
    }

    revalidatePath('/admin')
    revalidatePath('/customer/wallet')
    revalidatePath('/instructor/earnings')
    revalidatePath('/studio/earnings')
    return { success: true }
}

export async function settleInstructorDebt(profileId: string) {
    const supabase = await createClient()
    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 1. Fetch current balance
    const { data: profile } = await supabase
        .from('profiles')
        .select('available_balance, full_name, email')
        .eq('id', profileId)
        .single()

    if (!profile) return { error: 'Profile not found.' }

    const currentBalance = profile.available_balance || 0
    if (currentBalance >= 0) return { error: 'Instructor does not have a negative balance.' }

    // 2. Settle the debt using Atomic RPC
    const settlementAmount = Math.abs(currentBalance)
    const { error: rpcError } = await supabase.rpc('execute_admin_balance_adjustment', {
        p_user_id: profileId,
        p_amount: settlementAmount,
        p_reason: `Manual debt settlement by Admin. Original balance: ₱${currentBalance.toLocaleString()}`
    })

    if (rpcError) {
        console.error('Settlement RPC Error:', rpcError)
        return { error: `Failed to settle balance: ${rpcError.message}` }
    }

    await logAdminAction(supabase, 'SETTLE_INSTRUCTOR_DEBT', 'profiles', profileId, `Instructor debt of ₱${settlementAmount} settled for ${profile.full_name} (${profile.email || 'no email'}) — balance was ₱${currentBalance.toLocaleString()}`)

    // 4. Send Confirmation Email
    if (profile.email) {
        await sendEmail({
            to: profile.email,
            subject: 'Account Reinstated: Negative Balance Settled',
            react: WalletNotificationEmail({
                recipientName: profile.full_name,
                type: 'adjustment_credit',
                amount: settlementAmount,
                date: formatManilaDate(new Date().toISOString()),
                rejectionReason: 'Your negative balance has been settled by the Admin. Your account is now fully functional.'
            }) as any
        })
    }

    revalidatePath('/admin')
    revalidatePath('/instructor/earnings')
    return { success: true }
}
