'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, X } from 'lucide-react'
import clsx from 'clsx'

// City → DB prefix mapping
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

/** Get the display label for a value (e.g. 'QC' → 'Quezon City') */
export function displayLabel(value: string): string {
    if (!value || value === 'all') return 'All Locations'
    const city = FILTER_CITIES.find(c => c.prefix === value)
    if (city) return city.label
    // If it's a sub-location (legacy support), just show it
    return value
}

interface LocationFilterDropdownProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

export default function LocationFilterDropdown({ value, onChange, className }: LocationFilterDropdownProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const isActive = value && value !== 'all'
    const activePrefix = value.includes(' - ') ? value.split(' - ')[0] : value

    const handleCityPill = (prefix: string) => {
        onChange(prefix)
        setOpen(false)
    }

    return (
        <div ref={ref} className={clsx('relative', className)}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={clsx(
                    'flex items-center gap-3 px-4 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm',
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
                    <div className="p-5 flex flex-wrap gap-2.5">
                        {FILTER_CITIES.map(city => {
                            const isCityActive = activePrefix === city.prefix
                            return (
                                <button
                                    key={city.prefix}
                                    type="button"
                                    onClick={() => handleCityPill(city.prefix)}
                                    className={clsx(
                                        'px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest transition-all',
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
                </div>
            )}
        </div>
    )
}
