'use client'

import React from 'react'
import { clsx } from 'clsx'

interface PricingTabSwitcherProps {
    activeTab: 'memberships' | 'packages'
    setActiveTab: (tab: 'memberships' | 'packages') => void
    onTabChange?: () => void
}

export default function PricingTabSwitcher({ 
    activeTab, 
    setActiveTab,
    onTabChange 
}: PricingTabSwitcherProps) {
    const tabs = ['packages', 'memberships'] as const

    return (
        <div className="flex items-center gap-8 border-b border-zinc-100 mb-8">
            {tabs.map((tab) => (
                <button 
                    key={tab}
                    onClick={() => {
                        setActiveTab(tab)
                        onTabChange?.()
                    }}
                    className={clsx(
                        "pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
                        activeTab === tab ? "text-zinc-900" : "text-zinc-300 hover:text-zinc-500"
                    )}
                >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />}
                </button>
            ))}
        </div>
    )
}
