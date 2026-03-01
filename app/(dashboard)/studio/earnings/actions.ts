'use server'

import { createClient } from '@/lib/supabase/server'
import { autoCompleteBookings, unlockMaturedFunds } from '@/lib/wallet'
import { revalidatePath } from 'next/cache'

export async function getEarningsData(studioId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()

    // Run financial jobs lazily when data is requested
    await Promise.allSettled([
        autoCompleteBookings(),
        unlockMaturedFunds()
    ])

    // 1. Get all approved bookings for total earnings
    // We only count 'approved' (paid) bookings
    const { data: studio } = await supabase.from('studios').select('owner_id, payout_approval_status').eq('id', studioId).single()
    const ownerId = studio?.owner_id

    const { data: profile } = ownerId
        ? await supabase.from('profiles').select('available_balance, pending_balance').eq('id', ownerId).single()
        : { data: null }

    // 1. First, fetch slot IDs for this studio (same approach as admin's getPartnerBookings)
    const { data: studioSlots, error: slotsError } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studioId)

    if (slotsError) {
        console.error('Error fetching slots:', slotsError)
        return { error: `Failed to fetch slot data: ${slotsError.message}` }
    }

    const slotIds = studioSlots?.map((s: any) => s.id) ?? []
    if (slotIds.length === 0) {
        // No slots means no bookings — return empty data
        return {
            bookings: [],
            payouts: [],
            transactions: [],
            summary: {
                totalEarnings: 0,
                totalPaidOut: 0,
                pendingPayouts: 0,
                availableBalance: profile?.available_balance || 0,
                pendingBalance: profile?.pending_balance || 0,
                payoutApprovalStatus: studio?.payout_approval_status || 'none'
            }
        }
    }

    // 2. Get all active bookings for these slots
    let bookingsQuery = supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name),
            instructor:profiles!instructor_id(full_name),
            slots(start_time, end_time, studios(name))
        `)
        .in('slot_id', slotIds)
        .in('status', ['approved', 'confirmed', 'admin_approved', 'paid'])
        .order('created_at', { ascending: false })

    if (startDate) bookingsQuery = bookingsQuery.gte('created_at', startDate)
    if (endDate) bookingsQuery = bookingsQuery.lte('created_at', endDate)

    const { data: bookings, error: bookingsError } = await bookingsQuery

    if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        return { error: `Failed to fetch earnings data: ${bookingsError.message} (Code: ${bookingsError.code})` }
    }

    // ... (query payouts) ...

    const first = (val: any) => Array.isArray(val) ? val[0] : val

    // 2. Get all payout requests
    let payoutsQuery = supabase
        .from('payout_requests')
        .select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })

    if (startDate) payoutsQuery = payoutsQuery.gte('created_at', startDate)
    if (endDate) payoutsQuery = payoutsQuery.lte('created_at', endDate)

    const { data: payouts, error: payoutsError } = await payoutsQuery

    if (payoutsError) {
        console.error('Error fetching payouts:', payoutsError)
        return { error: `Failed to fetch payout history: ${payoutsError.message}` }
    }

    // 3. Calculate Totals
    const totalEarnings = bookings?.reduce((sum, b) => {
        // Studio only earns the studio_fee part (total_price - 100 service fee)
        const studioFee = b.price_breakdown?.studio_fee || (b.total_price ? Math.max(0, b.total_price - 100) : 0);
        return sum + studioFee;
    }, 0) || 0

    // Sum of paid and pending payouts
    const totalPaidOut = payouts
        ?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0

    const totalPending = payouts
        ?.filter(p => p.status === 'pending' || p.status === 'approved')
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0

    // Available = Total Earnings - (Paid + Pending)
    // We treat pending as "reserved" so they can't double-request it.
    const availableBalance = totalEarnings - (totalPaidOut + totalPending)

    // 4. Unified Transactions for CSV
    const transactions: any[] = []

    bookings?.forEach(b => {
        const studioFee = b.price_breakdown?.studio_fee || (b.total_price ? Math.max(0, b.total_price - 100) : 0);

        const studioName = first(b.slots)?.studios?.name
        const instructorName = (b.instructor as any)?.full_name

        transactions.push({
            date: b.created_at,
            type: 'Booking',
            client: b.client?.full_name,
            instructor: instructorName,
            studio: studioName,
            total_amount: studioFee,
            details: `${b.price_breakdown?.quantity || 1} x ${b.price_breakdown?.equipment || 'Session'}`
        })
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

    // Sort by date desc
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
        bookings,
        payouts,
        transactions,
        summary: {
            totalEarnings,
            totalPaidOut,
            pendingPayouts: totalPending,
            availableBalance: profile?.available_balance || 0,
            pendingBalance: profile?.pending_balance || 0,
            payoutApprovalStatus: studio?.payout_approval_status || 'none'
        }
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

    const today = new Date().toISOString().split('T')[0]
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
