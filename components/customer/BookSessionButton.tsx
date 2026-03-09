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
            <div className="w-full py-4 px-6 bg-sage/10 text-sage rounded-[20px] text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-sage/20 shadow-sm animate-in fade-in zoom-in duration-500">
                <Check className="w-4 h-4" />
                {message}
            </div>
        )
    }

    return (
        <div className="w-full space-y-3">
            <button
                onClick={handleBook}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-charcoal text-white rounded-[20px] text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-cloud"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing
                    </>
                ) : (
                    'Book Session'
                )}
            </button>
            {status === 'error' && (
                <div className="text-[10px] font-bold text-red-400 flex items-center gap-1.5 justify-center animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {message}
                </div>
            )}
        </div>
    )
}
