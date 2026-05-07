'use client'

import React, { useState, useEffect } from 'react'
import { getStudioBillingHistory } from '@/app/(dashboard)/admin/actions'
import { X, Receipt, Clock, CheckCircle, XCircle, Loader2, Calendar, CreditCard } from 'lucide-react'
import { formatManilaDateStr } from '@/lib/timezone'

interface BillingHistoryModalProps {
    studioId: string
    studioName: string
    onClose: () => void
}

export default function BillingHistoryModal({ studioId, studioName, onClose }: BillingHistoryModalProps) {
    const [transactions, setTransactions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchHistory() {
            const result = await getStudioBillingHistory(studioId)
            if (result.data) {
                setTransactions(result.data)
            }
            setIsLoading(false)
        }
        fetchHistory()
    }, [studioId])

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-burgundy/20 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-burgundy text-white rounded-2xl flex items-center justify-center shadow-lg shadow-burgundy/20">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-burgundy uppercase tracking-wider">{studioName}</h3>
                            <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-[0.2em]">Billing Ledger & History</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-burgundy/30" />
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-burgundy animate-spin" />
                            <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-widest">Fetching Ledger...</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto">
                                <Clock className="w-8 h-8 text-stone-200" />
                            </div>
                            <div>
                                <p className="text-burgundy font-bold">No transactions found.</p>
                                <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-widest mt-1">This studio is likely on a free trial.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map((t: any) => (
                                <div key={t.id} className="p-5 border border-stone-100 rounded-2xl hover:bg-stone-50 transition-all group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                t.status === 'completed' ? 'bg-forest/10 text-forest' : 
                                                t.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                {t.type === 'top_up' ? <CreditCard className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-black text-burgundy text-sm">₱{t.amount.toLocaleString()}</p>
                                                <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-widest">{t.type.replace('_', ' ')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-1.5 mb-1">
                                                {t.status === 'completed' ? (
                                                    <CheckCircle className="w-3 h-3 text-forest" />
                                                ) : t.status === 'pending' ? (
                                                    <Clock className="w-3 h-3 text-amber-500" />
                                                ) : (
                                                    <XCircle className="w-3 h-3 text-red-500" />
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    t.status === 'completed' ? 'text-forest' : 
                                                    t.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-burgundy/30 uppercase tracking-widest">
                                                <Calendar className="w-3 h-3" />
                                                {formatManilaDateStr(t.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                    {t.admin_notes && (
                                        <div className="mt-4 pt-4 border-t border-stone-100">
                                            <p className="text-[10px] text-burgundy/60 italic font-medium">"{t.admin_notes}"</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-8 bg-stone-50 border-t border-stone-100">
                    <p className="text-[9px] text-burgundy/30 font-bold uppercase tracking-[0.2em] leading-relaxed">
                        This ledger tracks manual plan payments, wallet top-ups, and adjustments. 
                        Automatic Stripe/Card payments are logged separately in the financial gateway.
                    </p>
                </div>
            </div>
        </div>
    )
}
