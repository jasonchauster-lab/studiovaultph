'use client'

import React, { useState } from 'react'
import { X, Calendar, Clock, User, Hash, CreditCard, Tag, ArrowUpRight, Receipt, ShieldCheck, Undo2, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { refundTransaction } from '@/app/(dashboard)/studio/sales/sales-actions'
import { useToast } from '@/components/ui/Toast'

interface TransactionDetailModalProps {
    isOpen: boolean
    onClose: () => void
    transaction: any
}

export default function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
    const { toast } = useToast()
    const [isRefunding, setIsRefunding] = useState(false)

    if (!isOpen || !transaction) return null

    const txDate = new Date(transaction.tx_date || transaction.date)
    const status = transaction.status || 'Paid'
    const isRefunded = transaction.type === 'Refund' || status === 'cancelled_refunded' || status === 'cancelled'
    const isPending = status === 'pending_payment' || status === 'pending'
    const amount = transaction.amount || transaction.total_amount || 0
    const reference = transaction.reference_id 
        ? `TX-${transaction.reference_id.slice(0, 8).toUpperCase()}` 
        : 'N/A';

    const canRefund = !isRefunded && (transaction.type === 'Booking' || transaction.type === 'Sale')

    const handleRefund = async () => {
        if (!window.confirm('Are you sure you want to refund this transaction? This will cancel the booking or plan and return funds to the customer.')) return
        
        setIsRefunding(true)
        const result = await refundTransaction({
            type: transaction.type,
            reference_id: transaction.reference_id
        })

        if (result.success) {
            toast('Transaction successfully refunded', 'success')
            onClose()
        } else {
            toast(result.error || 'Failed to process refund', 'error')
        }
        setIsRefunding(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                {/* Header */}
                <div className="px-10 py-8 border-b border-zinc-50 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-charcoal uppercase tracking-tight">Transaction Details</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                            {transaction.type} Record
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-2xl transition-all text-zinc-300 hover:text-charcoal">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Amount Highlight */}
                    <div className="bg-zinc-50 rounded-[2rem] p-8 flex flex-col items-center text-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Amount</span>
                        <h3 className="text-4xl font-black text-charcoal">₱{amount.toLocaleString()}</h3>
                        <div className={clsx(
                            "mt-4 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ring-1",
                            isRefunded ? "bg-zinc-100 text-zinc-400 ring-zinc-200" : 
                            isPending ? "bg-amber-50 text-amber-600 ring-amber-100" :
                            "bg-emerald-50 text-emerald-600 ring-emerald-100"
                        )}>
                            {isRefunded ? 'Refunded' : isPending ? 'Pending Payment' : 'Payment Completed'}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                                <Hash className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none mb-1">Reference Number</p>
                                <p className="text-sm font-bold text-charcoal font-mono">{reference}</p>
                                <p className="text-[8px] text-zinc-300 font-medium truncate max-w-[200px]">{transaction.reference_id}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none mb-1">Date & Time</p>
                                <p className="text-sm font-bold text-charcoal">
                                    {txDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-0.5">
                                    {txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none mb-1">Customer / Party</p>
                                <p className="text-sm font-bold text-charcoal">{transaction.client || 'System / Admin'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none mb-1">Description</p>
                                <p className="text-sm font-bold text-charcoal">{transaction.details || 'No description provided'}</p>
                            </div>
                        </div>

                        {transaction.origin && (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none mb-1">Channel / Method</p>
                                    <p className="text-sm font-bold text-charcoal uppercase tracking-tighter">{transaction.origin}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Security Badge */}
                    <div className="pt-4 flex items-center justify-center gap-2 opacity-30 grayscale pointer-events-none">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Verified Transaction Record</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-zinc-50 bg-zinc-50/30 flex flex-wrap gap-4">
                    {canRefund && (
                        <button 
                            disabled={isRefunding}
                            onClick={handleRefund}
                            className="flex-1 flex items-center justify-center gap-2 h-14 bg-rose-50 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isRefunding ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                                <><Undo2 className="w-4 h-4" /> Refund Payment</>
                            )}
                        </button>
                    )}
                    <button 
                        onClick={() => window.print()}
                        className="flex-1 flex items-center justify-center gap-2 h-14 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-charcoal hover:bg-zinc-50 transition-all active:scale-95"
                    >
                        <Receipt className="w-4 h-4" />
                        Print Receipt
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full h-14 bg-charcoal text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
