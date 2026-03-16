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
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shadow-sm h-[42px]',
                    isActive
                        ? 'bg-forest text-white border-forest'
                        : 'bg-off-white text-charcoal border-burgundy/10 hover:border-burgundy/20 hover:bg-white'
                )}
            >
                <Filter className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-forest')} />
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
                    <ChevronDown className={clsx('w-3 h-3 shrink-0 transition-transform duration-300', open && 'rotate-180')} />
                )}
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-3 left-0 w-64 bg-white rounded-[2rem] border border-burgundy/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-burgundy/5">
                        <div className="flex items-center gap-3 border border-burgundy/10 focus-within:border-forest/30 rounded-xl px-4 py-2.5 transition-all bg-off-white shadow-inner">
                            <Search className="w-3.5 h-3.5 text-burgundy/30 shrink-0" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${label.toLowerCase()}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-[11px] font-bold text-burgundy placeholder-burgundy/20 outline-none"
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-2 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="px-6 py-4 text-center">
                                <p className="text-[10px] font-bold text-burgundy/40 uppercase tracking-widest">No results</p>
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
                                            'w-full flex items-center justify-between px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-200',
                                            isSelected 
                                                ? 'bg-forest/5 text-forest' 
                                                : 'text-burgundy/60 hover:bg-off-white hover:text-burgundy'
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
                        <div className="p-3 border-t border-burgundy/5 bg-off-white/30">
                            <button
                                onClick={() => onChange([])}
                                className="w-full py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-burgundy/40 hover:text-burgundy transition-colors bg-white rounded-xl border border-burgundy/5"
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
