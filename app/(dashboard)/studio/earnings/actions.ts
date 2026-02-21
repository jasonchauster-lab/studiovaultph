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
    const { data: studio } = await supabase.from('studios').select('owner_id').eq('id', studioId).single()
    const ownerId = studio?.owner_id

    const { data: profile } = ownerId
        ? await supabase.from('profiles').select('available_balance, pending_balance').eq('id', ownerId).single()
        : { data: null }

    // 1. Get all approved bookings for total earnings
    let bookingsQuery = supabase
        .from('bookings')
        .select(`
            *,
            client:profiles!client_id(full_name),
            instructor:profiles!instructor_id(full_name),
            slots!inner(start_time, end_time, studios(name))
        `)
        .eq('slots.studio_id', studioId)
        .eq('status', 'approved')
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
            pendingBalance: profile?.pending_balance || 0
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
