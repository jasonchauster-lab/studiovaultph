'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { onlineStoreNavItems } from '@/lib/studio/online-store-navigation'

function isActiveLink(pathname: string, href: string) {
    if (href === '/studio/online-store') {
        return pathname === href
    }

    return pathname === href || pathname.startsWith(`${href}/`)
}

export default function OnlineStoreMobileNav() {
    const pathname = usePathname()

    return (
        <div className="lg:hidden -mx-4 sm:-mx-8 px-4 sm:px-8 pb-6">
            <div className="overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-2 min-w-max">
                    {onlineStoreNavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = isActiveLink(pathname, item.href)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all',
                                    isActive
                                        ? 'border-[#2D3282] bg-[#2D3282] text-white shadow-lg shadow-indigo-950/10'
                                        : 'border-zinc-200 bg-white text-zinc-500'
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {item.shortName || item.name}
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
