'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, LayoutGrid, Sparkles } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'

interface Outlet {
    id: string
    name: string
    address?: string
}

interface BranchPageSelectorProps {
    outlets: Outlet[]
    currentOutletId?: string
    isGlobalAllowed?: boolean
}

/**
 * Premium Centered Branch Selector
 * Designed to be highly visible so users don't forget their active branch context.
 */
export default function BranchPageSelector({ outlets, currentOutletId, isGlobalAllowed = true }: BranchPageSelectorProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const currentOutlet = outlets.find(o => o.id === currentOutletId)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (id: string | null) => {
        const params = new URLSearchParams(searchParams.toString())
        if (id) {
            params.set('outletId', id)
        } else {
            params.delete('outletId')
        }
        router.push(`${pathname}?${params.toString()}`)
        setIsOpen(false)
    }

    if (outlets.length <= 1) return null

    return (
        <div className="flex flex-col items-center justify-center py-4 w-full animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={clsx(
                        "flex items-center gap-6 px-10 py-5 rounded-[2.5rem] transition-all duration-500 group relative overflow-hidden h-[84px]",
                        isOpen 
                            ? "bg-white border-2 border-[#2D3282] shadow-2xl scale-105" 
                            : "bg-white/50 backdrop-blur-xl border-2 border-zinc-200/60 hover:border-[#2D3282]/40 hover:bg-white shadow-sm hover:shadow-xl"
                    )}
                >
                    {/* Visual Accent */}
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        currentOutletId ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20" : "bg-zinc-900 text-white"
                    )}>
                        {currentOutletId ? <MapPin className="w-6 h-6" /> : <LayoutGrid className="w-6 h-6" />}
                    </div>

                    <div className="flex flex-col items-start min-w-[180px]">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Viewing Location</span>
                            <Sparkles className="w-3 h-3 text-[#2D3282] opacity-40" />
                        </div>
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tightest leading-none">
                            {currentOutlet ? currentOutlet.name : 'Total Overview'}
                        </h2>
                    </div>

                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ml-4",
                        isOpen ? "bg-[#2D3282]/10 border-[#2D3282]/20 text-[#2D3282]" : "bg-zinc-50 border-zinc-200 text-zinc-400 group-hover:bg-zinc-100"
                    )}>
                        <ChevronDown className={clsx("w-5 h-5 transition-transform duration-500", isOpen && "rotate-180")} />
                    </div>
                </button>

                {isOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[400px] bg-white border border-zinc-100 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] p-4 z-[100] animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-2">
                            {isGlobalAllowed && (
                                <button
                                    onClick={() => handleSelect(null)}
                                    className={clsx(
                                        "w-full flex items-center justify-between px-6 py-5 rounded-[2rem] transition-all duration-200",
                                        !currentOutletId ? "bg-[#2D3282] text-white shadow-lg" : "hover:bg-zinc-50 text-zinc-600"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", !currentOutletId ? "bg-white/20" : "bg-zinc-100")}>
                                            <LayoutGrid className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-base font-black tracking-tight leading-none mb-1">Total Studio Overview</p>
                                            <p className={clsx("text-[10px] font-bold uppercase tracking-widest leading-none", !currentOutletId ? "text-white/60" : "text-zinc-400")}>Consolidated metrics & settings</p>
                                        </div>
                                    </div>
                                    {!currentOutletId && <Check className="w-5 h-5" />}
                                </button>
                            )}

                            {isGlobalAllowed && <div className="h-px bg-zinc-100 my-4 mx-8" />}

                            <div className="max-h-[360px] overflow-y-auto pr-2 scrollbar-hide space-y-2">
                                {outlets.map((outlet) => (
                                    <button
                                        key={outlet.id}
                                        onClick={() => handleSelect(outlet.id)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-6 py-5 rounded-[2rem] transition-all duration-200 group/item",
                                            currentOutletId === outlet.id ? "bg-[#2D3282] text-white shadow-lg" : "hover:bg-zinc-50 text-zinc-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                currentOutletId === outlet.id ? "bg-white/20" : "bg-zinc-100 group-hover/item:bg-[#2D3282]/5"
                                            )}>
                                                <MapPin className={clsx("w-5 h-5", currentOutletId === outlet.id ? "text-white" : "text-zinc-400 group-hover/item:text-[#2D3282]")} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-base font-black tracking-tight leading-none mb-1">{outlet.name}</p>
                                                <p className={clsx("text-[10px] font-bold uppercase tracking-widest leading-none truncate max-w-[200px]", currentOutletId === outlet.id ? "text-white/60" : "text-zinc-400")}>
                                                    {outlet.address || 'Active Branch'}
                                                </p>
                                            </div>
                                        </div>
                                        {currentOutletId === outlet.id && <Check className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
