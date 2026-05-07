'use client'

import React, { useState } from 'react'
import { 
    Edit2, Trash2, Package as PackageIcon
} from 'lucide-react'
import PricingItemRow from './PricingItemRow'
import { Accordion } from '@/components/ui/Accordion'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { ServiceCategory } from '@/types/agency'

interface PricingAccordionProps {
    category: ServiceCategory | { id: string, name: string }
    items: any[]
    activeTab: 'memberships' | 'packages'
    isExpanded: boolean
    onToggle: (id: string) => void
    onRename: (id: string, newName: string) => Promise<void>
    onDelete: (id: string) => Promise<void>
    // Item Actions
    onEditItem: (item: any) => void
    onDeleteItem: (item: any) => void
    deletingItemId: string | null
}

function PricingAccordion({
    category,
    items,
    activeTab,
    isExpanded,
    onToggle,
    onRename,
    onDelete,
    onEditItem,
    onDeleteItem,
    deletingItemId
}: PricingAccordionProps) {
    const [isRenaming, setIsRenaming] = useState(false)
    const [renamingName, setRenamingName] = useState(category.name)

    const handleRenameSubmit = async () => {
        if (!renamingName.trim() || renamingName === category.name) {
            setIsRenaming(false)
            return
        }
        await onRename(category.id, renamingName)
        setIsRenaming(false)
    }

    const isGeneral = category.id === 'general'

    const accordionTitle = (
        <div className="flex items-center gap-4">
            {isRenaming && !isGeneral ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                        autoFocus
                        type="text"
                        value={renamingName}
                        onChange={e => setRenamingName(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameSubmit()
                            if (e.key === 'Escape') setIsRenaming(false)
                        }}
                        className="px-3 py-1.5 text-sm font-bold border border-primary rounded-lg outline-none bg-white shadow-sm"
                    />
                    <Button size="sm" onClick={handleRenameSubmit}>Save</Button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-zinc-900">{category.name}</h3>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-zinc-100">
                        {items.length} items
                    </span>
                </div>
            )}
        </div>
    )

    const accordionActions = !isGeneral && (
        <div className="flex items-center gap-2">
            <Tooltip content="Rename Category">
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsRenaming(true)
                        setRenamingName(category.name)
                    }}
                    className="p-1.5 text-zinc-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
            </Tooltip>
            
            <Tooltip content="Delete Category">
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(category.id)
                    }}
                    className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </Tooltip>
        </div>
    )

    return (
        <Accordion
            title={accordionTitle}
            isExpanded={isExpanded}
            onToggle={() => onToggle(category.id)}
            actions={accordionActions}
        >
            <div className="divide-y divide-zinc-50">
                {items.length === 0 ? (
                    <div className="p-8">
                        <EmptyState 
                            title={`No active ${activeTab}`}
                            description={`There are currently no active ${activeTab} in this category.`}
                            icon={PackageIcon}
                            className="p-8 bg-transparent border-none"
                        />
                    </div>
                ) : (
                    items.map((item) => (
                        <PricingItemRow 
                            key={item.id}
                            item={item}
                            activeTab={activeTab}
                            isDeleting={deletingItemId === item.id}
                            onEdit={onEditItem}
                            onDelete={onDeleteItem}
                        />
                    ))
                )}
            </div>
        </Accordion>
    )
}

export default React.memo(PricingAccordion)
