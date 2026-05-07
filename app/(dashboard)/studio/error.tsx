'use client'

import React, { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function StudioError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[StudioDashboardError]', error)
    }, [error])

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-rose-100 shadow-xl shadow-rose-500/10">
                <AlertCircle className="w-12 h-12 text-rose-500" />
            </div>
            
            <div className="space-y-4 max-w-md">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tightest leading-tight">
                    Something went <span className="text-rose-500">wrong</span>.
                </h2>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                    We encountered an unexpected error while loading your studio dashboard. Don't worry, your data is safe.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-12">
                <button
                    onClick={() => reset()}
                    className="px-8 py-4 bg-zinc-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-lg active:scale-95 group"
                >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                    Try Recovery
                </button>
                
                <Link
                    href="/studio"
                    className="px-8 py-4 bg-white text-zinc-900 border border-zinc-100 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-zinc-50 transition-all shadow-sm active:scale-95"
                >
                    <Home className="w-4 h-4" />
                    Back to Home
                </Link>
            </div>

            <div className="mt-12 p-6 bg-zinc-50/50 rounded-2xl border border-zinc-100 max-w-lg">
                <p className="text-[10px] font-mono text-zinc-300 break-all leading-relaxed">
                    Error Signature: {error.digest || 'no-digest-available'}
                </p>
            </div>
        </div>
    )
}
