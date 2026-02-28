'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter } from 'lucide-react'
import { STUDIO_AMENITIES } from '@/types'
import LocationFilterDropdown from '@/components/shared/LocationFilterDropdown'

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
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
            <div className="flex items-center gap-2 text-charcoal-500 mr-1">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter by:</span>
            </div>

            {/* Type Filter */}
            <select
                onChange={(e) => handleFilter('type', e.target.value)}
                value={searchParams.get('type') || 'all'}
                className="w-full sm:w-auto px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
            >
                <option value="all">All Types</option>
                <option value="instructor">Instructors</option>
                <option value="studio">Studios</option>
                <option value="slot">Browse Slots</option>
            </select>

            {/* Location Filter — smart, searchable, grouped */}
            <LocationFilterDropdown
                value={searchParams.get('location') || 'all'}
                onChange={(val) => handleFilter('location', val)}
                availableLocations={availableLocations}
            />

            {/* Equipment Filter */}
            <select
                onChange={(e) => handleFilter('equipment', e.target.value)}
                value={searchParams.get('equipment') || 'all'}
                className="w-full sm:w-auto px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
            >
                <option value="all">All Equipment</option>
                <option value="Reformer">Reformer</option>
                <option value="Cadillac">Cadillac</option>
                <option value="Chair">Chair</option>
                <option value="Ladder Barrel">Barrel</option>
                <option value="Mat">Mat</option>
            </select>

            {/* Certification Filter */}
            <select
                onChange={(e) => handleFilter('certification', e.target.value)}
                value={searchParams.get('certification') || 'all'}
                className="w-full sm:w-auto px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
            >
                <option value="all">All Certifications</option>
                <option value="STOTT">STOTT Pilates</option>
                <option value="BASI">BASI</option>
                <option value="Balanced Body">Balanced Body</option>
                <option value="Polestar">Polestar</option>
                <option value="Classical">Classical</option>
            </select>

            {/* Amenities Filter */}
            <select
                onChange={(e) => handleFilter('amenity', e.target.value)}
                value={searchParams.get('amenity') || 'all'}
                className="w-full sm:w-auto px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
            >
                <option value="all">All Amenities</option>
                {STUDIO_AMENITIES.map(amenity => (
                    <option key={amenity} value={amenity}>{amenity}</option>
                ))}
            </select>

            {/* Date Filter */}
            <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleFilter('date', e.target.value)}
                value={searchParams.get('date') || ''}
                className="w-full sm:w-auto px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
            />

            {/* Time Filter */}
            <input
                type="time"
                min={
                    searchParams.get('date') === new Date().toISOString().split('T')[0]
                        ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : undefined
                }
                onChange={(e) => handleFilter('time', e.target.value)}
                value={searchParams.get('time') || ''}
                className="w-full sm:w-auto px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
            />
        </div>
    )
}
