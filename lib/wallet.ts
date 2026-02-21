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
