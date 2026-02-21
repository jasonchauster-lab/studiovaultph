'use client'

import { useState } from 'react'
import ReviewModal from '@/components/reviews/ReviewModal'
import { Star } from 'lucide-react'

interface PendingBooking {
    id: string
    client_id: string
    instructor_id: string
    slots: { start_time: string; studios: { name: string } | { name: string }[] } | null
    client: { id: string; full_name: string } | null
    instructor: { id: string; full_name: string } | null
}

interface ReviewTriggerProps {
    pendingBookings: PendingBooking[]
    currentUserId: string
    isInstructor: boolean
}

export default function ReviewTrigger({ pendingBookings, currentUserId, isInstructor }: ReviewTriggerProps) {
    const [queue, setQueue] = useState<PendingBooking[]>(pendingBookings)
    const [successCount, setSuccessCount] = useState(0)

    const current = queue[0] ?? null

    const dismiss = () => setQueue(prev => prev.slice(1))

    const handleSuccess = () => {
        setSuccessCount(c => c + 1)
        dismiss()
    }

    if (!current) {
        if (successCount > 0) {
            return (
                <div className="fixed bottom-6 right-6 z-50 bg-green-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
                    <Star className="w-4 h-4 fill-white" />
                    {successCount} review{successCount > 1 ? 's' : ''} submitted. Thank you!
                </div>
            )
        }
        return null
    }

    return (
        <ReviewModal
            booking={current}
            currentUserId={currentUserId}
            isInstructor={isInstructor}
            onClose={dismiss}
            onSuccess={handleSuccess}
        />
    )
}
