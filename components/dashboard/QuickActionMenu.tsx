'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { 
    Plus, ChevronRight, 
    Layers, CreditCard, Presentation, CalendarClock, Calendar,
    Monitor, Palette, GitBranch, FilePlus, Pen,
    UserPlus, Contact, Umbrella, QrCode
} from 'lucide-react'
import { useClickAway } from 'react-use'
import clsx from 'clsx'

interface QuickActionItemProps {
    label: string
    icon: React.ElementType
    href: string
    onClick?: () => void
}

function QuickActionItem({ label, icon: Icon, href, onClick }: QuickActionItemProps) {
    return (
        <Link 
            href={href}
            onClick={onClick}
            className="px-6 py-4 flex items-center justify-between group hover:bg-white/5 transition-all outline-none focus:bg-white/5"
        >
            <div className="flex items-center gap-4">
                <Icon className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                <span className="text-[12px] font-medium text-zinc-400 group-hover:text-white transition-colors">
                    {label}
                </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-white transition-colors" />
        </Link>
    )
}

interface QuickActionSectionProps {
    title: string
    items: QuickActionItemProps[]
    onItemClick: () => void
}

function QuickActionSection({ title, items, onItemClick }: QuickActionSectionProps) {
    return (
        <div className="flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-900">
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    {title}
                </h3>
            </div>
            <div className="flex flex-col">
                {items.map((item, idx) => (
                    <QuickActionItem 
                        key={idx} 
                        {...item} 
                        onClick={onItemClick}
                    />
                ))}
            </div>
        </div>
    )
}

export default function QuickActionMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useClickAway(containerRef, () => {
        setIsOpen(false)
    })

    const sections = [
        {
            title: 'Service',
            items: [
                { label: 'Add a new package', icon: Layers, href: '/studio/pricing?tab=packages' },
                { label: 'Add a new membership', icon: CreditCard, href: '/studio/pricing?tab=memberships' },
                { label: 'Add a new class', icon: Presentation, href: '/studio/services?type=class' },
                { label: 'Add a appointment', icon: CalendarClock, href: '/studio/services?type=appointment' },
                { label: 'Create a schedule', icon: Calendar, href: '/studio/schedule' },
            ]
        },
        {
            title: 'Online store',
            items: [
                { label: 'View live site', icon: Monitor, href: '/studio/website' },
                { label: 'Customize your website', icon: Palette, href: '/studio/website' },
                { label: 'Arrange navigation', icon: GitBranch, href: '/studio/website' },
                { label: 'Add a new page', icon: FilePlus, href: '/studio/website' },
                { label: 'Add a new blog post', icon: Pen, href: '/studio/website' },
            ]
        },
        {
            title: 'Management',
            items: [
                { label: 'Add a new staff', icon: UserPlus, href: '/studio/staff' },
                { label: 'Add a new role', icon: Contact, href: '/studio/staff' },
                { label: 'Download outlet QR code', icon: QrCode, href: '/studio/settings' },
            ]
        }
    ]

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                    isOpen 
                        ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20" 
                        : "bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 flex items-center gap-2 shadow-sm hover:shadow-md"
                )}
            >
                <div className={clsx(
                    "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                    isOpen ? "bg-white/20 text-white" : "bg-zinc-50 text-zinc-400"
                )}>
                    <Plus className={clsx("w-4 h-4 transition-transform duration-300", isOpen && "rotate-45")} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest">Add</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-[#0A0A0A] rounded-2xl shadow-2xl border border-zinc-800 z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col divide-y divide-zinc-900 max-h-[80vh] overflow-y-auto scrollbar-premium">
                        {sections.map((section, idx) => (
                            <QuickActionSection 
                                key={idx} 
                                title={section.title} 
                                items={section.items} 
                                onItemClick={() => setIsOpen(false)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
