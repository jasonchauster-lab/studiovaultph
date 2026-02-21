import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InstructorDashboardClient from '@/components/dashboard/InstructorDashboardClient'
import ReviewTrigger from '@/components/reviews/ReviewTrigger'
import { getPendingReviews } from '@/app/(dashboard)/reviews/actions'

export default async function InstructorDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check verification status
    const { data: certs } = await supabase
        .from('certifications')
        .select('verified')
        .eq('instructor_id', user.id)
        .limit(1)

    const cert = certs && certs.length > 0 ? certs[0] : null

    // If not verified (or no cert at all), redirect to onboarding
    if (!cert || !cert.verified) {
        redirect('/instructor/onboarding')
    }

    // Fetch pending reviews for the instructor
    const { bookings: pendingReviews, isInstructor } = await getPendingReviews()

    return (
        <>
            {pendingReviews && pendingReviews.length > 0 && (
                <ReviewTrigger
                    pendingBookings={pendingReviews as any}
                    currentUserId={user.id}
                    isInstructor={isInstructor ?? true}
                />
            )}
            <InstructorDashboardClient />
        </>
    )
}

