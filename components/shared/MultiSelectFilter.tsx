'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X, Search, Filter } from 'lucide-react'
import clsx from 'clsx'

interface MultiSelectFilterProps {
    label: string
    options: string[]
    value: string[]
    onChange: (value: string[]) => void
    className?: string
}

export default function MultiSelectFilter({ label, options, value, onChange, className }: MultiSelectFilterProps) {
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

    const toggleOption = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter(v => v !== option))
        } else {
            onChange([...value, option])
        }
    }

    const isActive = value.length > 0
    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div ref={ref} className={clsx('relative', className)}>
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
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[120px] truncate">
                    {isActive ? `${label} (${value.length})` : label}
                </span>
                {isActive ? (
                    <X 
                        className="w-2.5 h-2.5 shrink-0 opacity-70 hover:opacity-100" 
                        onClick={e => { 
                            e.stopPropagation()
                            onChange([])
                            setOpen(false) 
                        }} 
                    />
                ) : (
                    <ChevronDown className={clsx('w-3 h-3 shrink-0 transition-transform', open && 'rotate-180')} />
                )}
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-3 left-0 w-64 bg-white rounded-[24px] border border-border-grey shadow-cloud overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-border-grey/10">
                        <div className="flex items-center gap-3 border border-border-grey focus-within:border-sage rounded-xl px-4 py-2 transition-all bg-off-white shadow-inner">
                            <Search className="w-3.5 h-3.5 text-charcoal/30 shrink-0" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${label.toLowerCase()}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-[11px] font-bold text-charcoal placeholder-charcoal/20 outline-none"
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="px-6 py-4 text-center">
                                <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">No results</p>
                            </div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = value.includes(opt)
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggleOption(opt)}
                                        className={clsx(
                                            'w-full flex items-center justify-between px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all',
                                            isSelected 
                                                ? 'bg-sage/10 text-sage' 
                                                : 'text-charcoal/60 hover:bg-off-white hover:text-charcoal'
                                        )}
                                    >
                                        <span>{opt}</span>
                                        {isSelected && <Check className="w-3 h-3" />}
                                    </button>
                                )
                            })
                        )}
                    </div>

                    {isActive && (
                        <div className="p-2 border-t border-border-grey/10 bg-off-white/50">
                            <button
                                onClick={() => onChange([])}
                                className="w-full py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-charcoal/40 hover:text-charcoal transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
