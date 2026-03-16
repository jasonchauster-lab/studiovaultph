'use client'

import { useState, useEffect } from 'react'
import { Filter, Calendar as CalendarIcon, X, ChevronDown } from 'lucide-react'
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
        <div className={clsx("flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 bg-transparent sm:bg-white/50 sm:backdrop-blur-md p-4 sm:p-3 rounded-2xl sm:rounded-[2rem] border-none sm:border sm:border-white/40 shadow-none sm:shadow-tight w-full no-scrollbar", className)}>
            <div className="hidden sm:flex items-center gap-3 text-charcoal/40 shrink-0 sticky left-0 bg-transparent pr-2 z-10 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-charcoal/5 flex items-center justify-center">
                    <Filter className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] inline-block">Filters</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-2 flex-1 w-full sm:items-center sm:max-w-xl">
                {/* Status Dropdown */}
                <div className="w-full relative group min-w-0">
                    <span className="absolute -top-2 left-3 px-1.5 bg-white text-[8px] font-black text-forest/60 uppercase tracking-[0.2em] z-10 sm:hidden">Filter by Status</span>
                    <div className="relative h-12 sm:h-10">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as FilterStatus)}
                            className="w-full h-full pl-4 pr-10 bg-white sm:bg-charcoal/5 border border-border-grey/30 sm:border-charcoal/5 text-charcoal text-[11px] font-black uppercase tracking-[0.2em] rounded-xl focus:ring-forest focus:border-forest block py-2 sm:py-1 outline-none transition-all shadow-sm sm:shadow-none appearance-none hover:bg-forest/5"
                        >
                            <option value="all">All Statuses</option>
                            <option value="approved">Approved</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal/40 pointer-events-none" />
                    </div>
                </div>

                <div className="w-full relative group min-w-0">
                    <span className="absolute -top-2 left-3 px-1.5 bg-white text-[8px] font-black text-forest/60 uppercase tracking-[0.2em] z-10 sm:hidden">Date Range</span>
                    <div className={clsx(
                        "flex items-center justify-between gap-3 sm:gap-4 border rounded-xl px-4 py-0 shrink-0 sm:shrink transition-all duration-300 overflow-hidden sm:min-w-0 w-full h-12 sm:h-10",
                        (fromDate || toDate) ? "bg-forest/5 border-forest/20 ring-1 ring-forest/10" : "bg-white sm:bg-charcoal/5 border-border-grey/30 sm:border-charcoal/5"
                    )}>
                        <CalendarIcon className={clsx("hidden sm:block w-3.5 h-3.5 shrink-0 transition-colors", (fromDate || toDate) ? "text-forest" : "text-charcoal/30")} />
                        
                        <div className="flex flex-col flex-1 min-w-0 relative h-full justify-center">
                            <div className="flex items-center gap-1.5 w-full">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-charcoal text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] focus:outline-none w-full pr-1.5 cursor-pointer"
                                    aria-label="From Date"
                                />
                                {fromDate && (
                                    <button onClick={() => setFromDate('')} className="p-1 hover:text-burgundy text-slate transition-colors shrink-0">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-[1px] h-4 bg-charcoal/10 self-center" />

                        <div className="flex flex-col flex-1 min-w-0 relative h-full justify-center">
                            <div className="flex items-center gap-1.5 w-full justify-end">
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-charcoal text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] focus:outline-none w-full text-right sm:text-left pr-1.5 cursor-pointer"
                                    aria-label="To Date"
                                />
                                {toDate && (
                                    <button onClick={() => setToDate('')} className="p-1 hover:text-burgundy text-slate transition-colors shrink-0">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clear Filters Button (Always Visible if active) */}
            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all ml-2 shrink-0 border border-red-100 active:scale-95"
                >
                    <X className="w-3.5 h-3.5" />
                    RESET
                </button>
            )}

            {/* Mobile/Tablet View: Active Date Pill Indicator */}
            {(fromDate || toDate) && (
                <div className="w-full flex sm:hidden mt-2">
                    <div className="flex items-center gap-2.5 bg-forest text-white px-4 py-2 rounded-2xl shadow-tight animate-in slide-in-from-top-2 duration-300">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                            {fromDate && new Date(fromDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {fromDate && toDate && ' - '}
                            {toDate && new Date(toDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button onClick={() => { setFromDate(''); setToDate(''); }} className="p-1 hover:bg-white/20 rounded-lg transition-colors ml-1">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
