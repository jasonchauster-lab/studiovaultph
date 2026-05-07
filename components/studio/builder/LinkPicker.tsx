'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
    Globe, Layout, Ticket, Check, ChevronDown, 
    Search, ExternalLink, Hash, ScrollText 
} from 'lucide-react'
import { clsx } from 'clsx'

interface LinkPickerProps {
    value: string
    onChange: (value: string) => void
    config: any
    memberships?: any[]
    packages?: any[]
    placeholder?: string
}

export default function LinkPicker({ 
    value, 
    onChange, 
    config, 
    memberships = [], 
    packages = [] 
}: LinkPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Generate options
    const options = [
        // Pages
        ...Object.keys(config.pages || {}).map(page => ({
            id: page.toLowerCase() === 'home' ? '/' : `/${page.toLowerCase()}`,
            label: page,
            type: 'page',
            icon: Globe
        })),
        // Home Anchors
        ...(config.pages?.['Home']?.sections || config.sections || []).map((s: any) => ({
            id: `#${s.type}`, // Using type as simple anchor for now
            label: `Section: ${s.type.replace(/-/g, ' ')}`,
            type: 'anchor',
            icon: Hash
        })),
        // Memberships
        ...memberships.map(m => ({
            id: `/pricing?plan=${m.id}`,
            label: `Membership: ${m.name}`,
            type: 'membership',
            icon: Ticket
        })),
        // Packages
        ...packages.map(p => ({
            id: `/pricing?plan=${p.id}`,
            label: `Package: ${p.name}`,
            type: 'package',
            icon: ScrollText
        }))
    ]

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        opt.id.toLowerCase().includes(search.toLowerCase())
    )

    const selectedOption = options.find(opt => opt.id === value)

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="flex items-center gap-2 group">
                <div className="relative flex-1">
                    <input 
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        className="w-full bg-cream-50 border border-cream-100 rounded-xl p-4 text-sm font-medium text-charcoal-500 pr-10 focus:ring-2 focus:ring-forest outline-none transition-all"
                        placeholder="Link (e.g. #booking)"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-charcoal-400 group-focus-within:text-forest transition-colors">
                        <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-cream-100 z-[2000] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-cream-50 bg-cream-50/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white border border-cream-100 rounded-xl py-2.5 pl-9 pr-4 text-[12px] font-bold text-charcoal-700 placeholder:text-charcoal-300 focus:ring-0 outline-none"
                                placeholder="Search pages, sections, or plans..."
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        onChange(opt.id)
                                        setIsOpen(false)
                                        setSearch('')
                                    }}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all group/opt",
                                        value === opt.id ? "bg-forest/5 text-forest" : "hover:bg-cream-50 text-charcoal-600"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                            value === opt.id ? "bg-forest/10" : "bg-cream-50 group-hover/opt:bg-white border border-cream-100"
                                        )}>
                                            <opt.icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[13px] font-bold tracking-tight capitalize">{opt.label}</span>
                                            <span className="text-[10px] font-mono opacity-50">{opt.id}</span>
                                        </div>
                                    </div>
                                    {value === opt.id && <Check className="w-4 h-4" />}
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center bg-cream-50/30 rounded-2xl m-2 border border-dashed border-cream-100">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal-300">No results found</p>
                                <p className="text-[10px] text-charcoal-400 mt-1">Typing your own custom URL is fine too!</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-zinc-50 border-t border-cream-50 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Custom link supported</span>
                         </div>
                    </div>
                </div>
            )}
        </div>
    )
}
