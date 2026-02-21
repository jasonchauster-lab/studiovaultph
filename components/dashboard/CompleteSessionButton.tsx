'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { completeBooking } from '@/app/(dashboard)/admin/actions'
import { useRouter } from 'next/navigation'

interface CompleteSessionButtonProps {
    bookingId: string
}

export default function CompleteSessionButton({ bookingId }: CompleteSessionButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleComplete() {
        if (!confirm('Mark this session as completed? This will initiate the funds transfer process.')) return

        setLoading(true)
        try {
            const result = await completeBooking(bookingId)
            if (result.error) {
                alert(result.error)
            } else {
                router.refresh()
            }
        } catch (err) {
            console.error(err)
            alert('An error occurred while completing the session.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleComplete}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-medium px-4 py-2 bg-charcoal-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50"
        >
            <CheckCircle className="w-4 h-4" />
            {loading ? 'Processing...' : 'Complete Session'}
        </button>
    )
}
