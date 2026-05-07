'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, LayoutGrid } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import clsx from 'clsx'

interface Outlet {
    id: string
    name: string
    address?: string
}

interface LocationSwitcherProps {
    outlets: Outlet[]
    currentOutletId?: string
}

export default function LocationSwitcher({ outlets, currentOutletId }: LocationSwitcherProps) {
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
        
        // Use current pathname instead of hardcoding /studio
        router.push(`${pathname}?${params.toString()}`)
        setIsOpen(false)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-6 py-3 bg-white/40 backdrop-blur-xl border border-zinc-200/50 rounded-2xl shadow-sm hover:shadow-md hover:border-[#2D3282]/30 transition-all duration-300 group"
            >
                <div className="w-8 h-8 rounded-xl bg-[#2D3282]/5 flex items-center justify-center text-[#2D3282]">
                    {currentOutletId ? <MapPin className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </div>
                <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-none mb-1">Operating View</p>
                    <p className="text-sm font-black text-zinc-900 tracking-tight leading-none group-hover:text-[#2D3282] transition-colors">
                        {currentOutlet ? currentOutlet.name : 'Total Overview'}
                    </p>
                </div>
                <ChevronDown className={clsx(
                    "w-4 h-4 text-zinc-400 transition-transform duration-300 ml-2",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white/90 backdrop-blur-2xl border border-zinc-200/50 rounded-[2rem] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="space-y-1">
                        <button
                            onClick={() => handleSelect(null)}
                            className={clsx(
                                "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200",
                                !currentOutletId ? "bg-[#2D3282] text-white" : "hover:bg-zinc-50 text-zinc-600"
                            )}
                        >
                            <div className="flex items-center gap-3 text-left">
                                <LayoutGrid className="w-4 h-4 opacity-70" />
                                <div>
                                    <p className="text-sm font-black tracking-tight">Total Overview</p>
                                    <p className={clsx("text-[10px] font-bold uppercase tracking-wider", !currentOutletId ? "text-white/60" : "text-zinc-400")}>Consolidated stats</p>
                                </div>
                            </div>
                            {!currentOutletId && <Check className="w-4 h-4" />}
                        </button>

                        <div className="h-px bg-zinc-100 my-2 mx-4" />

                        {outlets.map((outlet) => (
                            <button
                                key={outlet.id}
                                onClick={() => handleSelect(outlet.id)}
                                className={clsx(
                                    "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200",
                                    currentOutletId === outlet.id ? "bg-[#2D3282] text-white" : "hover:bg-zinc-50 text-zinc-600"
                                )}
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className={clsx("w-2 h-2 rounded-full", currentOutletId === outlet.id ? "bg-white" : "bg-emerald-500")} />
                                    <div>
                                        <p className="text-sm font-black tracking-tight">{outlet.name}</p>
                                        <p className={clsx("text-[10px] font-bold uppercase tracking-wider line-clamp-1", currentOutletId === outlet.id ? "text-white/60" : "text-zinc-400")}>
                                            {outlet.address || 'Active Branch'}
                                        </p>
                                    </div>
                                </div>
                                {currentOutletId === outlet.id && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
