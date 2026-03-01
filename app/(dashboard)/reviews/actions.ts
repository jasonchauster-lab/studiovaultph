'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ReviewRole, CUSTOMER_TAGS, INSTRUCTOR_TAGS } from '@/lib/reviews'
export type { ReviewRole } from '@/lib/reviews'

const DOUBLE_BLIND_HOURS = 48

/**
 * Submit a review for a completed booking.
 * role: the current user's role (used to update the correct flag on the booking).
 */
export async function submitReview({
    bookingId,
    revieweeId,
    role,
    rating,
    comment,
    tags,
}: {
    bookingId: string
    revieweeId: string
    role: ReviewRole
    rating: number
    comment: string
    tags: string[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Verify the booking is completed or approved & past
    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            client_id, 
            instructor_id, 
            customer_reviewed_instructor, 
            customer_reviewed_studio, 
            instructor_reviewed,
            slots(end_time)
        `)
        .eq('id', bookingId)
        .single()

    if (bookingError || !booking) return { error: 'Booking not found.' }

    const isPast = booking.slots ? new Date((booking.slots as any).end_time) < new Date() : false
    const canReview = ['completed', 'cancelled_charged'].includes(booking.status) || (booking.status === 'approved' && isPast)

    if (!canReview) {
        return { error: 'You can only review a session that has finished.' }
    }

    // 2. Ensure the current user is a participant
    const isCustomer = booking.client_id === user.id
    const isInstructor = booking.instructor_id === user.id
    if (!isCustomer && !isInstructor) return { error: 'You are not a participant of this booking.' }

    // 3. Insert the review - DB unique constraint (booking_id, reviewer_id, reviewee_id)
    //    will reject duplicates automatically.
    const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
            booking_id: bookingId,
            reviewer_id: user.id,
            reviewee_id: revieweeId,
            rating,
            comment,
            tags,
        })

    if (reviewError) {
        if (reviewError.code === '23505') return { error: 'You have already reviewed this person for this session.' }
        console.error('Review insert error:', reviewError)
        return { error: `Failed to submit review: ${reviewError.message}` }
    }

    // 4. Update the correct tracking flag on the booking
    if (isCustomer) {
        const isInstructorReview = revieweeId === booking.instructor_id
        const flagUpdate = isInstructorReview
            ? { customer_reviewed_instructor: true, customer_reviewed: true }
            : { customer_reviewed_studio: true }
        await supabase.from('bookings').update(flagUpdate).eq('id', bookingId)
    } else if (isInstructor) {
        // Instructor reviewing the client vs reviewing the studio
        const isClientReview = revieweeId === booking.client_id
        const flagUpdate = isClientReview
            ? { instructor_reviewed: true }
            : { instructor_reviewed_studio: true }
        await supabase.from('bookings').update(flagUpdate).eq('id', bookingId)
    }

    revalidatePath('/customer')
    revalidatePath('/instructor')

    return { success: true }
}

/**
 * Fetch all completed or past-approved bookings for the current user that still need a review.
 * Returns bookings with joined slot + studio + counterpart profile info.
 */
export async function getPendingReviews() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized', bookings: [] }

    // Fetch profile to know the role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isInstructor = profile?.role === 'instructor'

    let query = supabase
        .from('bookings')
        .select(`
            id,
            status,
            customer_reviewed,
            instructor_reviewed,
            client_id,
            instructor_id,
            slots (
                start_time,
                end_time,
                studios (
                    name
                )
            ),
            client:profiles!client_id (
                id,
                full_name,
                avatar_url
            ),
            instructor:profiles!instructor_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .in('status', ['completed', 'approved', 'cancelled_charged'])

    if (isInstructor) {
        query = query
            .eq('instructor_id', user.id)
            .eq('instructor_reviewed', false)
    } else {
        query = query
            .eq('client_id', user.id)
            .eq('customer_reviewed', false)
    }

    const { data: bookings, error } = await query.order('created_at', { ascending: false })

    if (error) {
        console.error('Pending reviews fetch error:', error)
        return { error: error.message, bookings: [] }
    }

    // Filter for truly past sessions if they are only 'approved'
    const now = new Date()
    const finalBookings = (bookings || []).filter(b => {
        if (['completed', 'cancelled_charged'].includes(b.status)) return true
        if (b.status === 'approved') {
            const endTime = new Date((b.slots as any)?.end_time)
            return endTime < now
        }
        return false
    })

    return { bookings: finalBookings, isInstructor }
}

/**
 * Fetch public (unblinded) reviews for a given profile.
 * Double-blind logic:
 *   A review is visible if:
 *   a) The other party on the same booking has ALSO reviewed (mutual), OR
 *   b) The review was created more than 48 hours ago.
 */
export async function getPublicReviews(profileId: string) {
    const supabase = await createClient()

    // Fetch all reviews where this profile is the reviewee
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
            id,
            booking_id,
            reviewer_id,
            rating,
            comment,
            tags,
            created_at,
            reviewer:profiles!reviewer_id (
                full_name,
                avatar_url,
                role
            )
        `)
        .eq('reviewee_id', profileId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Get public reviews error:', error)
        return { reviews: [], averageRating: null, totalCount: 0 }
    }

    if (!reviews || reviews.length === 0) {
        return { reviews: [], averageRating: null, totalCount: 0 }
    }

    const now = Date.now()
    const cutoffMs = DOUBLE_BLIND_HOURS * 60 * 60 * 1000

    // For each review, check if the counterpart review exists (mutual) to apply double-blind
    const visibleReviews = await Promise.all(
        reviews.map(async (review) => {
            const createdAt = new Date(review.created_at).getTime()
            const isExpired = now - createdAt >= cutoffMs

            if (isExpired) return review // 48h passed - show it

            // Check if the counterpart has also reviewed this booking
            const { count } = await supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('booking_id', review.booking_id)
                .neq('reviewer_id', review.reviewer_id) // The other party's review

            if ((count ?? 0) > 0) return review // Mutual - show it

            return null // Still blinded
        })
    )

    const filtered = visibleReviews.filter(Boolean) as typeof reviews

    const totalCount = filtered.length
    const averageRating =
        totalCount > 0
            ? Math.round((filtered.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
            : null

    return { reviews: filtered, averageRating, totalCount }
}
