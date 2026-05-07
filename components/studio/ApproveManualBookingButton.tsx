'use client'

import { useState } from 'react'
import { approveManualBooking } from '@/app/(dashboard)/studio/booking-actions'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ApproveManualBookingButton({ bookingId }: { bookingId: string }) {
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this booking? This will confirm that you have received the payment.')) return
        
        setIsPending(true)
        const res = await approveManualBooking(bookingId)
        setIsPending(false)

        if (res.error) {
            alert(res.error)
        } else {
            router.refresh()
        }
    }

    return (
        <button
            onClick={handleApprove}
            disabled={isPending}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
        >
            {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <CheckCircle className="w-3.5 h-3.5" />
            )}
            Approve Payment
        </button>
    )
}
