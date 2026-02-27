import { createClient } from './supabase/server'

/**
 * Moves calculated earnings from a completed booking into the pending_balance 
 * of the instructor and the studio owner.
 */
export async function processBookingCompletion(bookingId: string) {
    const supabase = await createClient()

    const { data: success, error: rpcError } = await supabase.rpc('process_booking_completion_atomic', {
        target_booking_id: bookingId
    })

    if (rpcError) {
        console.error('RPC Error processing completion:', rpcError)
        return { error: 'Failed to process completion atomically.' }
    }

    if (!success) {
        return { error: 'Booking not eligible for completion.' }
    }

    return { success: true }
}

/**
 * Scans for bookings completed > 24 hours ago that haven't been unlocked yet,
 * and moves funds from pending_balance to available_balance.
 */
export async function unlockMaturedFunds() {
    const supabase = await createClient()
    const holdTime = new Date()
    holdTime.setHours(holdTime.getHours() - 24)

    // 1. Find matured bookings
    const { data: maturedBookings, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('status', 'completed')
        .eq('funds_unlocked', false)
        .lte('completed_at', holdTime.toISOString())

    if (error || !maturedBookings) return { count: 0 }

    let count = 0;
    for (const b of maturedBookings) {
        const { data: success } = await supabase.rpc('unlock_booking_funds_atomic', {
            target_booking_id: b.id
        })
        if (success) count++;
    }

    return { count }
}

/**
 * Scans for approved bookings where the associated slot ended > 1 hour ago.
 * Automatically processes their completion to start the 24h security hold.
 */
export async function autoCompleteBookings() {
    const supabase = await createClient()
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 1)

    // Find bookings that are 'approved' and the slot end_time is past the cutoff
    const { data: pastBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            slots!inner(end_time)
        `)
        .eq('status', 'approved')
        .lte('slots.end_time', cutoffTime.toISOString())

    if (error) {
        console.error('Error fetching bookings to auto-complete:', error)
        return { count: 0, error }
    }

    if (!pastBookings || pastBookings.length === 0) {
        return { count: 0 }
    }

    let completedCount = 0
    for (const b of pastBookings) {
        const result = await processBookingCompletion(b.id)
        if (result.success) {
            completedCount++
        }
    }

    return { count: completedCount }
}

/**
 * Finds pending bookings that have passed their expires_at deadline
 * (payment was never submitted) and releases their slots + refunds wallet.
 * Also handles legacy bookings with NULL expires_at by falling back to created_at + 15 min.
 */
export async function expireAbandonedBookings() {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    // Query A: bookings with explicit expires_at set and past due
    const { data: expiredByTimer } = await supabase
        .from('bookings')
        .select('id, slot_id, client_id, booked_slot_ids, price_breakdown')
        .eq('status', 'pending')
        .not('expires_at', 'is', null)
        .lte('expires_at', now)
        .is('payment_proof_url', null)

    // Query B: legacy bookings with NULL expires_at that are older than 15 minutes
    const { data: expiredLegacy } = await supabase
        .from('bookings')
        .select('id, slot_id, client_id, booked_slot_ids, price_breakdown')
        .eq('status', 'pending')
        .is('expires_at', null)
        .lte('created_at', fifteenMinutesAgo)
        .is('payment_proof_url', null)

    const expiredBookings = [...(expiredByTimer || []), ...(expiredLegacy || [])]

    if (expiredBookings.length === 0) {
        return { count: 0 }
    }

    let expiredCount = 0
    for (const booking of expiredBookings) {
        try {
            // 1. Mark booking as expired
            await supabase.from('bookings')
                .update({ status: 'expired' })
                .eq('id', booking.id)

            // 2. Release all associated slots
            const allSlotIds = [booking.slot_id, ...(booking.booked_slot_ids || [])].filter(Boolean)
            if (allSlotIds.length > 0) {
                await supabase.from('slots')
                    .update({ is_available: true })
                    .in('id', allSlotIds)
            }

            // 3. Refund wallet deduction if any
            const breakdown = booking.price_breakdown as any
            const walletDeduction = Number(breakdown?.wallet_deduction || 0)
            if (walletDeduction > 0 && booking.client_id) {
                await supabase.rpc('increment_available_balance', {
                    user_id: booking.client_id,
                    amount: walletDeduction
                })
            }

            expiredCount++
        } catch (err) {
            console.error(`Failed to expire booking ${booking.id}:`, err)
        }
    }

    return { count: expiredCount }
}
