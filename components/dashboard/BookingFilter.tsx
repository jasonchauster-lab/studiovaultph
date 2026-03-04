'use client'

import { useState, useEffect } from 'react'
import { Filter, Calendar as CalendarIcon, X } from 'lucide-react'
import clsx from 'clsx'

export type FilterStatus = 'all' | 'pending' | 'approved' | 'completed'

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
        <div className={clsx("flex flex-wrap items-center gap-3 bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-sm", className)}>
            <div className="flex items-center gap-2 text-charcoal-500 mr-2 shrink-0">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wider">Filter By:</span>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FilterStatus)}
                    className="bg-cream-50 border border-cream-200 text-charcoal-700 text-sm rounded-lg focus:ring-rose-gold focus:border-rose-gold block w-full py-2 px-3 outline-none transition-colors"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved/Upcoming</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {/* Date Range Group */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap bg-cream-50 border border-cream-200 rounded-lg px-2 py-1">
                <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-charcoal-400 shrink-0 ml-1" />
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-transparent text-charcoal-700 text-sm focus:outline-none py-1 w-[115px]"
                        aria-label="From Date"
                    />
                </div>
                <span className="text-charcoal-300 font-medium">-</span>
                <div className="flex items-center gap-1.5">
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-transparent text-charcoal-700 text-sm focus:outline-none py-1 w-[115px]"
                        aria-label="To Date"
                    />
                </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-gold bg-rose-gold/10 hover:bg-rose-gold/20 rounded-lg transition-colors ml-auto sm:ml-2"
                >
                    <X className="w-3 h-3" />
                    Clear
                </button>
            )}
        </div>
    )
}
