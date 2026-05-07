'use client'

import React, { useEffect, useState } from 'react'
import { X, History, User, Calendar, Tag, DollarSign, Loader2 } from 'lucide-react'
import { getPromoUsageHistory } from '@/app/(dashboard)/studio/promo/actions'
import { clsx } from 'clsx'

interface PromoUsageModalProps {
    isOpen: boolean
    onClose: () => void
    promo: any
}

export default function PromoUsageModal({ isOpen, onClose, promo }: PromoUsageModalProps) {
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState<any[]>([])

    useEffect(() => {
        if (isOpen && promo?.id) {
            setLoading(true)
            getPromoUsageHistory(promo.id)
                .then(setHistory)
                .catch(err => console.error('Failed to fetch history:', err))
                .finally(() => setLoading(false))
        }
    }, [isOpen, promo?.id])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-zinc-100 flex items-center justify-center text-[#2D3282]">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-zinc-900 leading-tight">Usage History</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Promo Code: {promo?.code}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Loading history...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-300">
                            <History className="w-12 h-12 opacity-20" />
                            <p className="text-sm font-medium italic">No usage history found for this code yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((item) => (
                                <div key={item.id} className="group p-6 bg-zinc-50 rounded-[24px] border border-transparent hover:border-zinc-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-zinc-400 group-hover:text-[#2D3282] transition-colors">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-zinc-900">{item.customer.name}</span>
                                                <span className="text-[10px] font-medium text-zinc-400">{item.customer.email}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-zinc-900">₱{item.amount}</div>
                                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Paid</div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-zinc-500">
                                            <Tag className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.item}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-500 justify-end">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                                {new Date(item.date).toLocaleDateString(undefined, { 
                                                    month: 'short', 
                                                    day: 'numeric', 
                                                    year: 'numeric' 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
