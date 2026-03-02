'use server'

import { createClient } from '@/lib/supabase/server'
import { getManilaTodayStr } from '@/lib/timezone'
import { autoCompleteBookings, unlockMaturedFunds } from '@/lib/wallet'
import { revalidatePath } from 'next/cache'

export async function getEarningsData(studioId: string, startDate?: string, endDate?: string) {
    console.log(`[getEarningsData] Fetching for studio: ${studioId}, range: ${startDate} - ${endDate}`)
    const supabase = await createClient()

    try {
        // Run financial jobs lazily
        console.log('[getEarningsData] Running wallet jobs...')
        await Promise.allSettled([
            autoCompleteBookings(),
            unlockMaturedFunds()
        ]).catch(e => console.error('[getEarningsData] Wallet jobs error:', e))

        // 1. Get Studio & Owner details
        console.log('[getEarningsData] Fetching studio info...')
        const { data: studio, error: studioErr } = await supabase
            .from('studios')
            .select('owner_id, payout_approval_status')
            .eq('id', studioId)
            .maybeSingle()

        if (studioErr) {
            console.error('[getEarningsData] Studio fetch error:', studioErr)
            return { error: `Studio access error: ${studioErr.message}` }
        }

        const ownerId = studio?.owner_id
        console.log(`[getEarningsData] Owner ID: ${ownerId}`)

        const { data: profile, error: profileErr } = ownerId
            ? await supabase.from('profiles').select('available_balance, pending_balance').eq('id', ownerId).maybeSingle()
            : { data: null, error: null }

        if (profileErr) {
            console.error('[getEarningsData] Profile fetch error:', profileErr)
        }

        // 2. Fetch slot IDs
        console.log('[getEarningsData] Fetching slots...')
        const { data: studioSlots, error: slotsError } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', studioId)

        if (slotsError) {
            console.error('[getEarningsData] Slots fetch error:', slotsError)
            return { error: `Failed to fetch slot data: ${slotsError.message}` }
        }

        const slotIds = studioSlots?.map((s: any) => s.id) ?? []
        if (slotIds.length === 0) {
            console.log('[getEarningsData] No slots found for studio.')
            return {
                bookings: [],
                payouts: [],
                transactions: [],
                summary: {
                    totalEarnings: 0,
                    totalCompensation: 0,
                    totalPenalty: 0,
                    netEarnings: 0,
                    totalPaidOut: 0,
                    pendingPayouts: 0,
                    availableBalance: Number(profile?.available_balance || 0),
                    pendingBalance: Number(profile?.pending_balance || 0),
                    payoutApprovalStatus: studio?.payout_approval_status || 'none'
                }
            }
        }

        // 3. Get all relevant bookings (active + late cancelled with potential charges)
        console.log(`[getEarningsData] Fetching bookings for ${slotIds.length} slots...`)
        let bookingsQuery = supabase
            .from('bookings')
            .select(`
                *,
                client:profiles!client_id(full_name),
                instructor:profiles!instructor_id(full_name),
                slots!inner(start_time, end_time, studios(name))
            `)
            .in('slot_id', slotIds)
            .or('status.in.(approved,completed,cancelled_charged,cancelled_refunded),payment_status.eq.submitted')
            .order('created_at', { ascending: false })

        if (startDate) bookingsQuery = bookingsQuery.gte('slots.start_time', startDate)
        if (endDate) bookingsQuery = bookingsQuery.lte('slots.start_time', endDate)

        const { data: bookings, error: bookingsError } = await bookingsQuery

        if (bookingsError) {
            console.error('[getEarningsData] Bookings fetch error:', bookingsError)
            return { error: `Failed to fetch earnings data: ${bookingsError.message}` }
        }

        // 4. Get all payout requests
        console.log('[getEarningsData] Fetching payouts...')
        let payoutsQuery = supabase
            .from('payout_requests')
            .select('*')
            .eq('studio_id', studioId)
            .order('created_at', { ascending: false })

        if (startDate) payoutsQuery = payoutsQuery.gte('created_at', startDate)
        if (endDate) payoutsQuery = payoutsQuery.lte('created_at', endDate)

        const { data: payouts, error: payoutsError } = await payoutsQuery

        if (payoutsError) {
            console.error('[getEarningsData] Payouts fetch error:', payoutsError)
            return { error: `Failed to fetch payout history: ${payoutsError.message}` }
        }

        // 5. Calculate Totals
        let grossEarnings = 0
        let totalCompensation = 0 // Received from Instructor Penalties
        let totalPenalty = 0 // Paid as Displacement Fees

        bookings?.forEach(b => {
            const breakdown = b.price_breakdown as any
            const studioFee = Number(breakdown?.studio_fee || 0)
            const penaltyProcessed = breakdown?.penalty_processed === true
            const penaltyAmount = Number(breakdown?.penalty_amount || 0)
            const initiator = breakdown?.refund_initiator

            // Scenario A: Successful or Pending Booking (awaiting approval)
            if (['approved', 'completed', 'cancelled_charged'].includes(b.status) || b.payment_status === 'submitted') {
                grossEarnings += studioFee
            }

            // Scenario B: Compensation (Instructor cancelled late)
            if (penaltyProcessed && initiator === 'instructor') {
                totalCompensation += penaltyAmount
            }

            // Scenario C: Penalty (Studio cancelled late)
            if (penaltyProcessed && initiator === 'studio') {
                totalPenalty += penaltyAmount
            }
        })

        const totalPaidOut = payouts
            ?.filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0

        const totalPending = payouts
            ?.filter(p => p.status === 'pending' || p.status === 'approved')
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0

        // Net Earnings logic
        const netEarnings = grossEarnings + totalCompensation - totalPenalty

        // 6. Unified Transactions for CSV
        const transactions: any[] = []
        const wrap = (val: any) => Array.isArray(val) ? val[0] : val

        bookings?.forEach(b => {
            const breakdown = b.price_breakdown as any
            const studioFee = Number(breakdown?.studio_fee || 0)
            const slot = wrap(b.slots)
            const studioName = slot?.studios?.name
            const clientName = wrap(b.client)?.full_name
            const instructorName = wrap(b.instructor)?.full_name

            const penaltyProcessed = breakdown?.penalty_processed === true
            const penaltyAmount = Number(breakdown?.penalty_amount || 0)
            const initiator = breakdown?.refund_initiator

            // Add the booking transaction itself if valid or pending verification
            if (['approved', 'completed', 'cancelled_charged'].includes(b.status) || b.payment_status === 'submitted') {
                transactions.push({
                    date: slot?.start_time || b.created_at,
                    type: b.payment_status === 'submitted' && b.status === 'pending' ? 'Booking (Verification)' : 'Booking',
                    client: clientName,
                    instructor: instructorName,
                    studio: studioName,
                    total_amount: studioFee,
                    details: `${b.price_breakdown?.quantity || 1} x ${b.price_breakdown?.equipment || 'Session'}`
                })
            }

            // Add Compensation entry
            if (penaltyProcessed && initiator === 'instructor') {
                transactions.push({
                    date: b.updated_at || b.created_at,
                    type: 'Cancellation Compensation',
                    client: clientName,
                    instructor: instructorName,
                    studio: studioName,
                    total_amount: penaltyAmount,
                    details: 'Late cancellation by instructor'
                })
            }

            // Add Penalty entry
            if (penaltyProcessed && initiator === 'studio') {
                transactions.push({
                    date: b.updated_at || b.created_at,
                    type: 'Cancellation Penalty',
                    client: clientName,
                    instructor: instructorName,
                    studio: studioName,
                    total_amount: -penaltyAmount,
                    details: 'Late cancellation displacement fee'
                })
            }
        })

        payouts?.forEach(p => {
            transactions.push({
                date: p.created_at,
                type: 'Payout',
                status: p.status,
                total_amount: -Number(p.amount),
                details: `Withdrawal via ${p.payment_method}`
            })
        })

        // 4.5. Get Wallet Top-ups & Admin Adjustments
        const { data: walletActions } = ownerId ? await supabase
            .from('wallet_top_ups')
            .select('*')
            .eq('user_id', ownerId)
            .eq('status', 'approved')
            : { data: null };

        walletActions?.forEach(wa => {
            const isAdjustment = wa.type === 'admin_adjustment';
            transactions.push({
                date: wa.processed_at || wa.updated_at || wa.created_at,
                type: isAdjustment ? 'Direct Adjustment' : 'Wallet Top-Up',
                total_amount: wa.amount, // Signed amount
                details: wa.admin_notes || (isAdjustment ? 'Manual balance adjustment' : 'Gcash/Bank Top-up')
            });
        });

        // Map wallet actions to "booking-like" objects for the UI
        const mappedWalletActions = walletActions?.map(wa => ({
            id: wa.id,
            created_at: wa.processed_at || wa.updated_at || wa.created_at,
            type: wa.type, // 'top_up' or 'admin_adjustment'
            admin_notes: wa.admin_notes,
            amount: wa.amount,
            // Mock empty fields for UI compatibility
            client: null,
            slots: null,
            price_breakdown: { studio_fee: wa.amount }
        })) || [];

        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        console.log('[getEarningsData] Success.')
        return {
            bookings: [...(bookings || []), ...mappedWalletActions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
            payouts,
            transactions,
            summary: {
                totalEarnings: grossEarnings,
                totalCompensation,
                totalPenalty,
                netEarnings,
                totalPaidOut,
                pendingPayouts: totalPending,
                availableBalance: Number(profile?.available_balance || 0),
                pendingBalance: Number(profile?.pending_balance || 0),
                payoutApprovalStatus: studio?.payout_approval_status || 'none'
            }
        }
    } catch (err: any) {
        console.error('[getEarningsData] Global Crash:', err)
        return { error: `Critical system error: ${err.message || 'Unknown error'}` }
    }
}

export async function requestPayout(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const studioId = formData.get('studioId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const paymentMethod = formData.get('paymentMethod') as string
    const accountName = formData.get('accountName') as string
    const accountNumber = formData.get('accountNumber') as string
    const bankName = formData.get('bankName') as string

    if (!studioId || !amount || !paymentMethod || !accountName || !accountNumber) {
        return { error: 'All fields are required' }
    }

    if (amount <= 0) {
        return { error: 'Invalid amount' }
    }

    // Check approval status and document expiry
    const { data: studio } = await supabase
        .from('studios')
        .select('payout_approval_status, bir_certificate_expiry, mayors_permit_expiry, payout_lock')
        .eq('id', studioId).single()

    if (studio?.payout_approval_status !== 'approved') {
        return { error: 'Your payout application is pending or has not been approved yet. Please submit the required documents first.' }
    }

    if (studio?.payout_lock) {
        return { error: 'Withdrawals are currently locked for your studio. Please contact support.' }
    }

    const today = getManilaTodayStr()
    if ((studio?.bir_certificate_expiry && studio.bir_certificate_expiry < today)
        || (studio?.mayors_permit_expiry && studio.mayors_permit_expiry < today)) {
        return { error: 'One or more of your mandatory documents (BIR 2303 or Mayor\'s Permit) have expired. Please update them before requesting a payout.' }
    }


    // Re-verify balance server-side to prevent overdrawing
    const { summary, error: dataError } = await getEarningsData(studioId)
    if (dataError || !summary) {
        return { error: 'Could not verify balance. Please try again.' }
    }

    if (amount > summary.availableBalance) {
        return { error: `Insufficient balance. Available: ₱${summary.availableBalance.toLocaleString()}` }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 2. Perform atomic deduction
    const { error: deductError } = await supabase.rpc('deduct_available_balance', {
        user_id: user.id,
        amount
    })

    if (deductError) {
        return { error: 'Failed to process balance deduction.' };
    }

    const { error } = await supabase
        .from('payout_requests')
        .insert({
            studio_id: studioId,
            user_id: user.id,
            amount,
            payment_method: paymentMethod,
            account_name: accountName,
            account_number: accountNumber,
            bank_name: paymentMethod === 'bank_transfer' ? bankName : undefined,
            status: 'pending'
        })

    if (error) {
        console.error('Payout Request Error:', error)
        return { error: `Failed to submit payout request: ${error.message} (${error.code})` }
    }

    revalidatePath('/studio/earnings')
    return { success: true, message: 'Payout request submitted successfully!' }
}

export async function submitPayoutApplication(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const mayorsPermit = formData.get('mayorsPermit') as File
    const secretaryCertificate = formData.get('secretaryCertificate') as File
    const mayorsPermitExpiry = formData.get('mayorsPermitExpiry') as string
    const secretaryCertificateExpiry = formData.get('secretaryCertificateExpiry') as string

    if (!studioId || !mayorsPermit || !secretaryCertificate) {
        return { error: 'All documents are required.' }
    }

    const timestamp = Date.now()
    let permitPath = null
    let certPath = null

    // Upload Mayor's Permit
    if (mayorsPermit && mayorsPermit.size > 0) {
        const ext = mayorsPermit.name.split('.').pop()
        permitPath = `studios/${user.id}/mayors_permit_${timestamp}.${ext}`
        const { error: uploadError } = await supabase.storage.from('certifications').upload(permitPath, mayorsPermit)
        if (uploadError) {
            console.error('Mayors permit upload error:', uploadError)
            return { error: 'Failed to upload Mayor\'s Permit.' }
        }
    }

    // Upload Secretary's Certificate
    if (secretaryCertificate && secretaryCertificate.size > 0) {
        const ext = secretaryCertificate.name.split('.').pop()
        certPath = `studios/${user.id}/secretary_cert_${timestamp}.${ext}`
        const { error: uploadError } = await supabase.storage.from('certifications').upload(certPath, secretaryCertificate)
        if (uploadError) {
            console.error('Secretary certificate upload error:', uploadError)
            return { error: 'Failed to upload Secretary\'s Certificate.' }
        }
    }

    const { error: updateError } = await supabase
        .from('studios')
        .update({
            payout_approval_status: 'pending',
            mayors_permit_url: permitPath,
            secretary_certificate_url: certPath,
            mayors_permit_expiry: mayorsPermitExpiry,
            secretary_certificate_expiry: secretaryCertificateExpiry
        })
        .eq('id', studioId)

    if (updateError) {
        console.error('Failed to update studio status:', updateError)
        return { error: 'Failed to submit application. Please try again later.' }
    }

    revalidatePath('/studio/earnings')
    return { success: true, message: 'Application submitted successfully! It is now pending admin approval.' }
}
