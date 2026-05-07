import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

interface StudioDashboardShellProps {
    title: string
    description?: string
    breadcrumbs?: { label: string; href?: string }[]
    actions?: React.ReactNode
    children: React.ReactNode
}

export default function StudioDashboardShell({
    title,
    description,
    breadcrumbs = [],
    actions,
    children
}: StudioDashboardShellProps) {
    return (
        <div className="min-h-full bg-white lg:pt-6 pt-24 pb-20 animate-in fade-in duration-500">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* Studio Style Breadcrumbs & Title Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <Breadcrumbs items={breadcrumbs} />
                        <h1 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">
                            {title}
                        </h1>
                    </div>

                    {actions && (
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {actions}
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="relative pt-6">
                    {children}
                </div>

                {/* Footer Branding (Subtle) */}
                <div className="pt-20 border-t border-zinc-100 flex items-center justify-between opacity-20">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                        Studio Vault PH
                    </p>
                    <span className="text-[9px] font-bold text-zinc-400">Version 1.13.0</span>
                </div>
            </div>
        </div>
    )
}
