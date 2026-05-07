'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { 
    Plus, Search, LayoutGrid, List, Download, Package
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInventoryLogic } from './useInventoryLogic'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { clsx } from 'clsx'

// Modular Components
import { InventoryItemTable } from '@/components/studio/inventory/InventoryItemTable'
import { InventoryItemGrid } from '@/components/studio/inventory/InventoryItemGrid'
import { InventoryItemForm } from '@/components/studio/inventory/InventoryItemForm'
import { EmptyState } from '@/components/ui/EmptyState'

import { InventoryItem } from '@/types/agency'

interface InventoryClientProps {
    initialInventory: InventoryItem[]
    studioId: string
}

export default function InventoryClient({ initialInventory, studioId }: InventoryClientProps) {
    const {
        inventory,
        viewMode, setViewMode,
        isEditorOpen, openEditor, closeEditor,
        editingItem, isSaving,
        searchQuery, setSearchQuery,
        handleSave, handleDelete
    } = useInventoryLogic(initialInventory, studioId)

    const [isPending, startTransition] = useTransition()

    const handleViewModeChange = (mode: 'grid' | 'table') => {
        startTransition(() => {
            setViewMode(mode)
        })
    }

    return (
        <TooltipProvider>
            <div className="space-y-10">
                {/* Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-4 rounded-[2.5rem] border border-zinc-100 shadow-sm">
                    <div className="flex flex-1 items-center gap-6">
                        <div className="flex-1 max-w-md">
                            <Input 
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                icon={Search}
                                variant="atelier"
                            />
                        </div>
                        
                        <div className="flex bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100 shadow-inner">
                            <button 
                                onClick={() => handleViewModeChange('table')}
                                className={clsx(
                                    "p-3 rounded-xl transition-all duration-300",
                                    viewMode === 'table' ? "bg-white text-primary shadow-md" : "text-zinc-300 hover:text-zinc-500"
                                )}
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleViewModeChange('grid')}
                                className={clsx(
                                    "p-3 rounded-xl transition-all duration-300",
                                    viewMode === 'grid' ? "bg-white text-primary shadow-md" : "text-zinc-300 hover:text-zinc-500"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline"
                            className="px-8 h-14"
                        >
                            <Download className="w-4 h-4 mr-2.5 opacity-40" /> Export CSV
                        </Button>
                        <Button 
                            onClick={() => openEditor()}
                            className="px-10 h-14"
                        >
                            <Plus className="w-4 h-4 mr-2.5 stroke-[3]" /> Add Product
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <div className={clsx("min-h-[500px] transition-opacity duration-300", isPending && "opacity-50 pointer-events-none")}>
                    {inventory.length > 0 ? (
                        viewMode === 'table' ? (
                            <InventoryItemTable 
                                items={inventory} 
                                onEdit={openEditor}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <InventoryItemGrid 
                                items={inventory} 
                                onEdit={openEditor}
                                onDelete={handleDelete}
                            />
                        )
                    ) : (
                        <EmptyState 
                            title="Inventory is empty"
                            description="No products match your current search or the inventory is yet to be configured."
                            icon={Package}
                            action={
                                <Button 
                                    variant="outline"
                                    onClick={() => openEditor()}
                                    className="px-10 h-14"
                                >
                                    + Create First Product
                                </Button>
                            }
                        />
                    )}
                </div>

                {/* Modular Form Drawer */}
                <AnimatePresence>
                    {isEditorOpen && (
                        <InventoryItemForm 
                            isOpen={isEditorOpen}
                            isSaving={isSaving}
                            editingItem={editingItem}
                            onClose={closeEditor}
                            onSave={handleSave}
                        />
                    )}
                </AnimatePresence>
            </div>
        </TooltipProvider>
    )
}
