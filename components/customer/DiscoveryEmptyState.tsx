'use client'

import { Search, X, Sparkles, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

interface DiscoveryEmptyStateProps {
    title: string
    description: string
    icon?: any
    className?: string
}

export default function DiscoveryEmptyState({ 
    title, 
    description, 
    icon: Icon = Search,
    className
}: DiscoveryEmptyStateProps) {
    const router = useRouter()

    return (
        <div className={clsx(
            "atelier-card py-24 px-6 text-center flex flex-col items-center justify-center gap-y-8 bg-off-white/30 border-dashed border-2 border-burgundy/10 relative overflow-hidden group",
            className
        )}>
            {/* Background flourish */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(81,50,41,0.03)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            </div>

            <div className="relative">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border border-burgundy/5 ring-4 ring-walking-vinnie/10 group-hover:scale-110 transition-transform duration-700">
                    <Icon className="w-10 h-10 text-burgundy opacity-20 group-hover:opacity-40 transition-opacity" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-forest text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce-slow">
                    <Sparkles className="w-4 h-4" />
                </div>
            </div>

            <div className="space-y-3 relative z-10 max-w-sm mx-auto">
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-burgundy tracking-tight leading-tight transition-colors group-hover:text-forest">{title}</h3>
                <p className="text-burgundy/40 text-sm font-medium leading-relaxed uppercase tracking-tight">
                    {description}
                </p>
            </div>

            <button
                onClick={() => router.push('/customer')}
                className="relative z-10 inline-flex items-center gap-3 px-8 py-4 bg-white border border-burgundy/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-burgundy shadow-tight hover:shadow-card hover:border-forest/20 hover:text-forest transition-all duration-500 active:scale-95 group/btn"
            >
                <RefreshCw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-700" />
                Clear All Filters
            </button>

            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
