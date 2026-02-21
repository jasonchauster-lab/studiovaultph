'use client'

import { useState } from 'react'
import { bookInstructorSession } from '@/app/(dashboard)/customer/actions'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BookSessionButtonProps {
    instructorId: string
    date: string
    time: string
    location: string
    equipment: string
}

export default function BookSessionButton({
    instructorId,
    date,
    time,
    location,
    equipment
}: BookSessionButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState<string>('')
    const router = useRouter()

    const handleBook = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation() // Prevent navigating to profile if card is clickable

        if (!confirm(`Confirm booking for ${date} at ${time}?`)) return

        setIsLoading(true)
        setStatus('idle')
        setMessage('')

        try {
            const result = await bookInstructorSession(instructorId, date, time, location, equipment)

            if (result.success) {
                setStatus('success')
                setMessage(`Booked at ${result.studioName}!`)
                // Router refresh happen in action, but we can also do it here
            } else {
                setStatus('error')
                setMessage(result.error || 'Failed to book.')
            }
        } catch (err) {
            setStatus('error')
            setMessage('An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'success') {
        return (
            <div className="w-full py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border border-green-200">
                <Check className="w-4 h-4" />
                {message}
            </div>
        )
    }

    return (
        <div className="w-full space-y-2">
            <button
                onClick={handleBook}
                disabled={isLoading}
                className="w-full py-2 bg-charcoal-900 text-cream-50 rounded-lg text-sm font-medium hover:bg-charcoal-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Booking...
                    </>
                ) : (
                    'Book Session'
                )}
            </button>
            {status === 'error' && (
                <div className="text-xs text-red-600 flex items-center gap-1 justify-center">
                    <AlertCircle className="w-3 h-3" />
                    {message}
                </div>
            )}
        </div>
    )
}
