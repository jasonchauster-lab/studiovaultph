'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, X, Search } from 'lucide-react'
import clsx from 'clsx'

// City → DB prefix mapping (Quezon City stores as QC in the DB)
export const FILTER_CITIES = [
    { label: 'All', prefix: 'all' },
    { label: 'Alabang', prefix: 'Alabang' },
    { label: 'BGC', prefix: 'BGC' },
    { label: 'Ortigas', prefix: 'Ortigas' },
    { label: 'Makati', prefix: 'Makati' },
    { label: 'Mandaluyong', prefix: 'Mandaluyong' },
    { label: 'Quezon City', prefix: 'QC' },
    { label: 'Paranaque', prefix: 'Paranaque' },
]

export const LOCATION_GROUPS: { city: string; prefix: string; locations: string[] }[] = [
    { city: 'Alabang', prefix: 'Alabang', locations: ['Alabang - Madrigal/Ayala Alabang', 'Alabang - Filinvest City', 'Alabang - Alabang Town Center Area', 'Alabang - Others'] },
    { city: 'BGC', prefix: 'BGC', locations: ['BGC - High Street', 'BGC - Central Square/Uptown', 'BGC - Forbes Town', 'BGC - Others'] },
    { city: 'Ortigas', prefix: 'Ortigas', locations: ['Ortigas - Ortigas Center', 'Ortigas - Greenhills', 'Ortigas - San Juan', 'Ortigas - Others'] },
    { city: 'Makati', prefix: 'Makati', locations: ['Makati - CBD/Ayala', 'Makati - Poblacion/Rockwell', 'Makati - San Antonio/Gil Puyat', 'Makati - Others'] },
    { city: 'Mandaluyong', prefix: 'Mandaluyong', locations: ['Mandaluyong - Ortigas South', 'Mandaluyong - Greenfield/Shaw', 'Mandaluyong - Boni/Pioneer'] },
    { city: 'Quezon City', prefix: 'QC', locations: ['QC - Tomas Morato', 'QC - Katipunan', 'QC - Eastwood', 'QC - Cubao', 'QC - Fairview/Commonwealth', 'QC - Novaliches', 'QC - Diliman', 'QC - Maginhawa/UP Village'] },
    { city: 'Paranaque', prefix: 'Paranaque', locations: ['Paranaque - BF Homes', 'Paranaque - Moonwalk / Merville', 'Paranaque - Bicutan / Sucat', 'Paranaque - Others'] },
]

/** Strip city prefix for short display: 'BGC - High Street' → 'High Street' */
export function shortLabel(loc: string) {
    const i = loc.indexOf(' - ')
    return i !== -1 ? loc.slice(i + 3) : loc
}

/** Resolve which city prefix is currently active (handles full sub-location strings too) */
export function activeCityPrefix(value: string): string {
    if (!value || value === 'all') return 'all'
    if (value.includes(' - ')) {
        const prefix = value.split(' - ')[0]
        return FILTER_CITIES.find(c => c.prefix === prefix)?.prefix || 'all'
    }
    return FILTER_CITIES.find(c => c.prefix === value)?.prefix || 'all'
}

/** Get the display label for a value (e.g. 'QC' → 'Quezon City', 'BGC - High Street' → 'BGC - High Street') */
export function displayLabel(value: string): string {
    if (!value || value === 'all') return 'All Locations'
    const city = FILTER_CITIES.find(c => c.prefix === value)
    if (city) return city.label
    return value
}

interface LocationFilterDropdownProps {
    value: string
    onChange: (value: string) => void
    availableLocations?: string[]
    className?: string
}

export default function LocationFilterDropdown({ value, onChange, availableLocations, className }: LocationFilterDropdownProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const isActive = value && value !== 'all'
    const activePrefix = activeCityPrefix(value)
    const lowerSearch = search.toLowerCase()

    // Compute visible sub-locations for the dropdown list
    const visibleGroups = LOCATION_GROUPS
        .filter(g => activePrefix === 'all' || g.prefix === activePrefix) // scope to selected city
        .map(g => {
            const subs = g.locations.filter(loc => {
                if (lowerSearch) return loc.toLowerCase().includes(lowerSearch) || g.city.toLowerCase().includes(lowerSearch)
                // No search: apply smart filter
                if (availableLocations?.length && !availableLocations.includes(loc)) return false
                return true
            })
            return { ...g, locations: subs }
        })
        .filter(g => g.locations.length > 0)

    const handleCityPill = (prefix: string) => {
        setSearch('')
        onChange(prefix)
    }

    return (
        <div ref={ref} className={clsx('relative', className)}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap',
                    isActive
                        ? 'bg-rose-gold text-white border-rose-gold shadow-sm'
                        : 'bg-cream-50 text-charcoal-900 border-cream-200 hover:border-charcoal-400'
                )}
            >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[160px] truncate">{displayLabel(value)}</span>
                {isActive
                    ? <X className="w-3.5 h-3.5 shrink-0 opacity-70 hover:opacity-100" onClick={e => { e.stopPropagation(); onChange('all'); setOpen(false) }} />
                    : <ChevronDown className={clsx('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
                }
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute z-50 top-full mt-2 left-0 w-80 bg-white rounded-xl border border-cream-200 shadow-xl overflow-hidden">

                    {/* City pills */}
                    <div className="p-3 border-b border-cream-100 flex flex-wrap gap-1.5">
                        {FILTER_CITIES.map(city => {
                            const isCityActive = activePrefix === city.prefix
                            return (
                                <button
                                    key={city.prefix}
                                    type="button"
                                    onClick={() => handleCityPill(city.prefix)}
                                    className={clsx(
                                        'px-3 py-1 rounded-full text-xs font-bold border transition-all',
                                        isCityActive
                                            ? 'bg-rose-gold text-white border-rose-gold shadow-sm'
                                            : 'bg-cream-100 text-charcoal-600 border-transparent hover:border-charcoal-300 hover:bg-cream-200'
                                    )}
                                >
                                    {city.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Search */}
                    <div className="p-3 border-b border-cream-100">
                        <div className="flex items-center gap-2 border border-charcoal-300/50 hover:border-charcoal-500 focus-within:border-charcoal-700 rounded-lg px-3 py-1.5 transition-colors bg-white">
                            <Search className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Fairview, High Street, Uptown…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-charcoal-900 placeholder-charcoal-400 outline-none"
                            />
                            {search && <button onClick={() => setSearch('')} className="text-charcoal-400 hover:text-charcoal-700"><X className="w-3 h-3" /></button>}
                        </div>
                    </div>

                    {/* Sub-location list */}
                    <div className="max-h-64 overflow-y-auto py-2">
                        {visibleGroups.length === 0 && (
                            <p className="px-4 py-6 text-sm text-charcoal-400 text-center">No sub-locations found</p>
                        )}
                        {visibleGroups.map(group => (
                            <div key={group.city}>
                                <div className="px-4 pt-2 pb-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-charcoal-400">{group.city}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                                    {group.locations.map(loc => {
                                        const isSel = value === loc
                                        return (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => { onChange(loc); setOpen(false); setSearch('') }}
                                                className={clsx(
                                                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                                    isSel
                                                        ? 'bg-rose-gold text-white border-rose-gold shadow-sm'
                                                        : 'bg-white text-charcoal-700 border-cream-200 hover:border-rose-gold hover:text-rose-gold'
                                                )}
                                            >
                                                {shortLabel(loc)}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
