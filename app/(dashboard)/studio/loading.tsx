import React from 'react'

export default function DashboardLoading() {
    return (
        <div className="pt-8 pb-20 px-4 md:px-10 max-w-[1600px] mx-auto space-y-12 bg-zinc-50/30 min-h-screen">
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 animate-in fade-in duration-700">
                <div className="space-y-6 flex-1">
                    <div className="h-14 bg-white border border-zinc-100 rounded-2xl w-1/3 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        <div className="h-6 bg-zinc-200/50 rounded-xl w-48" />
                        <div className="h-10 bg-zinc-200/50 rounded-2xl w-40" />
                    </div>
                </div>
                <div className="h-24 bg-white border border-zinc-100 rounded-[2rem] w-72 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                </div>
            </div>

            {/* Stat Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-44 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                    </div>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-[380px] bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                        </div>
                        <div className="h-[380px] bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="h-8 bg-zinc-200/50 rounded-xl w-48" />
                        <div className="bg-white border border-zinc-100 rounded-[3rem] overflow-hidden shadow-sm h-[600px] relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 space-y-8">
                    <div className="h-72 bg-charcoal rounded-[2.5rem] shadow-xl relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                    </div>
                    <div className="h-[500px] bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
                    </div>
                </div>
            </div>
        </div>
    )
}
