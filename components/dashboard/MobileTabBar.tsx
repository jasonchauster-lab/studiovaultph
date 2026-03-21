'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Calendar, Wallet, Menu } from 'lucide-react'
import { clsx } from 'clsx'

interface MobileTabBarProps {
    onOpenMenu: () => void
}

export default function MobileTabBar({ onOpenMenu }: MobileTabBarProps) {
    const pathname = usePathname()

    const navItems = [
        { label: 'Find', icon: Search, href: '/customer' },
        { label: 'Sessions', icon: Calendar, href: '/customer/bookings' },
        { label: 'Wallet', icon: Wallet, href: '/customer/wallet' },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-md border-t border-border-grey px-2 pb-safe">
            <div className="flex items-center justify-around h-20">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300",
                                isActive ? "text-forest scale-110" : "text-burgundy/40 hover:text-burgundy"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5", isActive ? "fill-forest/10" : "")} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                        </Link>
                    )
                })}
                <button
                    onClick={onOpenMenu}
                    className="flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl text-burgundy/40 hover:text-burgundy transition-all duration-300"
                >
                    <Menu className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
                </button>
            </div>
        </div>
    )
}
