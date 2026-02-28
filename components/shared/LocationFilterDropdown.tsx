'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, X, Search } from 'lucide-react'
import clsx from 'clsx'

export const LOCATION_GROUPS: { label: string; locations: string[] }[] = [
    {
        label: 'Alabang',
        locations: [
            'Alabang - Madrigal/Ayala Alabang',
            'Alabang - Filinvest City',
            'Alabang - Alabang Town Center Area',
            'Alabang - Others',
        ],
    },
    {
        label: 'BGC',
        locations: [
            'BGC - High Street',
            'BGC - Central Square/Uptown',
            'BGC - Forbes Town',
            'BGC - Others',
        ],
    },
    {
        label: 'Ortigas',
        locations: [
            'Ortigas - Ortigas Center',
            'Ortigas - Greenhills',
            'Ortigas - San Juan',
            'Ortigas - Others',
        ],
    },
    {
        label: 'Makati',
        locations: [
            'Makati - CBD/Ayala',
            'Makati - Poblacion/Rockwell',
            'Makati - San Antonio/Gil Puyat',
            'Makati - Others',
        ],
    },
    {
        label: 'Mandaluyong',
        locations: [
            'Mandaluyong - Ortigas South',
            'Mandaluyong - Greenfield/Shaw',
            'Mandaluyong - Boni/Pioneer',
        ],
    },
    {
        label: 'Quezon City',
        locations: [
            'QC - Tomas Morato',
            'QC - Katipunan',
            'QC - Eastwood',
            'QC - Cubao',
            'QC - Fairview/Commonwealth',
            'QC - Novaliches',
            'QC - Diliman',
            'QC - Maginhawa/UP Village',
        ],
    },
    {
        label: 'Paranaque',
        locations: [
            'Paranaque - BF Homes',
            'Paranaque - Moonwalk / Merville',
            'Paranaque - Bicutan / Sucat',
            'Paranaque - Others',
        ],
    },
]

/** Friendly label — strips the city prefix for display inside a group */
function shortLabel(loc: string): string {
    const dash = loc.indexOf(' - ')
    return dash !== -1 ? loc.slice(dash + 3) : loc
}

interface LocationFilterDropdownProps {
    /** The currently selected location value, or 'all' / '' for none */
    value: string
    /** Called when user selects a location */
    onChange: (value: string) => void
    /**
     * Restrict the picker to only these sub-location values.
     * Pass undefined / empty array to show everything.
     */
    availableLocations?: string[]
    className?: string
}

export default function LocationFilterDropdown({
    value,
    onChange,
    availableLocations,
    className,
}: LocationFilterDropdownProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const isActive = value && value !== 'all'

    // Compute which groups + sub-locations to show
    const hasAvail = availableLocations && availableLocations.length > 0
    const lowerSearch = search.toLowerCase()

    const visibleGroups = LOCATION_GROUPS.map((group) => {
        const subs = group.locations.filter((loc) => {
            if (hasAvail && !availableLocations!.includes(loc)) return false
            if (lowerSearch && !loc.toLowerCase().includes(lowerSearch) && !group.label.toLowerCase().includes(lowerSearch)) return false
            return true
        })
        return { ...group, locations: subs }
    }).filter((g) => g.locations.length > 0)

    const buttonLabel = isActive ? value : 'All Locations'

    return (
        <div ref={ref} className={clsx('relative', className)}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                    isActive
                        ? 'bg-rose-gold text-white border-rose-gold shadow-sm'
                        : 'bg-cream-50 text-charcoal-900 border-cream-200 hover:border-charcoal-400'
                )}
            >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[180px] truncate">{buttonLabel}</span>
                {isActive ? (
                    <X
                        className="w-3.5 h-3.5 shrink-0 opacity-70 hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); onChange('all'); setOpen(false) }}
                    />
                ) : (
                    <ChevronDown className={clsx('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-50 top-full mt-2 left-0 w-72 bg-white rounded-xl border border-cream-200 shadow-xl overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-cream-100">
                        <div className="flex items-center gap-2 bg-cream-50 border border-cream-200 rounded-lg px-3 py-1.5">
                            <Search className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search location…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-charcoal-900 placeholder-charcoal-400 outline-none"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-charcoal-400 hover:text-charcoal-700">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-2">
                        {/* All Locations reset */}
                        <button
                            onClick={() => { onChange('all'); setOpen(false) }}
                            className={clsx(
                                'w-full text-left px-4 py-2 text-sm font-semibold transition-colors',
                                !isActive
                                    ? 'text-rose-gold bg-rose-gold/5'
                                    : 'text-charcoal-600 hover:bg-cream-50'
                            )}
                        >
                            All Locations
                        </button>

                        {visibleGroups.length === 0 && (
                            <p className="px-4 py-6 text-sm text-charcoal-400 text-center">No locations found</p>
                        )}

                        {visibleGroups.map((group) => (
                            <div key={group.label}>
                                {/* City group header */}
                                <div className="px-4 pt-3 pb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
                                        {group.label}
                                    </span>
                                </div>
                                {/* Sub-location chips */}
                                <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                                    {group.locations.map((loc) => {
                                        const isSelected = value === loc
                                        return (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => { onChange(loc); setOpen(false); setSearch('') }}
                                                className={clsx(
                                                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                                    isSelected
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
