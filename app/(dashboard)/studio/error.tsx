'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function StudioError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('[Studio Dashboard Error Boundary]:', error)
    }, [error])

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-8">
                <AlertCircle className="w-10 h-10 text-red-500" />
            </div>

            <h2 className="text-3xl font-black text-zinc-900 mb-4 tracking-tightest uppercase">
                Something went wrong
            </h2>
            
            <p className="text-zinc-500 max-w-md mb-10 leading-relaxed font-medium">
                We encountered an unexpected error while loading your dashboard. 
                Don't worry, your data is safe.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <button
                    onClick={() => reset()}
                    className="flex-1 bg-[#2D3282] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#1e2366] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Try Again
                </button>
                
                <Link
                    href="/studio"
                    className="flex-1 bg-white border border-zinc-200 text-zinc-900 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <Home className="w-4 h-4" />
                    Dashboard Home
                </Link>
            </div>

            <div className="mt-12 pt-12 border-t border-zinc-100 w-full max-w-lg">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">
                    Need Immediate Assistance?
                </p>
                <a 
                    href="mailto:support@studiovault.co"
                    className="inline-flex items-center gap-3 text-zinc-900 font-bold hover:text-[#2D3282] transition-colors"
                >
                    <MessageCircle className="w-5 h-5" />
                    Contact Support
                </a>
                
                {error.digest && (
                    <p className="mt-6 text-[9px] text-zinc-300 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}
            </div>
        </div>
    )
}
