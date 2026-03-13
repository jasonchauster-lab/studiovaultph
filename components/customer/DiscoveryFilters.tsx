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

    return (
        <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-border-grey shadow-card overflow-hidden">
            {/* Header: Label + Clear (on mobile) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-burgundy">
                    <Filter className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
                </div>
            </div>

            {/* Main Categories: Horizontal Scroll on Mobile */}
            <div className="flex flex-nowrap overflow-x-auto hide-scrollbar gap-3 pb-1 -mb-1 sm:flex-wrap sm:overflow-visible">
                <div className="flex-none sm:flex-initial">
                    {/* Type Filter */}
                    <select
                        onChange={(e) => handleFilter('type', e.target.value)}
                        value={searchParams.get('type') || 'all'}
                        className="w-auto px-4 py-2 bg-off-white border border-burgundy/15 rounded-xl text-[11px] font-bold text-burgundy shadow-tight focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy/40 transition-all appearance-none cursor-pointer hover:border-burgundy/25 whitespace-nowrap"
                    >
                        <option value="all">All Modes</option>
                        <option value="instructor">Instructors</option>
                        <option value="studio">Studios</option>
                    </select>
                </div>

                <div className="flex-none sm:flex-initial">
                    <LocationFilterDropdown
                        value={searchParams.get('location') || 'all'}
                        onChange={(val) => handleFilter('location', val)}
                    />
                </div>

                <div className="flex-none sm:flex-initial">
                    <MultiSelectFilter
                        label="Equipment"
                        options={['Reformer', 'Cadillac', 'Chair', 'Ladder Barrel', 'Mat']}
                        value={getMultiValue('equipment')}
                        onChange={(vals) => handleMultiFilter('equipment', vals)}
                        className="w-auto"
                    />
                </div>

                <div className="flex-none sm:flex-initial">
                    <MultiSelectFilter
                        label="Certification"
                        options={['STOTT', 'BASI', 'Balanced Body', 'Polestar', 'Classical']}
                        value={getMultiValue('certification')}
                        onChange={(vals) => handleMultiFilter('certification', vals)}
                        className="w-auto"
                    />
                </div>

                <div className="flex-none sm:flex-initial">
                    <MultiSelectFilter
                        label="Amenities"
                        options={[...STUDIO_AMENITIES]}
                        value={getMultiValue('amenity')}
                        onChange={(vals) => handleMultiFilter('amenity', vals)}
                        className="w-auto"
                    />
                </div>
            </div>

            {/* Date and Time Group: 2-column grid on mobile */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 w-full sm:w-auto items-end pt-2 border-t border-border-grey/30 sm:border-0 sm:pt-0">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-muted-burgundy uppercase tracking-[0.2em] ml-1">Select Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-burgundy/40 pointer-events-none" />
                        <input
                            type="date"
                            min={getManilaTodayStr()}
                            onChange={(e) => handleFilter('date', e.target.value)}
                            value={searchParams.get('date') || ''}
                            className="w-full sm:w-auto pl-8 pr-3 py-1.5 bg-off-white border border-burgundy/15 rounded-xl text-[10px] sm:text-[11px] font-bold text-burgundy shadow-tight focus:outline-none transition-all cursor-pointer hover:border-burgundy/25"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-muted-burgundy uppercase tracking-[0.2em] ml-1">Start Time</label>
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-burgundy/40 pointer-events-none" />
                        <input
                            type="time"
                            min={
                                searchParams.get('date') === getManilaTodayStr()
                                    ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                    : undefined
                            }
                            onChange={(e) => handleFilter('time', e.target.value)}
                            value={searchParams.get('time') || ''}
                            className="w-full sm:w-auto pl-8 pr-3 py-1.5 bg-off-white border border-burgundy/15 rounded-xl text-[10px] sm:text-[11px] font-bold text-burgundy shadow-tight focus:outline-none transition-all cursor-pointer hover:border-burgundy/25"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
