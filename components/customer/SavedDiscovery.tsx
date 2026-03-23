'use client'

import { useState, useEffect, useCallback } from 'react'
import { Heart, ChevronRight, User, Home } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import clsx from 'clsx'
import AvatarWithFallback from './AvatarWithFallback'

interface SavedItem {
    id: string
    name: string
    type: 'instructor' | 'studio'
    avatar?: string
    location?: string
}

interface SavedDiscoveryProps {
    allInstructors: any[]
    allStudios: any[]
}

export default function SavedDiscovery({ allInstructors, allStudios }: SavedDiscoveryProps) {
    const [savedItems, setSavedItems] = useState<SavedItem[]>([])
    const [isVisible, setIsVisible] = useState(false)

    const loadSaved = useCallback(() => {
        const savedInstructors = JSON.parse(localStorage.getItem('studiovault_saved_instructors') || '[]')
        const savedStudios = JSON.parse(localStorage.getItem('studiovault_saved_studios') || '[]')

        const items: SavedItem[] = []

        savedInstructors.forEach((id: string) => {
            const inst = allInstructors.find(i => i.id === id)
            if (inst) {
                items.push({
                    id: inst.id,
                    name: inst.full_name,
                    type: 'instructor',
                    avatar: inst.avatar_url,
                    location: inst.instagram_handle ? `@${inst.instagram_handle}` : 'Instructor'
                })
            }
        })

        savedStudios.forEach((id: string) => {
            const studio = allStudios.find(s => s.id === id)
            if (studio) {
                items.push({
                    id: studio.id,
                    name: studio.name,
                    type: 'studio',
                    avatar: studio.logo_url || studio.banner_url,
                    location: studio.location
                })
            }
        })

        setSavedItems(items)
        setIsVisible(items.length > 0)
    }, [allInstructors, allStudios])

    useEffect(() => {
        loadSaved()
        window.addEventListener('studiovault_saved_changed', loadSaved)
        return () => window.removeEventListener('studiovault_saved_changed', loadSaved)
    }, [loadSaved])

    if (!isVisible) return null

    return (
        <section className="animate-in fade-in slide-in-from-top-4 duration-700 ease-out mb-12">
            <div className="flex items-center justify-between mb-6 group/header">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-burgundy/5 flex items-center justify-center border border-burgundy/10 group-hover/header:bg-burgundy group-hover/header:text-white transition-all">
                        <Heart className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-burgundy uppercase tracking-[0.2em]">Saved for You</h2>
                        <p className="text-[10px] font-bold text-burgundy/30 uppercase tracking-widest mt-0.5">Quick access to your favorites</p>
                    </div>
                </div>
                <div className="h-px flex-1 bg-burgundy/5 mx-6 hidden sm:block" />
                <span className="text-[10px] font-black text-burgundy/20 uppercase tracking-widest">{savedItems.length} items</span>
            </div>

            <div className="relative group/carousel">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {savedItems.map((item) => (
                        <Link 
                            key={item.id}
                            href={item.type === 'instructor' ? `/instructors/${item.id}` : `/studios/${item.id}`}
                            className="flex-shrink-0 w-64 snap-start atelier-card p-4 flex items-center gap-4 hover:shadow-card hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-tight group-hover:border-forest/20 transition-colors">
                                <AvatarWithFallback 
                                    src={item.avatar} 
                                    alt={item.name} 
                                    initials={item.name.slice(0, 1)}
                                />
                                <div className="absolute inset-0 bg-burgundy/5 group-hover:bg-transparent transition-colors" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-burgundy truncate uppercase tracking-tight group-hover:text-forest transition-colors">
                                    {item.name}
                                </p>
                                <p className="text-[9px] font-bold text-burgundy/30 truncate uppercase tracking-widest mt-0.5">
                                    {item.location}
                                </p>
                            </div>

                            <ChevronRight className="w-4 h-4 text-burgundy/10 group-hover:text-forest transition-colors" />
                        </Link>
                    ))}
                </div>
                
                {/* Visual fade on edges if scrollable */}
                <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#faf9f6] to-transparent pointer-events-none opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
            </div>
        </section>
    )
}
