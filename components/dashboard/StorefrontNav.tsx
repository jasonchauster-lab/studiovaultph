'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

interface StorefrontNavProps {
    links?: any[]
    slug?: string
}

export default function StorefrontNav({ links, slug }: StorefrontNavProps) {
    const pathname = usePathname()

    const defaultLinks = [
        { label: 'Home', href: '/' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Schedule', href: '/schedule' },
    ]

    const navLinks = links && links.length > 0 ? links : defaultLinks

    const resolveHref = (href: string) => {
        if (!slug) return href
        if (href.startsWith('http')) return href
        if (href.startsWith('/')) return `/s/${slug}${href}`
        if (href.startsWith('#')) return `/s/${slug}${href}`
        return `/s/${slug}/${href}`
    }

    return (
        <nav className="flex items-center gap-8">
            {navLinks.map((link, idx) => {
                const href = resolveHref(link.href || '')
                const isActive = pathname === href

                return (
                    <Link
                        key={idx}
                        href={href}
                        className={clsx(
                            "text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-100",
                            isActive ? "text-zinc-900 opacity-100" : "text-zinc-400 opacity-60"
                        )}
                    >
                        {link.label}
                    </Link>
                )
            })}
        </nav>
    )
}
