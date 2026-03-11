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

/** Wrap matching text in <strong> tags */
export function highlightMatch(text: string, query: string) {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? <strong key={i} className="font-bold">{part}</strong> : part
            )}
        </>
    )
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
            let subs = g.locations.filter(loc => {
                if (lowerSearch) return loc.toLowerCase().includes(lowerSearch) || g.city.toLowerCase().includes(lowerSearch)
                // No search: apply smart filter
                if (availableLocations?.length && !availableLocations.includes(loc)) return false
                return true
            })

            // If no search query, only suggest top 3 sub-locations for this hub
            if (!lowerSearch) {
                subs = subs.slice(0, 3)
            }

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
                    'flex items-center gap-3 px-4 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm',
                    isActive
                        ? 'bg-sage text-white border-sage'
                        : 'bg-white text-charcoal border-border-grey hover:border-sage/40 hover:bg-off-white'
                )}
            >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[160px] truncate">{displayLabel(value)}</span>
                {isActive
                    ? <X className="w-2.5 h-2.5 shrink-0 opacity-70 hover:opacity-100" onClick={e => { e.stopPropagation(); onChange('all'); setOpen(false) }} />
                    : <ChevronDown className={clsx('w-3 h-3 shrink-0 transition-transform', open && 'rotate-180')} />
                }
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute z-50 top-full mt-3 left-0 w-80 bg-white rounded-[24px] border border-border-grey shadow-cloud overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">

                    {/* City pills */}
                    <div className="p-4 border-b border-white/40 flex flex-wrap gap-2">
                        {FILTER_CITIES.map(city => {
                            const isCityActive = activePrefix === city.prefix
                            return (
                                <button
                                    key={city.prefix}
                                    type="button"
                                    onClick={() => handleCityPill(city.prefix)}
                                    className={clsx(
                                        'px-3.5 py-1.5 rounded-full text-[10px] font-bold border uppercase tracking-widest transition-all',
                                        isCityActive
                                            ? 'bg-sage text-white border-sage shadow-sm'
                                            : 'bg-off-white text-charcoal/60 border-border-grey hover:border-sage/40 hover:bg-white'
                                    )}
                                >
                                    {city.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b border-border-grey/10">
                        <div className="flex items-center gap-3 border border-border-grey focus-within:border-sage rounded-xl px-4 py-2.5 transition-all bg-off-white shadow-inner">
                            <Search className="w-3.5 h-3.5 text-charcoal/30 shrink-0" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search areas…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-[11px] font-bold text-charcoal placeholder-charcoal/20 outline-none"
                            />
                            {search && <button onClick={() => setSearch('')} className="text-charcoal/30 hover:text-charcoal"><X className="w-3 h-3" /></button>}
                        </div>
                    </div>

                    {/* Sub-location list */}
                    <div className="max-h-72 overflow-y-auto py-3 custom-scrollbar">
                        {visibleGroups.length === 0 && (
                            <div className="px-6 py-10 text-center">
                                <p className="text-[11px] font-bold text-charcoal/30 uppercase tracking-widest">No matching areas found</p>
                            </div>
                        )}
                        {visibleGroups.map(group => (
                            <div key={group.city} className="mb-4 last:mb-0">
                                <div className="px-5 pt-2 pb-2">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-sage/60">{group.city}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 px-4 pb-2">
                                    {group.locations.map(loc => {
                                        const isSel = value === loc
                                        return (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => { onChange(loc); setOpen(false); setSearch('') }}
                                                className={clsx(
                                                    'px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all uppercase tracking-widest',
                                                    isSel
                                                        ? 'bg-gold text-white border-gold shadow-sm'
                                                        : 'bg-white text-charcoal/60 border-border-grey hover:bg-sage/10 hover:border-sage/40 hover:text-sage'
                                                )}
                                            >
                                                {highlightMatch(shortLabel(loc), search)}
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
