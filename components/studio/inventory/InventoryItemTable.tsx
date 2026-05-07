'use client'

import React from 'react'
import { Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'

interface InventoryTableProps {
    items: any[]
    onEdit: (item: any) => void
    onDelete: (id: string) => void
}

export const InventoryItemTable = React.memo(({ items, onEdit, onDelete }: InventoryTableProps) => {
    return (
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/50 border-b border-zinc-100">
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Item Details</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">SKU</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Category</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Stock</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Price</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {items.map((item, index) => (
                                <motion.tr 
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
                                    className="hover:bg-zinc-50/30 transition-all group"
                                >
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-200 overflow-hidden border border-zinc-100 group-hover:scale-105 transition-transform duration-500 relative">
                                                {item.photo_url ? (
                                                    <Image 
                                                        loader={supabaseLoader}
                                                        src={item.photo_url} 
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="56px"
                                                    />
                                                ) : (
                                                    <Package className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-zinc-900 tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</span>
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-[200px]">{item.description || 'No description provided'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-xs font-black text-zinc-400 tracking-widest uppercase">{item.sku || '---'}</td>
                                    <td className="px-10 py-6">
                                        <span className="px-4 py-1.5 bg-zinc-50 rounded-xl border border-zinc-100 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                            {item.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={clsx(
                                                "text-sm font-black",
                                                item.stock_level <= (item.low_stock_threshold || 5) ? "text-rose-500" : "text-zinc-900"
                                            )}>
                                                {item.stock_level}
                                            </span>
                                            {item.stock_level <= (item.low_stock_threshold || 5) && (
                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 rounded-full">
                                                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                                                    <span className="text-[8px] font-black uppercase tracking-tighter text-rose-500">Low Stock</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-sm font-black text-zinc-900 text-right">₱{item.price.toLocaleString()}</td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button 
                                                        onClick={() => onEdit(item)}
                                                        className="p-3 bg-zinc-50 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-zinc-100"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit Product</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button 
                                                        onClick={() => onDelete(item.id)}
                                                        className="p-3 bg-zinc-50 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-zinc-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete Product</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    )
})
