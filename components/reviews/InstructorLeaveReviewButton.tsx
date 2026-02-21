'use client'

import { useState } from 'react'
import { Star, User, Building2 } from 'lucide-react'
import ReviewModal from '@/components/reviews/ReviewModal'

interface InstructorBookingForReview {
    id: string
    client_id: string
    instructor_id: string
    instructor_reviewed?: boolean
    instructor_reviewed_studio?: boolean
    slots: { start_time: string; studios: { name: string } | { name: string }[] } | null
    instructor: { id: string; full_name: string } | null
    client: { id: string; full_name: string } | null
}

interface InstructorLeaveReviewButtonProps {
    booking: InstructorBookingForReview
    currentUserId: string
    studioOwnerId: string | null
    studioName: string
    clientId: string | null
    clientName: string
    hideClientReview?: boolean  // true when client_id === instructor_id (self-book)
}

type ReviewTarget = 'client' | 'studio'

export default function InstructorLeaveReviewButton({
    booking,
    currentUserId,
    studioOwnerId,
    studioName,
    clientId,
    clientName,
    hideClientReview = false,
}: InstructorLeaveReviewButtonProps) {
    const [activeTarget, setActiveTarget] = useState<ReviewTarget | null>(null)
    const [reviewedClient, setReviewedClient] = useState(booking.instructor_reviewed ?? false)
    const [reviewedStudio, setReviewedStudio] = useState(booking.instructor_reviewed_studio ?? false)

    const handleSuccess = (target: ReviewTarget) => {
        setActiveTarget(null)
        if (target === 'client') setReviewedClient(true)
        else setReviewedStudio(true)
    }

    const clientDone = hideClientReview || reviewedClient
    const studioDone = !studioOwnerId || reviewedStudio

    if (clientDone && studioDone) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                <Star className="w-3 h-3 fill-green-600" />
                All Reviewed
            </span>
        )
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Rate Client */}
            {!hideClientReview && (
                !reviewedClient ? (
                    <button
                        onClick={() => setActiveTarget('client')}
                        className="flex items-center gap-1.5 text-xs font-medium text-charcoal-900 bg-cream-100 hover:bg-charcoal-900 hover:text-white border border-charcoal-200 px-3 py-1.5 rounded-full transition-colors"
                    >
                        <User className="w-3 h-3" />
                        Rate Client
                    </button>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                        <User className="w-3 h-3" /> Client ✓
                    </span>
                )
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

            {/* Client Review Modal */}
            {activeTarget === 'client' && clientId && (
                <ReviewModal
                    booking={booking}
                    currentUserId={currentUserId}
                    isInstructor={true}
                    revieweeId={clientId}
                    revieweeName={clientName}
                    reviewContext="Client"
                    onClose={() => setActiveTarget(null)}
                    onSuccess={() => handleSuccess('client')}
                />
            )}

            {/* Studio Review Modal */}
            {activeTarget === 'studio' && studioOwnerId && (
                <ReviewModal
                    booking={booking}
                    currentUserId={currentUserId}
                    isInstructor={true}
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
