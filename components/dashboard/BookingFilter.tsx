'use client'

import { useState, useEffect } from 'react'
import { Filter, Calendar as CalendarIcon, X } from 'lucide-react'
import clsx from 'clsx'

export type FilterStatus = 'all' | 'approved' | 'completed' | 'cancelled'

export interface DateRange {
    from: Date | null
    to: Date | null
}

export interface FilterState {
    status: FilterStatus
    dateRange: DateRange
}

interface BookingFilterProps {
    onFilterChange: (filters: FilterState) => void
    className?: string
}

export default function BookingFilter({ onFilterChange, className }: BookingFilterProps) {
    const [status, setStatus] = useState<FilterStatus>('all')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')

    // Whenever local state changes, compute and emit the filter state
    useEffect(() => {
        let from: Date | null = null
        let to: Date | null = null

        if (fromDate) {
            from = new Date(`${fromDate}T00:00:00+08:00`)
        }
        if (toDate) {
            to = new Date(`${toDate}T23:59:59+08:00`)
        }

        onFilterChange({
            status,
            dateRange: { from, to }
        })
    }, [status, fromDate, toDate])

    const clearFilters = () => {
        setStatus('all')
        setFromDate('')
        setToDate('')
    }

    const hasActiveFilters = status !== 'all' || fromDate !== '' || toDate !== ''

    return (
        <div className={clsx("flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-2.5 rounded-xl border border-cream-200 shadow-sm overflow-x-auto no-scrollbar", className)}>
            <div className="flex items-center gap-1.5 text-charcoal-500 shrink-0 sticky left-0 bg-white pr-1 z-10">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline-block">FILTER</span>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-min">
                {/* Status Dropdown */}
                <div className="w-[100px] sm:w-[130px] shrink-0">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as FilterStatus)}
                        className="bg-cream-50 border border-cream-200 text-charcoal-700 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-md focus:ring-forest focus:border-forest block w-full py-1.5 px-2 outline-none transition-colors"
                    >
                        <option value="all">Status</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Date Range Group */}
                <div className="flex items-center gap-1 sm:gap-2 bg-cream-50 border border-cream-200 rounded-md px-2 py-1 shrink-0">
                    <CalendarIcon className="hidden sm:block w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-transparent text-charcoal-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider focus:outline-none py-0.5 w-[100px] sm:w-auto"
                        aria-label="From Date"
                    />
                    <span className="text-charcoal-300 font-black">-</span>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-transparent text-charcoal-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider focus:outline-none py-0.5 w-[100px] sm:w-auto"
                        aria-label="To Date"
                    />
                </div>
            </div>

            {/* Clear Filters Button (Always Visible if active) */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-gold bg-rose-gold/10 hover:bg-rose-gold/20 rounded-lg transition-colors ml-2"
                >
                    <X className="w-3 h-3" />
                    Clear
                </button>
            )}
        </div>
    )
}
