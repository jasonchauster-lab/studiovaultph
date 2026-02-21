'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { triggerFundsUnlock } from '@/app/(dashboard)/admin/actions'
import { useRouter } from 'next/navigation'

export default function TriggerFundsUnlockButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleTrigger() {
        if (!confirm('Run financial jobs now? This will complete matured bookings AND unlock funds from pending to available.')) return

        setLoading(true)
        try {
            const result = await triggerFundsUnlock()
            alert(`Processed. Auto-completed: ${result.completedCount} | Funds Unlocked: ${result.unlockedCount}`)
            router.refresh()
        } catch (err) {
            console.error(err)
            alert('An error occurred while triggering funds unlock.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleTrigger}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-medium px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm"
        >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Processing...' : 'Run Financial Jobs'}
        </button>
    )
}
