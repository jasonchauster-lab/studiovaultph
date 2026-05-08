'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Settings2, Trash2, Edit2, Loader2, Search, Box, TrendingUp, Info, Clock } from 'lucide-react'
import { updateEquipmentInventory } from '@/app/(dashboard)/studio/management/actions'
import { clsx } from 'clsx'

interface EquipmentItem {
    name: string
    total: number
    rental_cap: number
    rental_price: number
    available_from?: string
    available_to?: string
    breakdown?: {
        outletId: string
        outletName: string
        total: number
        rental_price: number
        rental_cap: number
        available_from?: string
        available_to?: string
    }[]
}

interface EquipmentManagementViewProps {
    studioId: string
    outletId?: string
    initialInventory: Record<string, any>
    outlets?: any[]
}

const MODAL_MODE = {
    CORE: 'CORE'
} as const

type ModalMode = typeof MODAL_MODE[keyof typeof MODAL_MODE]

export default function EquipmentManagementView({ studioId, outletId, initialInventory, outlets = [] }: EquipmentManagementViewProps) {
    const [inventory, setInventory] = React.useState<Record<string, EquipmentItem>>({})

    // Synchronize state when the initialInventory prop changes (e.g. branch switch)
    React.useEffect(() => {
        const parsed = Object.keys(initialInventory).reduce((acc, key) => {
            const item = initialInventory[key]
            acc[key] = {
                name: key,
                total: item.total || 0,
                rental_cap: item.rental_cap || 0,
                rental_price: item.rental_price || 0,
                available_from: item.available_from,
                available_to: item.available_to,
                breakdown: item.breakdown || []
            }
            return acc
        }, {} as Record<string, EquipmentItem>)
        
        setInventory(parsed)
    }, [initialInventory])
    
    const [isSaving, setIsSaving] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [modalMode, setModalMode] = React.useState<ModalMode | null>(null)
    const [editingKey, setEditingKey] = React.useState<string | null>(null)
    const [selectedBranchId, setSelectedBranchId] = React.useState<string>('studio')
    
    // Default to the first outlet if available when in Total Overview
    React.useEffect(() => {
        if (!outletId && outlets.length > 0 && selectedBranchId === 'studio') {
            setSelectedBranchId(outlets[0].id)
        }
    }, [outlets, outletId])
    
    // Form state (Moved to local modal component for performance)

    const handleSaveInventory = async (newInventory: Record<string, EquipmentItem>, targetId?: string) => {
        setIsSaving(true)
        
        // Auto-Clamping: Ensure rental_cap <= total for all items
        Object.keys(newInventory).forEach(key => {
            const item = newInventory[key]
            if (item.rental_cap > item.total) {
                newInventory[key].rental_cap = item.total
            }
        })

        try {
            const result = await updateEquipmentInventory(studioId, newInventory, targetId !== undefined ? targetId : outletId)
            if (result.error) alert(result.error)
        } catch (err) {
            console.error('Error saving inventory:', err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddOrUpdate = async (finalData: EquipmentItem, targetBranch?: string) => {
        const key = finalData.name.toUpperCase().trim()
        
        const targetId = !outletId ? (targetBranch === 'studio' ? undefined : targetBranch) : outletId
        
        const newInventory = { ...inventory, [key]: { ...finalData, name: finalData.name.trim() } }
        
        if (editingKey && editingKey !== key) {
            delete newInventory[editingKey]
        }
        
        setInventory(newInventory)
        await handleSaveInventory(newInventory, targetId)
        setModalMode(null)
        setEditingKey(null)
    }

    const handleDelete = async (key: string) => {
        if (!confirm(`Are you sure you want to remove ${key}? All related slot inventory checks will reset for this equipment.`)) return
        
        const newInventory = { ...inventory }
        delete newInventory[key]
        setInventory(newInventory)
        await handleSaveInventory(newInventory)
    }

    const resetForm = () => {
        setEditingKey(null)
        setModalMode(null)
    }

    const openEdit = (key: string, mode: ModalMode) => {
        setEditingKey(key)
        setModalMode(mode)
    }

    const filteredKeys = Object.keys(inventory).filter(k => 
        k.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <Box className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tightest leading-tight">Equipment Inventory</h1>
                    </div>
                    <p className="text-zinc-500 font-medium tracking-tight max-w-xl">
                        Manage your studio's physical assets. Set caps and rental prices for the marketplace while ensuring your CMS never over-schedules a session.
                    </p>
                </div>
                <button 
                    onClick={() => { resetForm(); setModalMode(MODAL_MODE.CORE); }}
                    className="px-8 py-5 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#2D3282]/20 flex items-center gap-3 w-full lg:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    New Equipment Type
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 border border-zinc-100 rounded-[2rem] shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                        <Box className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Categories</p>
                        <p className="text-3xl font-black text-zinc-900 leading-none">{Object.keys(inventory).length}</p>
                    </div>
                </div>
                <div className="bg-white p-8 border border-zinc-100 rounded-[2rem] shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Units</p>
                        <p className="text-3xl font-black text-zinc-900 leading-none">
                            {Object.values(inventory).reduce((sum, item) => sum + item.total, 0)}
                        </p>
                    </div>
                </div>
                <div className="bg-zinc-900 p-8 rounded-[2rem] shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400">
                            <Settings2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Marketplace Sync</p>
                            <p className="text-xl font-black text-white leading-none">Active</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
                <input 
                    type="text"
                    placeholder="Search equipment by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-zinc-100 rounded-3xl text-[13px] font-medium focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-200 transition-all shadow-sm"
                />
            </div>

            {/* Equipment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredKeys.map((key) => {
                    const item = inventory[key]
                    const isListed = outletId ? (item.rental_cap > 0 && item.rental_price > 0) : (item.rental_cap > 0)

                    return (
                        <div key={key} className="group bg-white p-10 border border-zinc-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-zinc-200/40 transition-all duration-500 flex flex-col relative overflow-hidden">
                            {/* Listing Status Badge */}
                            <div className="absolute top-0 right-10">
                                <div className={clsx(
                                    "px-4 py-2 rounded-b-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-sm transition-all",
                                    isListed ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
                                )}>
                                    {isListed ? 'Online' : 'Private'}
                                </div>
                            </div>

                            <div className="flex items-start justify-between mb-8 pr-16">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">{item.name}</h3>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">ID: {key}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 mb-8">
                                <button 
                                    onClick={() => openEdit(key, MODAL_MODE.CORE)}
                                    className="bg-zinc-50 hover:bg-zinc-100 rounded-2xl p-5 border border-zinc-100/50 transition-all text-left group/btn"
                                >
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                                        Total Units
                                        <Edit2 className="w-2.4 h-2.4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                    </p>
                                    <p className="text-2xl font-black text-zinc-900">{item.total}</p>
                                </button>
                            </div>

                            {/* Branch Distribution Breakdown (Consolidated View) */}
                            {!outletId && item.breakdown && item.breakdown.length > 0 && (
                                <div className="mb-8 space-y-3">
                                    <p className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.2em] mb-4">Location Breakdown</p>
                                    <div className={clsx(
                                        "space-y-2 pr-2",
                                        item.breakdown.length > 4 && "max-h-40 overflow-y-auto"
                                    )}>
                                        {item.breakdown.map((b, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50/50 rounded-xl border border-zinc-100">
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-3 h-3 text-zinc-400" />
                                                    <span className="text-[10px] font-bold text-zinc-500">{b.outletName}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] font-black text-zinc-900">{b.total} <span className="text-[8px] text-zinc-400 font-bold uppercase">QTY</span></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto flex items-center gap-2">
                                <button 
                                    onClick={() => openEdit(key, MODAL_MODE.CORE)}
                                    className="flex-1 py-3 px-4 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-all text-zinc-900 text-[9px] font-black uppercase tracking-widest border border-zinc-100 flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Edit Core
                                </button>
                                <button 
                                    onClick={() => handleDelete(key)}
                                    className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )
                })}

                {filteredKeys.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 py-32 flex flex-col items-center justify-center bg-zinc-50/50 rounded-[3rem] border border-dashed border-zinc-200 text-center">
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl mb-8 border border-zinc-100">
                            <Box className="w-8 h-8 text-zinc-200" />
                        </div>
                        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">No equipment listed</h3>
                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-4 mb-10 leading-relaxed max-w-sm">
                            Add your first equipment type to start tracking inventory and enabling marketplace rewards.
                        </p>
                        <button 
                            onClick={() => { resetForm(); setModalMode(MODAL_MODE.CORE); }}
                            className="px-10 py-5 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#2D3282]/20"
                        >
                            Add Your First Category
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalMode && (
                <EquipmentEditModal 
                    mode={modalMode}
                    initialData={editingKey ? (inventory[editingKey] || { name: '', total: 1, rental_cap: 0, rental_price: 0 }) : { name: '', total: 1, rental_cap: 0, rental_price: 0 }}
                    isEditing={!!editingKey}
                    outlets={outlets}
                    isGlobalMode={!outletId}
                    isSaving={isSaving}
                    onClose={resetForm}
                    onSave={handleAddOrUpdate}
                    defaultBranchId={selectedBranchId}
                    currentOutletId={outletId}
                />
            )}
        </div>
    )
}

/**
 * Extracted Modal component to prevent full-page re-renders while typing.
 */
function EquipmentEditModal({ 
    mode, 
    initialData, 
    isEditing, 
    outlets, 
    isGlobalMode, 
    isSaving, 
    onClose, 
    onSave,
    defaultBranchId,
    currentOutletId
}: { 
    mode: ModalMode, 
    initialData: EquipmentItem, 
    isEditing: boolean, 
    outlets: any[], 
    isGlobalMode: boolean, 
    isSaving: boolean, 
    onClose: () => void, 
    onSave: (data: EquipmentItem, targetBranch?: string) => void,
    defaultBranchId: string,
    currentOutletId?: string
}) {
    const [formData, setFormData] = useState<EquipmentItem>(initialData)
    const [targetBranch, setTargetBranch] = useState(defaultBranchId)

    // Optimization: Local raw strings for number inputs so they can be erased without "0" fallback
    const [totalRaw, setTotalRaw] = useState((initialData?.total ?? 1).toString())
    const [capRaw, setCapRaw] = useState((initialData?.rental_cap ?? 0).toString())
    const [priceRaw, setPriceRaw] = useState((initialData?.rental_price ?? 0).toString())

    const handleTotalChange = (val: string) => {
        setTotalRaw(val)
        const n = parseInt(val) || 0
        setFormData(prev => ({ ...prev, total: n }))
    }

    const handleCapChange = (val: string) => {
        setCapRaw(val)
        const n = parseInt(val) || 0
        setFormData(prev => ({ ...prev, rental_cap: n }))
    }

    const handlePriceChange = (val: string) => {
        setPriceRaw(val)
        const n = parseInt(val) || 0
        setFormData(prev => ({ ...prev, rental_price: n }))
    }

    const handleBranchChange = (branchId: string) => {
        setTargetBranch(branchId)
    }

    const activeOutletId = isGlobalMode ? targetBranch : currentOutletId;
    const activeOutlet = outlets.find(o => o.id === activeOutletId);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-zinc-900/80 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-10 border-b border-zinc-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-zinc-900 tracking-tight leading-none">
                            {isEditing ? 'Update Inventory' : 'Register Equipment'}
                        </h2>
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-2 leading-none">
                            Physical Asset Configuration
                        </p>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-zinc-50 rounded-2xl transition-all">
                        <Plus className="w-6 h-6 rotate-45 text-zinc-400" />
                    </button>
                </div>
                
                <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Branch Selector (Visible in Core Global Mode) */}
                    {( isGlobalMode && !isEditing ) && outlets.length > 0 && (
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none block ml-2">
                                {'Assign to Location'}
                            </label>
                            <select 
                                value={targetBranch}
                                onChange={(e) => handleBranchChange(e.target.value)}
                                className="w-full px-8 py-5 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer appearance-none"
                            >
                                {outlets.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-zinc-400/60 px-2 leading-tight">
                                {'Select which branch this equipment belongs to. You can also assign it to the studio-wide pool.'}
                            </p>
                        </div>
                    )}

                    <>
                            {/* Name */}
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none block ml-2">Equipment Category Name</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Allegro 2 Reformer"
                                    defaultValue={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-8 py-5 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-zinc-300"
                                    readOnly={isEditing}
                                />
                                {isEditing && <p className="text-[9px] text-zinc-400 px-2 italic uppercase tracking-tighter">Category ID is locked to maintain slot integrity.</p>}
                                {!isEditing && <p className="text-[10px] text-zinc-400 px-2 italic">Common types: Reformer, Tower, Cadillac, Wunda Chair.</p>}
                            </div>

                            {/* Total Capacity */}
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none block ml-2">Total Units Owned</label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={totalRaw}
                                    onChange={(e) => handleTotalChange(e.target.value)}
                                    className="w-full px-8 py-5 bg-zinc-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all"
                                />
                                <p className="text-[10px] text-zinc-400/60 px-2 leading-tight">
                                    This affects your internal calendar capacity. Your marketplace rental cap cannot exceed this number.
                                </p>
                            </div>
                        </>

                    {/* No longer used: Marketplace configuration is handled in the Marketplace tab */}
                </div>

                <div className="p-10 bg-zinc-50/50 flex flex-col sm:flex-row items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="w-full sm:flex-1 py-5 bg-white text-zinc-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all border border-zinc-100"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            onSave(formData, targetBranch);
                        }}
                        disabled={isSaving || !formData.name}
                        className="w-full sm:flex-[2] py-5 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#2D3282]/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                        {isEditing ? 'Update Category' : 'Register Equipment'}
                    </button>
                </div>
            </div>
        </div>
    )
}
