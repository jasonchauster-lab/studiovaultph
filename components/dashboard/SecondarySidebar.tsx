'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { getSecondaryMenus, getActivePrimaryId } from '@/lib/navigation-config'

interface SecondarySidebarProps {
    isVisible: boolean
    isStudioPortal?: boolean
}

export default function SecondarySidebar({ isVisible, isStudioPortal }: SecondarySidebarProps) {
    const pathname = usePathname()
    const parts = pathname.split('/').filter(Boolean)
    const outletId = parts[0] === 'studio' && parts[1] && !['schedule', 'services', 'pricing', 'customers', 'sales', 'reports', 'loyalty-insights', 'marketing', 'promo', 'online-store', 'management', 'scan', 'settings', 'website', 'earnings', 'history', 'staff'].includes(parts[1]) ? parts[1] : undefined
    
    const menu = React.useMemo(() => {
        const activePrimaryId = getActivePrimaryId(pathname)
        const secondaryMenus = getSecondaryMenus(outletId, !!isStudioPortal)
        return activePrimaryId ? secondaryMenus[activePrimaryId] : null
    }, [pathname, outletId, isStudioPortal])
    
    // Track open/closed states for groups
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (menu) {
            setOpenGroups(prev => {
                const next: Record<string, boolean> = {}
                menu.groups.forEach(g => {
                    const hasActiveLink = g.items.some(item => pathname === item.href)
                    // If the group title hasn't changed, persist its open state if it was already open
                    // or open it if it's the active one or the default
                    next[g.title] = g.isOpenByDefault || hasActiveLink || !!prev[g.title]
                })
                
                // Compare before updating to avoid unnecessary cycles
                const hasChanged = Object.keys(next).length !== Object.keys(prev).length ||
                                 Object.keys(next).some(k => next[k] !== prev[k])
                
                return hasChanged ? next : prev
            })
        }
    }, [menu, pathname])

    if (!isVisible || !menu) return null

    const toggleGroup = (title: string) => {
        setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }))
    }

    return (
        <div 
            className={clsx(
                "fixed top-0 left-[72px] bottom-0 w-[240px] bg-surface z-[99] transition-[transform,opacity,width] duration-300 ease-in-out animate-in slide-in-from-left-2 will-change-transform border-r border-zinc-100",
            )}
        >
            <div className="flex flex-col h-full pt-10">
                {/* Header */}
                <div className="px-6 mb-10">
                    <h2 className="text-[22px] font-black text-zinc-900 tracking-tight leading-none">
                        {menu.title}
                    </h2>
                </div>

                {/* Groups */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-10 space-y-4">
                    {menu.groups.map((group) => {
                        const isOpen = openGroups[group.title]
                        const hasActive = group.items.some(item => pathname === item.href)

                        return (
                            <div key={group.title} className="space-y-1">
                                <button
                                    onClick={() => toggleGroup(group.title)}
                                    className={clsx(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left group",
                                        hasActive ? "text-zinc-900 font-bold" : "text-zinc-500 hover:text-zinc-800"
                                    )}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-[0.15em]">
                                        {group.title}
                                    </span>
                                    {isOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                                    )}
                                </button>

                                {isOpen && (
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        {group.items.map((item) => {
                                            const isActive = pathname === item.href
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={clsx(
                                                        "px-4 py-2.5 rounded-xl text-[12px] transition-all whitespace-nowrap",
                                                        isActive 
                                                            ? "bg-white text-zinc-900 font-bold shadow-sm ring-1 ring-black/5" 
                                                            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50"
                                                    )}
                                                >
                                                    {item.label}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Version Info matched to screenshot */}
                <div className="px-6 py-6 border-t border-zinc-100/60 opacity-20">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                        Studio Vault PH<br />
                        v1.13.0
                    </p>
                </div>
            </div>
        </div>
    )
}

