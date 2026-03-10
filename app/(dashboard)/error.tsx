'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Dashboard Error Boundary:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[60vh]">
            <div className="w-16 h-16 bg-forest/5 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-forest" />
            </div>

            <h2 className="text-2xl font-bold font-lexend text-charcoal mb-3">Unable to load dashboard data</h2>
            <p className="text-slate text-center max-w-sm mb-8 leading-relaxed">
                We're having trouble retrieving the information for this page.
                Your connection might be unstable.
            </p>

            <button
                onClick={() => reset()}
                className="px-8 h-12 bg-forest text-white rounded-lg font-bold flex items-center gap-2 hover:brightness-110 shadow-tight transition-all active:scale-95 group"
            >
                <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                Retry Loading
            </button>
        </div>
    )
}
