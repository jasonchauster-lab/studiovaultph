'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, Calendar, Clock } from 'lucide-react'
import { STUDIO_AMENITIES } from '@/types'
import LocationFilterDropdown from '@/components/shared/LocationFilterDropdown'
import MultiSelectFilter from '@/components/shared/MultiSelectFilter'
import { getManilaTodayStr } from '@/lib/timezone'

interface DiscoveryFiltersProps {
    /** Sub-location strings of verified studios that currently exist in the DB */
    availableLocations?: string[]
}

export default function DiscoveryFilters({ availableLocations }: DiscoveryFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            if (value === 'all' || value === '') {
                params.delete(name)
            } else {
                params.set(name, value)
            }
            return params.toString()
        },
        [searchParams]
    )

    const handleFilter = (name: string, value: string) => {
        router.push(`/customer?${createQueryString(name, value)}`)
    }

    const handleMultiFilter = (name: string, values: string[]) => {
        const val = values.join(',')
        router.push(`/customer?${createQueryString(name, val)}`)
    }

    const getMultiValue = (name: string) => {
        const val = searchParams.get(name)
        return val ? val.split(',') : []
    }

    const hasFilters = Array.from(searchParams.keys()).some(key => key !== 'q')

    const clearAllFilters = () => {
        router.push('/customer')
    }

    return (
        <div className="flex flex-col gap-6 bg-white p-5 sm:p-7 rounded-[2rem] border border-burgundy/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
            {/* Header: Label + Clear (on mobile) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-burgundy/60">
                    <div className="w-8 h-8 rounded-full bg-off-white flex items-center justify-center border border-burgundy/10">
                        <Filter className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Filter Discovery</span>
                </div>

                {hasFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="text-[10px] font-bold text-burgundy hover:text-burgundy/60 transition-colors uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-off-white border border-burgundy/10"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
                {/* Main Categories: Horizontal Scroll on Mobile */}
                <div className="flex flex-nowrap overflow-x-auto hide-scrollbar gap-3 pb-1 -mb-1 lg:flex-wrap lg:overflow-visible flex-1">
                    <div className="flex-none">
                        {/* Type Filter */}
                        <div className="relative group">
                            <select
                                onChange={(e) => handleFilter('type', e.target.value)}
                                value={searchParams.get('type') || 'all'}
                                className="w-auto pl-4 pr-10 py-2.5 bg-off-white border border-burgundy/10 rounded-xl text-[11px] font-bold text-burgundy shadow-sm focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy/30 transition-all appearance-none cursor-pointer hover:bg-white hover:border-burgundy/20 whitespace-nowrap"
                            >
                                <option value="all">All Modes</option>
                                <option value="instructor">Instructors</option>
                                <option value="studio">Studios</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-burgundy/40">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex-none">
                        <LocationFilterDropdown
                            value={searchParams.get('location') || 'all'}
                            onChange={(val) => handleFilter('location', val)}
                        />
                    </div>

                    <div className="flex-none">
                        <MultiSelectFilter
                            label="Equipment"
                            options={['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat']}
                            value={getMultiValue('equipment')}
                            onChange={(vals) => handleMultiFilter('equipment', vals)}
                            className="w-auto"
                        />
                    </div>

                    <div className="flex-none">
                        <MultiSelectFilter
                            label="Certification"
                            options={['STOTT', 'BASI', 'Balanced Body', 'Polestar', 'Classical']}
                            value={getMultiValue('certification')}
                            onChange={(vals) => handleMultiFilter('certification', vals)}
                            className="w-auto"
                        />
                    </div>

                    <div className="flex-none">
                        <MultiSelectFilter
                            label="Amenities"
                            options={[...STUDIO_AMENITIES]}
                            value={getMultiValue('amenity')}
                            onChange={(vals) => handleMultiFilter('amenity', vals)}
                            className="w-auto"
                        />
                    </div>
                </div>

                {/* Date and Time Group */}
                <div className="flex gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-burgundy/5">
                    <div className="flex flex-col gap-2 flex-1 lg:flex-none">
                        <label className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em] ml-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-burgundy/30 pointer-events-none" />
                            <input
                                type="date"
                                min={getManilaTodayStr()}
                                onChange={(e) => handleFilter('date', e.target.value)}
                                value={searchParams.get('date') || ''}
                                className="w-full lg:w-40 pl-9 pr-4 py-2 bg-off-white border border-burgundy/10 rounded-xl text-[11px] font-bold text-burgundy shadow-sm focus:outline-none focus:ring-2 focus:ring-burgundy/20 transition-all cursor-pointer hover:bg-white hover:border-burgundy/20"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-1 lg:flex-none">
                        <label className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em] ml-1">Time</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-burgundy/30 pointer-events-none" />
                            <input
                                type="time"
                                min={
                                    searchParams.get('date') === getManilaTodayStr()
                                        ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                        : undefined
                                }
                                onChange={(e) => handleFilter('time', e.target.value)}
                                value={searchParams.get('time') || ''}
                                className="w-full lg:w-32 pl-9 pr-4 py-2 bg-off-white border border-burgundy/10 rounded-xl text-[11px] font-bold text-burgundy shadow-sm focus:outline-none focus:ring-2 focus:ring-burgundy/20 transition-all cursor-pointer hover:bg-white hover:border-burgundy/20"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
