'use client'

import React from 'react'
import { Search, Package, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

interface PricingEmptyStateProps {
    type: 'search' | 'category' | 'empty'
    activeTab: 'memberships' | 'packages'
    onClearFilters?: () => void
}

export default function PricingEmptyState({ type, activeTab, onClearFilters }: PricingEmptyStateProps) {
    const isMembership = activeTab === 'memberships'
    
    const content = {
        search: {
            icon: Search,
            title: 'No matches found',
            description: `We couldn't find any ${activeTab} matching your current filters.`
        },
        category: {
            icon: Layers,
            title: 'Empty Category',
            description: `This category doesn't have any ${activeTab} assigned to it yet.`
        },
        empty: {
            icon: Package,
            title: `No ${activeTab} created yet`,
            description: `Start by creating your first ${isMembership ? 'membership plan' : 'pricing package'} for your clients.`
        }
    }[type]

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white border border-dashed border-zinc-200 rounded-[3rem] animate-in fade-in zoom-in duration-500"
        >
            <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center mb-8 border border-zinc-100/50">
                <content.icon className="w-10 h-10 text-zinc-300" />
            </div>
            
            <div className="space-y-2 mb-10 max-w-sm">
                <h3 className="text-xl font-black text-zinc-900 tracking-tight">{content.title}</h3>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest leading-relaxed">
                    {content.description}
                </p>
            </div>

            {type === 'search' && onClearFilters && (
                <Button 
                    variant="outline" 
                    onClick={onClearFilters}
                    className="px-8"
                >
                    Clear All Filters
                </Button>
            )}
        </motion.div>
    )
}
