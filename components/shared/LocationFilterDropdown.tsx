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
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm h-[50px]',
                    isActive
                        ? 'bg-forest text-white border-forest'
                        : 'bg-off-white text-charcoal border-burgundy/10 hover:border-burgundy/20 hover:bg-white'
                )}
            >
                <MapPin className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-forest')} />
                <span className="max-w-[160px] truncate">{displayLabel(value)}</span>
                {isActive
                    ? <X className="w-2.5 h-2.5 shrink-0 opacity-70 hover:opacity-100" onClick={e => { e.stopPropagation(); onChange('all'); setOpen(false) }} />
                    : <ChevronDown className={clsx('w-3 h-3 shrink-0 transition-transform duration-300', open && 'rotate-180')} />
                }
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute z-50 top-full mt-3 left-0 w-80 bg-white rounded-[2rem] border border-burgundy/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-6 flex flex-wrap gap-2.5">
                        {FILTER_CITIES.map(city => {
                            const isCityActive = activePrefix === city.prefix
                            return (
                                <button
                                    key={city.prefix}
                                    type="button"
                                    onClick={() => handleCityPill(city.prefix)}
                                    className={clsx(
                                        'px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest transition-all duration-300',
                                        isCityActive
                                            ? 'bg-forest text-white border-forest shadow-md'
                                            : 'bg-off-white text-charcoal/60 border-burgundy/10 hover:border-burgundy/30 hover:bg-white hover:text-charcoal'
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
