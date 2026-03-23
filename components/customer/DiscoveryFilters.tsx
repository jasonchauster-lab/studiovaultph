'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Filter, Calendar, Clock, ChevronDown, Navigation, Loader2 } from 'lucide-react'
import { STUDIO_AMENITIES } from '@/types'
import { clsx } from 'clsx'
import LocationFilterDropdown from '@/components/shared/LocationFilterDropdown'
import MultiSelectFilter from '@/components/shared/MultiSelectFilter'
import { getManilaTodayStr } from '@/lib/timezone'
import FilterDrawer from './FilterDrawer'
import { useGeolocation } from '@/lib/hooks/useGeolocation'

interface DiscoveryFiltersProps {
    /** Sub-location strings of verified studios that currently exist in the DB */
    availableLocations?: string[]
    userRole?: string
}

export default function DiscoveryFilters({ availableLocations, userRole }: DiscoveryFiltersProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isDetecting, detectLocation } = useGeolocation()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const currentRadius = searchParams.get('radius') || 'all'
    const hasLocation = searchParams.get('lat') && searchParams.get('lng')

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString())
            if (value === 'all' || value === '' || value === 'null') {
                params.delete(name)
            } else {
                params.set(name, value)
            }
            return params.toString()
        },
        [searchParams]
    )

    const handleLocationDetect = () => {
        detectLocation()
    }

    const handleFilter = (name: string, value: string) => {
        // PROACTIVE UX: If user selects a radius but hasn't set location, trigger detection
        if (name === 'radius' && value !== 'all' && !hasLocation) {
            handleLocationDetect();
        }
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
        <div className="flex flex-col gap-5 sm:gap-6 bg-white/70 backdrop-blur-md p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-burgundy/5 shadow-[0_20px_50px_rgba(81,50,41,0.04)] relative group/filters transition-all duration-500 hover:shadow-[0_30px_70px_rgba(81,50,41,0.08)]">
            {/* Header: Label + Clear (on mobile) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 text-burgundy/60">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-walking-vinnie/10 flex items-center justify-center border border-walking-vinnie/20 shadow-inner group-hover/filters:scale-105 transition-transform duration-500">
                        <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-burgundy/40" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-burgundy leading-none mb-1">Filter Discovery</span>
                        <p className="text-[9px] sm:text-[10px] font-bold text-burgundy/20 uppercase tracking-[0.1em] sm:tracking-[0.15em]">Tailor your search</p>
                    </div>
                </div>

                {hasFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="text-[10px] font-black text-burgundy/60 hover:text-white hover:bg-burgundy transition-all duration-500 uppercase tracking-[0.2em] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-off-white border border-burgundy/10 hover:border-burgundy shadow-sm transform active:scale-95"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end gap-6 sm:gap-8">
                {/* Desktop View: Main Categories */}
                <div className="hidden lg:flex flex-wrap items-center gap-4 flex-1">
                    {userRole !== 'instructor' && (
                        <div className="min-w-[140px] flex-1 sm:flex-none">
                            <div className="relative group w-full">
                                <select
                                    onChange={(e) => handleFilter('type', e.target.value)}
                                    value={searchParams.get('type') || 'all'}
                                    className="w-full sm:w-auto pl-5 pr-12 py-3 bg-off-white/50 border border-burgundy/5 rounded-xl sm:rounded-2xl text-[11px] font-black uppercase tracking-widest text-burgundy shadow-sm focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 transition-all appearance-none cursor-pointer hover:bg-white hover:border-burgundy/20 whitespace-nowrap h-[50px] sm:h-[54px]"
                                >
                                    <option value="all">All Modes</option>
                                    <option value="instructor">Instructors</option>
                                    <option value="studio">Studios</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-burgundy/30 group-hover:text-forest transition-colors">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="min-w-[140px] flex-1 sm:flex-none">
                        <MultiSelectFilter
                            label="Equipment"
                            options={['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat']}
                            value={getMultiValue('equipment')}
                            onChange={(vals) => handleMultiFilter('equipment', vals)}
                            className="w-full"
                        />
                    </div>

                    <div className="min-w-[120px] flex-1 sm:flex-none">
                        <MultiSelectFilter
                            label="Cert"
                            options={['STOTT', 'BASI', 'Balanced Body', 'Polestar', 'Classical']}
                            value={getMultiValue('certification')}
                            onChange={(vals) => handleMultiFilter('certification', vals)}
                            className="w-full"
                        />
                    </div>

                    <div className="min-w-[120px] flex-1 sm:flex-none">
                        <MultiSelectFilter
                            label="Amenities"
                            options={[...STUDIO_AMENITIES]}
                            value={getMultiValue('amenity')}
                            onChange={(vals) => handleMultiFilter('amenity', vals)}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Mobile View: Single Filter Button */}
                <div className="flex lg:hidden flex-col gap-4">
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex items-center justify-between w-full px-6 py-4 bg-off-white/50 border border-burgundy/10 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-burgundy shadow-sm group hover:border-burgundy/30 transition-all h-[60px]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-burgundy/5 flex items-center justify-center border border-burgundy/5 group-hover:bg-burgundy group-hover:text-white transition-all">
                                <Filter className="w-4 h-4" />
                            </div>
                            <span className="font-black">Filter Discovery</span>
                        </div>
                        <div className="flex items-center gap-3">
                             {hasFilters && (
                                <span className="px-2.5 py-1 rounded-lg bg-burgundy text-white text-[8px] font-black uppercase tracking-widest animate-pulse">
                                    Active
                                </span>
                             )}
                             <ChevronDown className="w-4 h-4 text-burgundy/20 group-hover:text-burgundy/40" />
                        </div>
                    </button>
                </div>
                <FilterDrawer 
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    userRole={userRole}
                    handleFilter={handleFilter}
                    handleMultiFilter={handleMultiFilter}
                    getMultiValue={getMultiValue}
                />
            </div>
        </div>
    )
}
