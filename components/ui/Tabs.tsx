'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className
}) => {
  return (
    <div 
      role="tablist"
      className={cn(
        "flex items-center",
        variant === 'underline' ? "gap-8 border-b border-zinc-100" : "gap-2 p-1 bg-zinc-50 rounded-xl",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all outline-none",
              variant === 'pill' && "pb-0 px-6 py-2.5 rounded-lg",
              isActive ? "text-zinc-900" : "text-zinc-300 hover:text-zinc-500"
            )}
          >
            <span className="relative z-10">{tab.label}</span>
            
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className={cn(
                  "absolute",
                  variant === 'underline' 
                    ? "bottom-0 left-0 right-0 h-0.5 bg-primary" 
                    : "inset-0 bg-white shadow-sm border border-zinc-100 rounded-lg"
                )}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
