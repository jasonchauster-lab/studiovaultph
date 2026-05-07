'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { onlineStoreNavGroups } from '@/lib/studio/online-store-navigation'

export default function StoreSidebar() {
    const pathname = usePathname()

    const isActiveLink = (href: string) => {
        if (href === '/studio/online-store') {
            return pathname === href
        }

        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <div className="w-64 h-full bg-[#fafafa] border-r border-zinc-200/50 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-8 pb-4">
                <h2 className="text-[15px] font-black text-zinc-900 tracking-tight">Online Store</h2>
            </div>

            <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                {onlineStoreNavGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        <p className="px-4 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                            {group.title}
                        </p>

                        {group.items.map((link) => {
                            const isActive = isActiveLink(link.href)
                            const Icon = link.icon

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group",
                                        isActive
                                            ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                                            : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50"
                                    )}
                                >
                                    <Icon className={clsx(
                                        "w-4 h-4 transition-colors",
                                        isActive ? "text-[#2D3282]" : "text-zinc-400 group-hover:text-zinc-600"
                                    )} />
                                    {link.name}
                                </Link>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Subtle bottom detail matching design */}
            <div className="p-8 pt-4 opacity-30 mt-auto">
                <div className="h-px bg-zinc-200 w-full" />
            </div>
        </div>
    )
}
