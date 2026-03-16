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
        <div className={clsx("flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-transparent sm:bg-white p-0 sm:p-2.5 rounded-none sm:rounded-xl border-none sm:border sm:border-border-grey shadow-none sm:shadow-sm w-full no-scrollbar", className)}>
            <div className="hidden sm:flex items-center gap-1.5 text-charcoal/50 shrink-0 sticky left-0 bg-white pr-1 z-10 transition-colors">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest inline-block">FILTER</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-2 flex-1 w-full sm:items-center sm:max-w-xl">
                {/* Status Dropdown */}
                <div className="w-full relative group min-w-0">
                    <span className="absolute -top-2 left-2 px-1 bg-white text-[7px] font-black text-charcoal/50 uppercase tracking-[0.2em] z-10">Status</span>
                    <div className="relative h-11">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as FilterStatus)}
                            className="w-full h-full pl-3 pr-8 bg-white sm:bg-off-white border border-border-grey text-charcoal text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-lg focus:ring-forest focus:border-forest block py-2.5 sm:py-1.5 outline-none transition-colors shadow-sm sm:shadow-tight appearance-none"
                        >
                            <option value="all">ANY STATUS</option>
                            <option value="approved">Approved</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-charcoal/50 pointer-events-none sm:hidden" />
                    </div>
                </div>

                <div className="w-full relative group min-w-0">
                    <span className="absolute -top-2 left-2 px-1 bg-white text-[7px] font-black text-charcoal/50 uppercase tracking-[0.2em] z-10">Date</span>
                    <div className={clsx(
                        "flex items-center justify-between gap-1 sm:gap-2 border rounded-lg px-2 sm:px-2 py-0 shrink-0 sm:shrink transition-all duration-300 overflow-hidden sm:min-w-0 w-full h-11",
                        (fromDate || toDate) ? "bg-forest/5 border-forest/20 ring-1 ring-forest/10" : "bg-white sm:bg-off-white border-border-grey shadow-sm sm:shadow-tight"
                    )}>
                        <CalendarIcon className={clsx("hidden sm:block w-3.5 h-3.5 shrink-0 transition-colors", (fromDate || toDate) ? "text-forest" : "text-charcoal/50")} />
                        
                        <div className="flex flex-col flex-1 min-w-0 relative h-full justify-center">
                            <div className="flex items-center gap-0.5 w-full">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-charcoal text-[9px] sm:text-xs font-bold uppercase tracking-wider focus:outline-none w-full pr-14"
                                    aria-label="From Date"
                                />
                                {fromDate && (
                                    <button onClick={() => setFromDate('')} className="p-0.5 hover:text-burgundy text-slate transition-colors shrink-0">
                                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="w-[1px] h-4 bg-charcoal/10 self-center mx-2" />

                        <div className="flex flex-col flex-1 min-w-0 relative h-full justify-center">
                            <div className="flex items-center gap-0.5 w-full justify-end">
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-charcoal text-[9px] sm:text-xs font-bold uppercase tracking-wider focus:outline-none w-full text-right sm:text-left pr-14"
                                    aria-label="To Date"
                                />
                                {toDate && (
                                    <button onClick={() => setToDate('')} className="p-0.5 hover:text-burgundy text-slate transition-colors shrink-0">
                                        <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
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
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-burgundy bg-burgundy/5 hover:bg-burgundy/10 rounded-lg transition-colors ml-2 shrink-0 border border-burgundy/10"
                >
                    <X className="w-3 h-3" />
                    Clear
                </button>
            )}

            {/* Mobile/Tablet View: Active Date Pill Indicator */}
            {(fromDate || toDate) && (
                <div className="w-full flex sm:hidden mt-2">
                    <div className="flex items-center gap-2 bg-sage/10 border border-sage/20 px-3 py-1.5 rounded-full">
                        <CalendarIcon className="w-3 h-3 text-sage" />
                        <span className="text-[10px] font-bold text-sage uppercase tracking-widest leading-none">
                            {fromDate && new Date(fromDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {fromDate && toDate && ' - '}
                            {toDate && new Date(toDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button onClick={() => { setFromDate(''); setToDate(''); }} className="p-0.5 hover:bg-sage/20 rounded-full transition-colors ml-1">
                            <X className="w-3 h-3 text-sage" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
