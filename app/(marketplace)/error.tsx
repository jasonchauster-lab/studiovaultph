'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error Boundary:', error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-off-white p-6">
            <div className="max-w-md w-full earth-card bg-white p-10 border border-border-grey shadow-tight text-center">
                <div className="w-20 h-20 bg-forest/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <AlertCircle className="w-10 h-10 text-forest" />
                </div>

                <h1 className="text-3xl font-bold font-lexend text-charcoal mb-4 tracking-tight">Something went wrong</h1>
                <p className="text-slate text-lg mb-10 leading-relaxed font-medium">
                    We've encountered an unexpected error. Don't worry, your data is safe.
                </p>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => reset()}
                        className="w-full h-14 bg-forest text-white rounded-lg font-bold flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-tight active:scale-95 group"
                    >
                        <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        Try Again
                    </button>

                    <Link
                        href="/"
                        className="w-full h-14 bg-off-white text-charcoal border border-border-grey rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-95"
                    >
                        <Home className="w-5 h-5" />
                        Back to Home
                    </Link>
                </div>

                <div className="mt-8 pt-8 border-t border-border-grey">
                    <p className="text-[10px] font-bold text-slate/50 uppercase tracking-widest">
                        ERROR ID: {error.digest || 'UNKNOWN'}
                    </p>
                </div>
            </div>
        </div>
    )
}
