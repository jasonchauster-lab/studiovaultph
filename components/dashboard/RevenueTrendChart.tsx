'use client'

import React, { useMemo } from 'react'
import { clsx } from 'clsx'
import { TrendingUp, Calendar } from 'lucide-react'

interface TrendData {
    date: string
    amount: number
    count: number
}

interface RevenueTrendChartProps {
    data: TrendData[]
    title?: string
    height?: number
    type?: 'revenue' | 'bookings'
}

export default function RevenueTrendChart({ 
    data, 
    title = "Revenue Trends", 
    height = 200,
    type = 'revenue'
}: RevenueTrendChartProps) {
    const maxVal = useMemo(() => {
        const values = data.map(d => type === 'revenue' ? d.amount : d.count)
        return Math.max(...values, 1) // Avoid division by zero
    }, [data, type])

    const formatValue = (val: number) => {
        if (type === 'revenue') return `₱${val.toLocaleString()}`
        return `${val} sessions`
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
    }

    if (!data || data.length === 0) return null

    return (
        <div className="atelier-card !p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.4em]">{title}</h3>
                    <p className="text-[9px] font-bold text-slate uppercase tracking-widest">Last 14 Days</p>
                </div>
                <div className="p-2.5 rounded-xl bg-forest/5 text-forest border border-forest/10 shadow-tight">
                    <TrendingUp className="w-4 h-4" />
                </div>
            </div>

            <div 
                className="flex items-end justify-between gap-2 sm:gap-4 relative z-10"
                style={{ height: `${height}px` }}
            >
                {data.map((item, idx) => {
                    const value = type === 'revenue' ? item.amount : item.count
                    const percentage = (value / maxVal) * 100
                    
                    return (
                        <div key={item.date} className="flex-1 flex flex-col items-center group/bar h-full justify-end">
                            {/* Bar Column */}
                            <div className="relative w-full flex flex-col items-center justify-end h-full">
                                {/* Tooltip */}
                                <div className="absolute -top-12 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 pointer-events-none z-20 whitespace-nowrap">
                                    <div className="bg-burgundy text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-xl border border-burgundy/20 uppercase tracking-widest translate-y-2 group-hover/bar:translate-y-0">
                                        {formatValue(value)}
                                    </div>
                                    <div className="w-2 h-2 bg-burgundy rotate-45 mx-auto -mt-1 shadow-xl" />
                                </div>

                                {/* The Bar */}
                                <div 
                                    className={clsx(
                                        "w-full rounded-t-lg transition-all duration-1000 ease-out relative overflow-hidden",
                                        value > 0 ? "bg-forest shadow-lg" : "bg-stone-100 h-1"
                                    )}
                                    style={{ 
                                        height: value > 0 ? `${percentage}%` : '4px',
                                        transitionDelay: `${idx * 50}ms`
                                    }}
                                >
                                    {/* Glass reflection on bar */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-30" />
                                </div>
                            </div>

                            {/* Date Label (Only show every 2-3 days on small screens) */}
                            <div className="mt-4 hidden sm:block">
                                <p className="text-[8px] font-black text-burgundy/30 uppercase tracking-tighter text-center scale-90">
                                    {idx % 2 === 0 ? formatDate(item.date).split(',')[0] : ''}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Legend / Info */}
            <div className="mt-8 pt-6 border-t border-burgundy/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-forest" />
                        <span className="text-[9px] font-black text-burgundy/40 uppercase tracking-widest">{type === 'revenue' ? 'Earnings' : 'Sessions'}</span>
                    </div>
                </div>
                <div className="px-3 py-1 bg-stone-50 rounded-lg border border-burgundy/5">
                    <span className="text-[9px] font-black text-forest uppercase tracking-widest">Active Trends</span>
                </div>
            </div>
        </div>
    )
}
