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
        <div className={clsx("flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-sm", className)}>
            <div className="flex items-center justify-between sm:justify-start gap-2 text-charcoal-500 shrink-0 sm:mr-2">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">Filter By:</span>
                </div>
                {/* Mobile Clear Filters Button */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="sm:hidden flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-gold bg-rose-gold/10 hover:bg-rose-gold/20 rounded-lg transition-colors"
                    >
                        <X className="w-3 h-3" />
                        CLEAR
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-1 min-w-0">
                {/* Status Dropdown */}
                <div className="w-full">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as FilterStatus)}
                        className="bg-cream-50 border border-cream-200 text-charcoal-700 text-xs sm:text-sm rounded-lg focus:ring-rose-gold focus:border-rose-gold block w-full py-2 px-2 sm:px-3 outline-none transition-colors"
                    >
                        <option value="all">Status</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Date Range Group */}
                <div className="flex items-center gap-1 bg-cream-50 border border-cream-200 rounded-lg px-2 py-1 overflow-hidden min-w-0">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                        <CalendarIcon className="hidden sm:block w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-transparent text-charcoal-700 text-[10px] sm:text-sm focus:outline-none py-1 w-full min-w-0"
                            aria-label="From Date"
                        />
                    </div>
                    <span className="text-charcoal-300 font-medium sm:block hidden">-</span>
                    <div className="flex items-center gap-1 min-w-0 flex-1 sm:block hidden">
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-transparent text-charcoal-700 text-[10px] sm:text-sm focus:outline-none py-1 w-full min-w-0"
                            aria-label="To Date"
                        />
                    </div>
                </div>
            </div>

            {/* Desktop Clear Filters Button */}
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
