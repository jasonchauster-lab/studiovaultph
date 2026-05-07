'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Calendar, Wallet, Menu, LayoutGrid } from 'lucide-react'
import { clsx } from 'clsx'

interface MobileTabBarProps {
    onOpenMenu: () => void
}

export default function MobileTabBar({ onOpenMenu }: MobileTabBarProps) {
    const pathname = usePathname()

    const navItems = [
        { 
            label: 'Home', 
            icon: LayoutGrid, 
            href: '/welcome' 
        },
        { 
            label: 'Schedule', 
            icon: Calendar, 
            href: pathname.includes('/instructor') ? '/instructor/schedule' : pathname.includes('/studio') ? '/studio/schedule' : '/customer/bookings' 
        },
        { 
            label: 'Earnings', 
            icon: Wallet, 
            href: pathname.includes('/instructor') ? '/instructor/earnings' : pathname.includes('/studio') ? '/studio/earnings' : '/customer/wallet' 
        },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-zinc-100 px-4 pb-safe-offset-4">
            <div className="flex items-center justify-between h-20">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300",
                                isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                            )}
                        >
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                isActive ? "bg-zinc-900 text-white shadow-lg -translate-y-1" : ""
                            )}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                        </Link>
                    )
                })}
                <button
                    onClick={onOpenMenu}
                    className="flex flex-col items-center gap-1 px-4 py-2 text-zinc-400 hover:text-zinc-600 transition-all duration-300"
                >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                        <Menu className="w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">Menu</span>
                </button>
            </div>
        </div>
    )
}
