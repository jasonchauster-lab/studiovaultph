'use client'

import { useState } from 'react'
import { Star, User, Building2 } from 'lucide-react'
import ReviewModal from '@/components/reviews/ReviewModal'

interface BookingForReview {
    id: string
    client_id: string
    instructor_id: string
    customer_reviewed_instructor?: boolean
    customer_reviewed_studio?: boolean
    slots: { start_time: string; studios: { name: string } | { name: string }[] } | null
    instructor: { id: string; full_name: string } | null
    client: { id: string; full_name: string } | null
}

interface LeaveReviewButtonProps {
    booking: BookingForReview
    currentUserId: string
    studioOwnerId: string | null
    studioName: string
}

type ReviewTarget = 'instructor' | 'studio'

export default function LeaveReviewButton({ booking, currentUserId, studioOwnerId, studioName }: LeaveReviewButtonProps) {
    const [activeTarget, setActiveTarget] = useState<ReviewTarget | null>(null)
    const [reviewedInstructor, setReviewedInstructor] = useState(booking.customer_reviewed_instructor ?? false)
    const [reviewedStudio, setReviewedStudio] = useState(booking.customer_reviewed_studio ?? false)

    const getFirst = <T,>(val: T | T[]): T | undefined => Array.isArray(val) ? val[0] : val
    const instructor = getFirst(booking.instructor)

    const handleSuccess = (target: ReviewTarget) => {
        setActiveTarget(null)
        if (target === 'instructor') setReviewedInstructor(true)
        else setReviewedStudio(true)
    }

    const allDone = reviewedInstructor && (!studioOwnerId || reviewedStudio)

    if (allDone) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                <Star className="w-3 h-3 fill-green-600" />
                All Reviewed
            </span>
        )
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Rate Instructor */}
            {!reviewedInstructor ? (
                <button
                    onClick={() => setActiveTarget('instructor')}
                    className="flex items-center gap-1.5 text-xs font-medium text-charcoal-900 bg-cream-100 hover:bg-charcoal-900 hover:text-white border border-charcoal-200 px-3 py-1.5 rounded-full transition-colors"
                >
                    <User className="w-3 h-3" />
                    Rate Instructor
                </button>
            ) : (
                <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <User className="w-3 h-3" /> Instructor ✓
                </span>
            )}

            {/* Rate Studio */}
            {studioOwnerId && (
                !reviewedStudio ? (
                    <button
                        onClick={() => setActiveTarget('studio')}
                        className="flex items-center gap-1.5 text-xs font-medium text-charcoal-900 bg-cream-100 hover:bg-charcoal-900 hover:text-white border border-charcoal-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <Building2 className="w-3 h-3" />
                        Rate Studio
                    </button>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                        <Building2 className="w-3 h-3" /> Studio ✓
                    </span>
                )
            )}

            {/* Instructor Review Modal */}
            {activeTarget === 'instructor' && (
                <ReviewModal
                    booking={booking}
                    currentUserId={currentUserId}
                    isInstructor={false}
                    revieweeId={booking.instructor_id}
                    revieweeName={instructor?.full_name ?? 'Your Instructor'}
                    reviewContext="Instructor"
                    onClose={() => setActiveTarget(null)}
                    onSuccess={() => handleSuccess('instructor')}
                />
            )}

            {/* Studio Review Modal */}
            {activeTarget === 'studio' && studioOwnerId && (
                <ReviewModal
                    booking={booking}
                    currentUserId={currentUserId}
                    isInstructor={false}
                    revieweeId={studioOwnerId}
                    revieweeName={studioName}
                    reviewContext="Studio"
                    onClose={() => setActiveTarget(null)}
                    onSuccess={() => handleSuccess('studio')}
                />
            )}
        </div>
    )
}
