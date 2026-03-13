'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar } from 'lucide-react'

const RANGES = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'This Month', value: 'this-month' },
    { label: 'This Quarter', value: 'this-quarter' },
    { label: 'This Year', value: 'this-year' },
]

export default function DateRangeFilters() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentRange = searchParams.get('range') || 'all'

    const handleRangeChange = (range: string) => {
        const params = new URLSearchParams(searchParams)
        if (range === 'all') {
            params.delete('range')
        } else {
            params.set('range', range)
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    return (
        <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-charcoal-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Time Range:</span>
            </div>

            <div className="flex flex-nowrap overflow-x-auto pb-1 -mb-1 hide-scrollbar gap-2 w-full lg:w-auto">
                {RANGES.map((r) => (
                    <button
                        key={r.value}
                        onClick={() => handleRangeChange(r.value)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border ${currentRange === r.value
                                ? 'bg-charcoal text-white border-charcoal shadow-tight'
                                : 'bg-white text-charcoal/60 border-border-grey hover:border-charcoal/40 hover:bg-off-white'
                            }`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <div className="flex-1"></div>
        </div>
    )
}
