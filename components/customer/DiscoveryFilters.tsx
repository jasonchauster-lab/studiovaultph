'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter } from 'lucide-react'
import { STUDIO_AMENITIES } from '@/types'
import LocationFilterDropdown from '@/components/shared/LocationFilterDropdown'
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

    return (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4 bg-white/40 backdrop-blur-md p-5 rounded-[24px] border border-white/60 shadow-cloud">
            <div className="flex items-center gap-2.5 text-charcoal/40 mr-2">
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
            </div>

            <div className="flex flex-wrap gap-3">
                {/* Type Filter */}
                <select
                    onChange={(e) => handleFilter('type', e.target.value)}
                    value={searchParams.get('type') || 'all'}
                    className="w-full sm:w-auto px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-[11px] font-bold text-charcoal shadow-sm focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage transition-all appearance-none cursor-pointer"
                >
                    <option value="all">All Modes</option>
                    <option value="instructor">Instructors</option>
                    <option value="studio">Studios</option>
                    <option value="slot">Browse Slots</option>
                </select>

                <LocationFilterDropdown
                    value={searchParams.get('location') || 'all'}
                    onChange={(val) => handleFilter('location', val)}
                    availableLocations={availableLocations}
                />

                <select
                    onChange={(e) => handleFilter('equipment', e.target.value)}
                    value={searchParams.get('equipment') || 'all'}
                    className="w-full sm:w-auto px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-[11px] font-bold text-charcoal shadow-sm focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage transition-all appearance-none cursor-pointer"
                >
                    <option value="all">Equipment</option>
                    <option value="Reformer">Reformer</option>
                    <option value="Cadillac">Cadillac</option>
                    <option value="Chair">Chair</option>
                    <option value="Ladder Barrel">Barrel</option>
                    <option value="Mat">Mat</option>
                </select>

                <select
                    onChange={(e) => handleFilter('certification', e.target.value)}
                    value={searchParams.get('certification') || 'all'}
                    className="w-full sm:w-auto px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-[11px] font-bold text-charcoal shadow-sm focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage transition-all appearance-none cursor-pointer"
                >
                    <option value="all">Certification</option>
                    <option value="STOTT">STOTT Pilates</option>
                    <option value="BASI">BASI</option>
                    <option value="Balanced Body">Balanced Body</option>
                    <option value="Polestar">Polestar</option>
                    <option value="Classical">Classical</option>
                </select>

                <select
                    onChange={(e) => handleFilter('amenity', e.target.value)}
                    value={searchParams.get('amenity') || 'all'}
                    className="w-full sm:w-auto px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-[11px] font-bold text-charcoal shadow-sm focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage transition-all appearance-none cursor-pointer"
                >
                    <option value="all">Amenities</option>
                    {STUDIO_AMENITIES.map(amenity => (
                        <option key={amenity} value={amenity}>{amenity}</option>
                    ))}
                </select>

                <input
                    type="date"
                    min={getManilaTodayStr()}
                    onChange={(e) => handleFilter('date', e.target.value)}
                    value={searchParams.get('date') || ''}
                    className="w-full sm:w-auto px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-[11px] font-bold text-charcoal shadow-sm focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage transition-all cursor-pointer"
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
                    className="w-full sm:w-auto px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-[11px] font-bold text-charcoal shadow-sm focus:outline-none focus:ring-1 focus:ring-sage focus:border-sage transition-all cursor-pointer"
                />
            </div>
        </div>
    )
}
