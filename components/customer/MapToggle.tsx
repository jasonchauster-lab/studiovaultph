'use client'

import { Map as MapIcon, List, Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface MapToggleProps {
    view: 'list' | 'map'
    onToggle: (view: 'list' | 'map') => void
}

export default function MapToggle({ view, onToggle }: MapToggleProps) {
    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-1000 delay-500">
            <div className="flex items-center gap-1 bg-[#2C2121] p-1.5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10 backdrop-blur-xl group hover:scale-105 transition-transform duration-500">
                <button
                    onClick={() => onToggle('list')}
                    className={clsx(
                        "flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                        view === 'list' 
                            ? "bg-white text-burgundy shadow-xl" 
                            : "text-white/40 hover:text-white"
                    )}
                >
                    <List className={clsx("w-3.5 h-3.5", view === 'list' ? "text-burgundy" : "text-white/20")} />
                    <span>Show List</span>
                </button>

                <button
                    onClick={() => onToggle('map')}
                    className={clsx(
                        "flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 relative",
                        view === 'map' 
                            ? "bg-forest text-white shadow-xl" 
                            : "text-white/40 hover:text-white"
                    )}
                >
                    <MapIcon className={clsx("w-3.5 h-3.5", view === 'map' ? "text-white" : "text-white/20")} />
                    <span>Show Map</span>
                    
                    {view === 'list' && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-forest rounded-full border-2 border-[#2C2121] animate-pulse" />
                    )}
                </button>
            </div>
            
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-forest/20 blur-[60px] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </div>
    )
}
