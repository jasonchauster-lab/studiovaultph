'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendEmail } from '@/lib/email'
import BookingNotificationEmail from '@/components/emails/BookingNotificationEmail'
import ApplicationApprovalEmail from '@/components/emails/ApplicationApprovalEmail'
import ApplicationRejectionEmail from '@/components/emails/ApplicationRejectionEmail'
import { formatManilaDate, formatManilaTime } from '@/lib/timezone'

async function verifyAdmin(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    return profile?.role === 'admin'
}

export async function approvePayout(payoutId: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 1. Update status to 'paid'
    const { data: payout, error: fetchError } = await supabase
        .from('payout_requests')
        .select('user_id, instructor_id, amount')
        .eq('id', payoutId)
        .single()

    if (fetchError || !payout) {
        return { error: 'Payout request not found.' }
    }

    // 2. Perform atomic deduction from available_balance
    const targetId = payout.user_id || payout.instructor_id
    if (targetId) {
        const { error: rpcError } = await supabase.rpc('deduct_available_balance', {
            user_id: targetId,
            amount: payout.amount
        })
        if (rpcError) {
            console.error('Error in deduct_available_balance RPC:', rpcError)
            return { error: `Failed to deduct balance: ${rpcError.message}` }
        }
    }

    // 3. Mark as paid
    const { error: updateError } = await supabase.from('payout_requests')
        .update({
            status: 'paid',
            updated_at: new Date().toISOString()
        })
        .eq('id', payoutId)

    if (updateError) {
        console.error('Error marking payout as paid:', updateError)
        return { error: 'Failed to update payout status.' }
    }

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

    // 1. Update status to 'rejected'
    // This effectively "refunds" the amount to the Available Balance calculation
    // because available = totalEarned - totalWithdrawn (processed) - pendingPayouts (pending)
    // Rejected requests are neither processed nor pending, so they are ignored in deduction.
    const { data, error } = await supabase.from('payout_requests')
        .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
        })
        .eq('id', payoutId)
        .select('id')

    if (error) {
        console.error('Error rejecting payout:', error)
        return { error: `Failed to reject payout: ${error.message} (${error.code})` }
    }

    if (!data || data.length === 0) {
        return { error: 'Payout request not found or permission denied.' }
    }

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
                start_time,
                end_time,
                studios(
                    name,
                    address,
                    owner_id
                )
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for confirmation:', fetchError)
        return { error: `Failed to find booking details: ${fetchError?.message || 'Unknown'}` }
    }

    // 2. Update status
    const { error: updateError } = await supabase.from('bookings')
        .update({ status: 'approved' })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error confirming booking:', updateError)
        return { error: 'Failed to update booking status.' }
    }

    // 3. Extract Data Safely
    const slots = first(booking.slots);
    const studios = first(slots?.studios);
    const client = first(booking.client);
    const instructor = first(booking.instructor);

    if (!client?.email || !slots?.start_time || !studios?.name) {
        console.warn('Incomplete booking data for confirmation emails:', { client, slots, studios });
        // Return success for status update but warn UI? Or just proceed.
        // Let's return error so we know it failed.
        return { error: 'Booking approved, but failed to send confirmation emails due to missing participant data.' };
    }

    const date = formatManilaDate(slots.start_time);
    const time = formatManilaTime(slots.start_time);

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
                    time
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
                    time
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
                    time
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
                    time
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
            client:profiles!client_id(full_name, email),
            slots(
                start_time,
                studios(name)
            )
        `)
        .eq('id', bookingId)
        .single()

    if (fetchError || !booking) {
        console.error('Error fetching booking for rejection:', fetchError)
        return { error: `Failed to find booking details: ${fetchError?.message || 'Unknown'}` }
    }

    // 2. Update booking status
    const { error: updateError } = await supabase.from('bookings')
        .update({
            status: 'rejected',
            rejection_reason: reason
        })
        .eq('id', bookingId)

    if (updateError) {
        console.error('Error rejecting booking:', updateError)
        return { error: 'Failed to reject booking' }
    }

    // 3. Release Slots
    const allSlotIds = [booking.slot_id, ...(booking.booked_slot_ids || [])].filter(Boolean)
    if (allSlotIds.length > 0) {
        await supabase.from('slots')
            .update({ is_available: true })
            .in('id', allSlotIds)
    }

    // 3.5 Process Refund if requested
    if (withRefund && booking.client_id && booking.total_price != null) {
        const refundAmount = Number(booking.total_price);
        if (refundAmount > 0) {
            const { error: refundError } = await supabase.rpc('increment_available_balance', {
                user_id: booking.client_id,
                amount: refundAmount
            })
            if (refundError) {
                console.error('Error processing refund during rejection:', refundError)
                // Continue with rejection even if refund fails, but you might want to log this securely
            }
        }
    }

    // 4. Send Rejection Email to Client
    const client = first(booking.client);
    const slots = first(booking.slots);
    const studios = first(slots?.studios);

    // --- AUTO-REMOVAL OF AVAILABILITY START ---
    // If an instructor's studio rental is rejected, remove the auto-created availability
    if (booking.client_id === booking.instructor_id) {
        try {
            const startDateTime = new Date(slots?.start_time);
            const dateStr = startDateTime.toISOString().split('T')[0];
            const timeStr = startDateTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });

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

    const date = formatManilaDate(slots?.start_time);
    const time = formatManilaTime(slots?.start_time);
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
            rejectionReason: reason
        })
    });

    if (!emailResult.success) {
        console.error('Email send failed in rejectBooking:', emailResult.error);
        // We'll still return success for the rejection itself, but maybe a warning?
        // Actually, returning success: true but with a message is better.
    }

    revalidatePath('/admin')
    revalidatePath('/studio')
    revalidatePath('/instructor')
    return { success: true }
}

export async function getAdminAnalytics(startDate?: string, endDate?: string) {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    // 1. Fetch all approved bookings with details for detailed transactions
    let bookingsQuery = supabase
        .from('bookings')
        .select(`
            id,
            total_price,
            created_at,
            price_breakdown,
            status,
            client:profiles!client_id(full_name),
            slots(
                studios(name)
            ),
            instructor:profiles!instructor_id(full_name)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })

    if (startDate) bookingsQuery = bookingsQuery.gte('created_at', startDate)
    if (endDate) bookingsQuery = bookingsQuery.lte('created_at', endDate)

    const { data: bookings, error: bookingsError } = await bookingsQuery

    if (bookingsError) {
        console.error('Error fetching analytics bookings:', bookingsError)
        return { error: 'Failed to fetch analytics' }
    }

    // 2. Fetch all paid payout requests (outflows)
    let payoutsQuery = supabase
        .from('payout_requests')
        .select('amount, created_at, instructor_id, studio_id')
        .eq('status', 'paid')

    if (startDate) payoutsQuery = payoutsQuery.gte('created_at', startDate)
    if (endDate) payoutsQuery = payoutsQuery.lte('created_at', endDate)

    const { data: payouts, error: payoutsError } = await payoutsQuery

    if (payoutsError) {
        console.error('Error fetching analytics payouts:', payoutsError)
    }

    const totalPayouts = payouts?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0

    // 3. Aggregate statistics and prepare transaction list
    const stats = bookings.reduce((acc: any, booking: any) => {
        const total = booking.total_price || 0
        const breakdown = booking.price_breakdown || {}
        const platformFee = breakdown.service_fee || 100
        const instructorFee = breakdown.instructor_fee || 0
        const studioFee = breakdown.studio_fee || (total - platformFee - instructorFee)

        acc.totalRevenue += total
        acc.totalPlatformFees += platformFee
        acc.totalStudioFees += studioFee
        acc.totalInstructorFees += instructorFee
        acc.bookingCount += 1

        // Daily aggregation for charts
        const date = new Date(booking.created_at).toISOString().split('T')[0]
        if (!acc.daily[date]) {
            acc.daily[date] = { date, revenue: 0, platformFees: 0, bookings: 0 }
        }
        acc.daily[date].revenue += total
        acc.daily[date].platformFees += platformFee
        acc.daily[date].bookings += 1

        // Transaction list for CSV
        acc.transactions.push({
            id: booking.id,
            date: booking.created_at,
            type: 'Booking',
            client: booking.client?.full_name || '-',
            studio: booking.slots?.studios?.name || '-',
            instructor: booking.instructor?.full_name || '-',
            total_amount: total,
            platform_fee: platformFee,
            studio_fee: studioFee,
            instructor_fee: instructorFee
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

    // Add payouts to transactions for CSV
    payouts?.forEach(p => {
        stats.transactions.push({
            id: 'payout',
            date: p.created_at,
            type: 'Payout',
            client: '-',
            studio: p.studio_id ? 'Studio Payout' : '-',
            instructor: p.instructor_id ? 'Instructor Payout' : '-',
            total_amount: -Number(p.amount),
            platform_fee: 0,
            studio_fee: 0,
            instructor_fee: 0
        })
    })

    // Sort transactions by date descending
    stats.transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
        ...stats,
        dailyData: Object.values(stats.daily)
    }
}

// ─── CSV EXPORT ACTIONS ─────────────────────────────────────────────────────

export async function getPayoutsExport() {
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

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
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

    let query = supabase
        .from('bookings')
        .select(`
            id,
            created_at,
            total_price,
            price_breakdown,
            client: profiles!client_id(full_name),
            instructor: profiles!instructor_id(full_name),
            slots(start_time, studios(name))
                `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

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
            'Date': new Date(b.created_at).toLocaleDateString(),
            'Session Date': slots?.start_time ? new Date(slots.start_time).toLocaleDateString() : '',
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
    const supabase = await createClient()

    if (!(await verifyAdmin(supabase))) {
        return { error: 'Unauthorized: Admin access required.' }
    }

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
    const isStatusQuery = ['pending', 'approved', 'admin_approved', 'confirmed', 'paid', 'cancelled', 'expired', 'completed', 'rejected'].includes(cleanQuery.toLowerCase());

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
    let profileQuery = supabase.from('profiles').select('id, full_name, role, contact_number, is_founding_partner, gov_id_url, gov_id_expiry, bir_url, tin');

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
                    tin: p.tin
                } : null
            });
        });
    }

    // Search Studios
    let studioQuery = supabase.from('studios').select('id, name, location, contact_number, is_founding_partner, bir_certificate_url, bir_certificate_expiry, gov_id_url, gov_id_expiry, mayors_permit_url, mayors_permit_expiry, secretary_certificate_url, secretary_certificate_expiry, insurance_url, insurance_expiry, space_photos_urls');

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
                    secretaryCertExpiry: s.secretary_certificate_expiry,
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

    const now = new Date();
    const active = bookings.filter((b: any) => {
        const endTime = new Date(b.slots?.end_time);
        return endTime > now && ['approved', 'confirmed', 'admin_approved'].includes(b.status);
    });

    const past = bookings.filter((b: any) => {
        const endTime = new Date(b.slots?.end_time);
        return endTime <= now || ['completed', 'cancelled', 'expired', 'rejected'].includes(b.status);
    });

    return { active, past };
}
