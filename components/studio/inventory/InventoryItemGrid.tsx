'use client'

import React from 'react'
import { Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'
import { Tooltip } from '@/components/ui/Tooltip'

interface InventoryGridProps {
    items: any[]
    onEdit: (item: any) => void
    onDelete: (id: string) => void
}

export const InventoryItemGrid = React.memo(({ items, onEdit, onDelete }: InventoryGridProps) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout" initial={false}>
                {items.map((item, index) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
                        className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 space-y-6 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group relative overflow-hidden"
                    >
                        <div className="aspect-square bg-zinc-50 rounded-[2rem] flex items-center justify-center overflow-hidden border border-zinc-100 group-hover:bg-white transition-colors duration-500 relative">
                            {item.photo_url ? (
                                <Image 
                                    loader={supabaseLoader}
                                    src={item.photo_url} 
                                    alt={item.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            ) : (
                                <Package className="w-12 h-12 text-zinc-100 group-hover:text-indigo-100 transition-colors" />
                            )}
                            
                                {item.stock_level <= (item.low_stock_threshold || 5) && (
                                    <div className="absolute top-4 right-4 bg-rose-500 text-white px-3 py-1.5 rounded-xl shadow-lg animate-pulse flex items-center gap-1.5 z-10">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Low Stock</span>
                                    </div>
                                )}
                                {item.stock_level === 0 && (
                                    <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                                        <span className="px-6 py-2 bg-rose-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">Out of Stock</span>
                                    </div>
                                )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="px-3 py-1 bg-zinc-50 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-indigo-600 transition-colors">
                                    {item.category || 'General'}
                                </span>
                                <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">SKU: {item.sku || 'N/A'}</span>
                            </div>
                            <h3 className="text-lg font-black text-zinc-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{item.name}</h3>
                            <p className="text-xl font-black text-indigo-600 tracking-tighter">₱{item.price.toLocaleString()}</p>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Available</span>
                                <span className={clsx(
                                    "text-sm font-black tracking-tight",
                                    item.stock_level <= (item.low_stock_threshold || 5) ? "text-rose-500" : "text-zinc-900"
                                )}>
                                    {item.stock_level} {item.stock_level === 1 ? 'Unit' : 'Units'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tooltip content="Edit Product">
                                    <button 
                                        onClick={() => onEdit(item)}
                                        className="p-3 bg-zinc-50 text-zinc-300 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Delete Product">
                                    <button 
                                        onClick={() => onDelete(item.id)}
                                        className="p-3 bg-rose-50 text-rose-300 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
})
