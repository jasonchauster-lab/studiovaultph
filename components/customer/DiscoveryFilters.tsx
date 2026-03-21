'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, Calendar, Clock, ChevronDown, MapPin, Navigation, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { STUDIO_AMENITIES } from '@/types'
import { clsx } from 'clsx'
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
    const [isDetecting, setIsDetecting] = useState(false)

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
        if (!navigator.geolocation) return alert('Geolocation not supported');
        setIsDetecting(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('lat', pos.coords.latitude.toString());
                params.set('lng', pos.coords.longitude.toString());
                if (!params.has('radius')) params.set('radius', '10');
                router.push(`/customer?${params.toString()}`);
                setIsDetecting(false);
            },
            (err) => {
                console.error(err);
                alert('Could not detect location.');
                setIsDetecting(false);
            }
        );
    }

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
        <div className="flex flex-col gap-5 sm:gap-6 bg-white/70 backdrop-blur-md p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-burgundy/5 shadow-[0_20px_50px_rgba(81,50,41,0.04)] overflow-hidden relative group/filters transition-all duration-500 hover:shadow-[0_30px_70px_rgba(81,50,41,0.08)]">
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
                {/* Main Categories: Grid/Wrap on Mobile to prevent cutoff */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 flex-1">
                    <div className="min-w-[140px] flex-1 sm:flex-none">
                        {/* Type Filter */}
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

                    <div className="min-w-[140px] flex-1 sm:flex-none">
                        <LocationFilterDropdown
                            value={searchParams.get('location') || 'all'}
                            onChange={(val) => handleFilter('location', val)}
                        />
                    </div>

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

                {/* Date and Time Group */}
                <div className="flex gap-6 sm:gap-6 pt-6 sm:pt-8 lg:pt-0 border-t lg:border-t-0 border-burgundy/5">
                    <div className="flex flex-col gap-2.5 flex-1 lg:flex-none">
                        <label className="text-[9px] font-black text-burgundy/30 uppercase tracking-[0.2em] ml-1.5">Date</label>
                        <div className="relative group/input">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/30 group-focus-within/input:text-forest transition-colors pointer-events-none" />
                            <input
                                type="date"
                                min={getManilaTodayStr()}
                                onChange={(e) => handleFilter('date', e.target.value)}
                                value={searchParams.get('date') || ''}
                                className="w-full lg:w-44 pl-12 pr-4 py-2.5 bg-off-white/50 border border-burgundy/5 rounded-xl sm:rounded-2xl text-[12px] font-bold text-burgundy shadow-sm focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 transition-all cursor-pointer hover:bg-white hover:border-burgundy/20 h-[50px] sm:h-[54px]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5 flex-1 lg:flex-none">
                        <label className="text-[9px] font-black text-burgundy/30 uppercase tracking-[0.2em] ml-1.5">Time</label>
                        <div className="relative group/input">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/30 group-focus-within/input:text-forest transition-colors pointer-events-none" />
                            <input
                                type="time"
                                min={
                                    searchParams.get('date') === getManilaTodayStr()
                                        ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                        : undefined
                                }
                                onChange={(e) => handleFilter('time', e.target.value)}
                                value={searchParams.get('time') || ''}
                                className="w-full lg:w-36 pl-12 pr-4 py-2.5 bg-off-white/50 border border-burgundy/5 rounded-xl sm:rounded-2xl text-[12px] font-bold text-burgundy shadow-sm focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 transition-all cursor-pointer hover:bg-white hover:border-burgundy/20 h-[50px] sm:h-[54px]"
                            />
                        </div>
                    </div>
                </div>

                {/* Distance and Location Group */}
                <div className="flex flex-col sm:flex-row gap-6 pt-6 sm:pt-8 lg:pt-0 border-t lg:border-t-0 border-burgundy/5 lg:border-l lg:pl-8">
                    <div className="flex flex-col gap-2.5 min-w-[140px]">
                        <label className="text-[9px] font-black text-burgundy/30 uppercase tracking-[0.2em] ml-1.5 flex items-center justify-between">
                            Distance
                            {hasLocation && <span className="text-forest lowercase italic font-medium">Active</span>}
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="relative group/select flex-1">
                                <select
                                    onChange={(e) => handleFilter('radius', e.target.value)}
                                    value={currentRadius}
                                    className="w-full pl-5 pr-10 py-3 bg-off-white/50 border border-burgundy/5 rounded-xl sm:rounded-2xl text-[11px] font-black uppercase tracking-widest text-burgundy shadow-sm appearance-none cursor-pointer hover:bg-white hover:border-burgundy/20 h-[50px] sm:h-[54px]"
                                >
                                    <option value="all">Any Dist.</option>
                                    <option value="5">Within 5km</option>
                                    <option value="10">Within 10km</option>
                                    <option value="20">Within 20km</option>
                                    <option value="50">Within 50km</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/30 pointer-events-none" />
                            </div>
                            <button
                                onClick={handleLocationDetect}
                                className={clsx(
                                    "p-4 rounded-xl sm:rounded-2xl border transition-all shadow-sm active:scale-95 h-[50px] sm:h-[54px] flex items-center justify-center",
                                    hasLocation ? "bg-forest text-white border-forest" : "bg-off-white/50 border-burgundy/5 text-burgundy/40 hover:bg-white hover:border-burgundy/20"
                                )}
                                title="Detect My Location"
                            >
                                {isDetecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
