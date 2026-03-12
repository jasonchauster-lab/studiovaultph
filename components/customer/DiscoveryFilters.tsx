'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter } from 'lucide-react'
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
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 bg-white p-5 rounded-2xl border border-border-grey shadow-card">
            {/* Filter label */}
            <div className="flex items-center gap-2 text-muted-burgundy mr-1 shrink-0">
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
                {/* Type Filter */}
                <select
                    onChange={(e) => handleFilter('type', e.target.value)}
                    value={searchParams.get('type') || 'all'}
                    className="w-full sm:w-auto px-4 py-2 bg-off-white border border-burgundy/15 rounded-xl text-[11px] font-bold text-burgundy shadow-tight focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy/40 transition-all appearance-none cursor-pointer hover:border-burgundy/25"
                >
                    <option value="all">All Modes</option>
                    <option value="instructor">Instructors</option>
                    <option value="studio">Studios</option>
                </select>

                <LocationFilterDropdown
                    value={searchParams.get('location') || 'all'}
                    onChange={(val) => handleFilter('location', val)}
                />

                <MultiSelectFilter
                    label="Equipment"
                    options={['Reformer', 'Cadillac', 'Chair', 'Ladder Barrel', 'Mat']}
                    value={getMultiValue('equipment')}
                    onChange={(vals) => handleMultiFilter('equipment', vals)}
                />

                <MultiSelectFilter
                    label="Certification"
                    options={['STOTT', 'BASI', 'Balanced Body', 'Polestar', 'Classical']}
                    value={getMultiValue('certification')}
                    onChange={(vals) => handleMultiFilter('certification', vals)}
                />

                <MultiSelectFilter
                    label="Amenities"
                    options={[...STUDIO_AMENITIES]}
                    value={getMultiValue('amenity')}
                    onChange={(vals) => handleMultiFilter('amenity', vals)}
                />

                <input
                    type="date"
                    min={getManilaTodayStr()}
                    onChange={(e) => handleFilter('date', e.target.value)}
                    value={searchParams.get('date') || ''}
                    className="w-full sm:w-auto px-4 py-2 bg-off-white border border-burgundy/15 rounded-xl text-[11px] font-bold text-burgundy shadow-tight focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy/40 transition-all cursor-pointer hover:border-burgundy/25"
                />

                <input
                    type="time"
                    min={
                        searchParams.get('date') === getManilaTodayStr()
                            ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                            : undefined
                    }
                    onChange={(e) => handleFilter('time', e.target.value)}
                    value={searchParams.get('time') || ''}
                    className="w-full sm:w-auto px-4 py-2 bg-off-white border border-burgundy/15 rounded-xl text-[11px] font-bold text-burgundy shadow-tight focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy/40 transition-all cursor-pointer hover:border-burgundy/25"
                />
            </div>
        </div>
    )
}
