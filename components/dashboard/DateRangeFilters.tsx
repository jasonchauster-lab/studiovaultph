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
        <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar gap-2 w-full lg:w-auto pb-2">
                {RANGES.map((r) => (
                    <button
                        key={r.value}
                        onClick={() => handleRangeChange(r.value)}
                        className={`snap-start px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border-2 ${currentRange === r.value
                                ? 'bg-[#43302E] text-white border-[#43302E] shadow-tight'
                                : 'bg-white text-charcoal/60 border-border-grey hover:border-charcoal/40 hover:bg-off-white'
                            }`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
