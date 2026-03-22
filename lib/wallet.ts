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

    // Parallelize RPC calls — no ordering dependency between individual unlocks.
    const results = await Promise.all(
        maturedBookings.map(b =>
            supabase.rpc('unlock_booking_funds_atomic', { target_booking_id: b.id })
        )
    )
    const count = results.filter(r => r.data === true).length

    return { count }
}

export async function processInstantPayout(bookingId: string) {
    const supabase = await createClient()

    const { data: success, error: rpcError } = await supabase.rpc('process_instant_payout_atomic', {
        target_booking_id: bookingId
    })

    if (rpcError) {
        console.error('RPC Error processing instant payout:', rpcError)
        return { error: 'Failed to process instant payout atomically.' }
    }

    if (!success) {
        return { error: 'Booking not eligible for instant payout.' }
    }

    return { success: true }
}

/**
 * Scans for approved/cancelled bookings where the associated slot ended > 1 hour ago.
 * Approved bookings go to security hold. Cancelled bookings are instantly paid out.
 */
export async function autoCompleteBookings() {
    const supabase = await createClient()
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 1)

    // Fetch bookings that are 'approved' or 'cancelled_charged' where the slot date is today or earlier 
    // We add 1 day to the date filter just to be safe with timezone boundaries
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 1);

    const { data: pastBookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            slots!inner(date, end_time)
        `)
        .or('status.eq.approved,status.eq.cancelled_charged')
        .lte('slots.date', dateLimit.toISOString().split('T')[0])

    if (error) {
        console.error('Error fetching bookings to auto-complete:', error)
        return { count: 0, error }
    }

    if (!pastBookings || pastBookings.length === 0) {
        return { count: 0 }
    }

    // Filter explicitly in JS using combined Manila time
    const toComplete = pastBookings.filter(b => {
        if (!b.slots) return false;
        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
        if (!slot.date || !slot.end_time) return false;

        // Construct standard ISO string assuming PH timezone
        const slotDate = new Date(`${slot.date}T${slot.end_time}+08:00`);
        return slotDate <= cutoffTime;
    });

    if (toComplete.length === 0) {
        return { count: 0 }
    }

    const results = await Promise.all(toComplete.map(async b => {
        if (b.status === 'cancelled_charged') {
            return processInstantPayout(b.id)
        } else {
            return processBookingCompletion(b.id)
        }
    }))

    const completedCount = results.filter(r => r.success).length
    return { count: completedCount }
}

/**
 * Finds pending bookings that have passed their expires_at deadline
 * (payment was never submitted) and releases their slots + refunds wallet.
 * Also handles legacy bookings with NULL expires_at by falling back to created_at + 15 min.
 */
export async function expireAbandonedBookings() {
    const supabase = await createClient()
    const { data: result, error: rpcError } = await supabase.rpc('expire_all_abandoned_bookings_atomic');

    if (rpcError) {
        console.error('Bulk Expiration Error:', rpcError);
        return { count: 0, error: rpcError.message };
    }

    return { count: result?.expired_count || 0 };
}
