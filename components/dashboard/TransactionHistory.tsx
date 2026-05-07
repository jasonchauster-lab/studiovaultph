'use client'

import { User, ChevronRight, ShoppingBag } from 'lucide-react'
import clsx from 'clsx'
import React from 'react'
import TransactionDetailModal from '@/components/studio/TransactionDetailModal'

interface TransactionRecord {
    date: string;
    tx_date?: string; // Some data might come with tx_date from RPC
    type: string;
    client?: string;
    instructor?: string;
    studio?: string;
    amount: number; // RPC returns amount
    total_amount?: number; // legacy fallback
    details?: string;
    status?: string;
    session_date?: string;
    session_time?: string;
    origin?: string;
    payment_method?: string;
    reference_id?: string; // New field from updated RPC
}

interface TransactionHistoryProps {
    transactions: TransactionRecord[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
    const [selectedTx, setSelectedTx] = React.useState<TransactionRecord | null>(null)
    const incomeTransactions = transactions.filter(t => t.type !== 'Payout');

    return (
        <div className="w-full overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Customer</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Reference #</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Price</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Paid amount</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Balance</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Method</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {incomeTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                                            <ShoppingBag className="w-8 h-8 text-zinc-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">No sales transaction yet</h3>
                                            <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Recorded sales will appear here</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            incomeTransactions.map((tx, idx) => {
                                const txDate = new Date(tx.tx_date || tx.date)
                                const status = tx.status || 'Paid'
                                const isRefunded = tx.type === 'Refund'
                                const isPending = status === 'pending_payment' || status === 'pending'
                                
                                // Real reference logic: Use reference_id from RPC, or fallback to hash if somehow missing
                                const reference = tx.reference_id 
                                    ? `TX-${tx.reference_id.slice(0, 8).toUpperCase()}` 
                                    : `TX-${1000 + idx}`;

                                const amount = tx.amount || tx.total_amount || 0
                                const paidAmount = (isRefunded || isPending) ? 0 : amount
                                const balance = isPending ? amount : 0

                                // Format payment method with origin awareness
                                const isMarketplace = tx.origin === 'marketplace'
                                const methodLabel = isMarketplace ? 'Marketplace' : 'Private Site'

                                return (
                                    <tr key={idx} className="group hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-zinc-900 tracking-tight">{txDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">{txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden">
                                                    <User className="w-4 h-4 text-zinc-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-900 tracking-tight">{tx.client || 'System'}</span>
                                                    <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">{tx.type}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-zinc-400 tracking-tight font-mono" title={tx.reference_id}>{reference}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-zinc-900 tracking-tight">₱{amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "text-xs font-black tracking-tight",
                                                paidAmount > 0 ? "text-emerald-600" : "text-zinc-400"
                                            )}>₱{paidAmount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "text-xs font-bold tracking-tight",
                                                balance > 0 ? "text-rose-500" : "text-zinc-300"
                                            )}>₱{balance.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{methodLabel}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest leading-none block w-fit",
                                                isRefunded ? "bg-zinc-100 text-zinc-400" : 
                                                isPending ? "bg-amber-50 text-amber-600" :
                                                "bg-[#1DB954] text-white"
                                            )}>
                                                {isRefunded ? 'Refunded' : isPending ? 'Pending' : 'Paid'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedTx(tx)}
                                                className="p-2 text-zinc-300 hover:text-zinc-600 transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <TransactionDetailModal 
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                transaction={selectedTx}
            />
            
            <div className="md:hidden p-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Comprehensive Sale Records are best viewed on Desktop
            </div>
        </div>
    )
}
