'use client'

import React from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface InventoryItemFormProps {
    isOpen: boolean
    isSaving: boolean
    editingItem: any | null
    onClose: () => void
    onSave: (e: React.FormEvent<HTMLFormElement>) => void
}

export function InventoryItemForm({ isOpen, isSaving, editingItem, onClose, onSave }: InventoryItemFormProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[99999] flex justify-end">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" 
                onClick={onClose} 
            />
            
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-12 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="w-10 h-1 bg-indigo-600 rounded-full" />
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tightest">
                                {editingItem ? 'Edit Product' : 'New Inventory'}
                            </h2>
                        </div>
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] ml-13">Configure stock & retail details.</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-zinc-100 text-zinc-300 hover:text-zinc-900 hover:border-zinc-300 hover:rotate-90 transition-all duration-300 shadow-sm"
                    >
                        <Plus className="w-8 h-8 rotate-45" />
                    </button>
                </div>
                
                {/* Scrollable Form Body */}
                <form id="inventory-form" onSubmit={onSave} className="flex-1 overflow-y-auto p-12 space-y-12">
                    <div className="space-y-10">
                        {/* Primary Info */}
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-3 col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Product Name</label>
                                <input 
                                    name="name" 
                                    defaultValue={editingItem?.name} 
                                    required 
                                    placeholder="e.g. Premium Yoga Mat"
                                    className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all placeholder:text-zinc-300"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">SKU / ID</label>
                                <input 
                                    name="sku" 
                                    defaultValue={editingItem?.sku} 
                                    placeholder="INV-001"
                                    className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Category</label>
                                <input 
                                    name="category" 
                                    defaultValue={editingItem?.category} 
                                    placeholder="Apparel, Gear..."
                                    className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Pricing & Stock */}
                        <div className="p-10 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 space-y-8">
                            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-4 h-[2px] bg-indigo-600 rounded-full" />
                                Retail & Inventory
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Price (₱)</label>
                                    <input 
                                        name="price" 
                                        type="number" 
                                        step="0.01"
                                        defaultValue={editingItem?.price} 
                                        required 
                                        className="w-full px-8 py-5 bg-white border border-zinc-100 rounded-3xl text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Stock Level</label>
                                    <input 
                                        name="stock_level" 
                                        type="number" 
                                        defaultValue={editingItem?.stock_level} 
                                        required 
                                        className="w-full px-8 py-5 bg-white border border-zinc-100 rounded-3xl text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
                                    />
                                </div>
                                <div className="space-y-3 col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Low Stock Alert Threshold</label>
                                    <input 
                                        name="low_stock_threshold" 
                                        type="number" 
                                        defaultValue={editingItem?.low_stock_threshold || 5} 
                                        className="w-full px-8 py-5 bg-white border border-zinc-100 rounded-3xl text-sm font-black text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Description</label>
                            <textarea 
                                name="description" 
                                defaultValue={editingItem?.description} 
                                rows={4}
                                placeholder="Details about this product..."
                                className="w-full px-8 py-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] text-sm font-medium text-zinc-900 outline-none focus:ring-4 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all resize-none placeholder:text-zinc-300"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="p-12 border-t border-zinc-100 flex gap-6 bg-zinc-50/30">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="flex-1 py-5 bg-white border border-zinc-100 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 rounded-3xl hover:bg-zinc-50 hover:text-zinc-600 transition-all active:scale-95 shadow-sm"
                    >
                        Discard
                    </button>
                    <button 
                        form="inventory-form"
                        type="submit"
                        disabled={isSaving}
                        className="flex-[2] py-5 bg-zinc-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-zinc-900/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 stroke-[3]" />
                                {editingItem ? 'Update Product' : 'Add to Inventory'}
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
