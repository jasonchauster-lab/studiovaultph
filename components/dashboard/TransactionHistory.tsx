'use client'

import { useState } from 'react'
import { User, CheckCircle, Clock, XCircle } from 'lucide-react'
import clsx from 'clsx'

interface TransactionRecord {
    date: string;
    type: string;
    client?: string;
    instructor?: string;
    studio?: string;
    total_amount: number;
    details?: string;
    status?: string;
}

interface TransactionHistoryProps {
    transactions: TransactionRecord[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
    const [activeTab, setActiveTab] = useState<'income' | 'payouts'>('income')

    const incomeTransactions = transactions.filter(t => t.type !== 'Payout');
    const payoutTransactions = transactions.filter(t => t.type === 'Payout');

    const currentData = activeTab === 'income' ? incomeTransactions : payoutTransactions;

    return (
        <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'income'
                            ? 'border-charcoal text-charcoal bg-off-white/30'
                            : 'border-transparent text-charcoal/40 hover:text-charcoal active:scale-95'
                            }`}
                    >
                        Income & Adjustments
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'payouts'
                            ? 'border-charcoal text-charcoal bg-off-white/30'
                            : 'border-transparent text-charcoal/40 hover:text-charcoal active:scale-95'
                            }`}
                    >
                        Withdrawals
                    </button>
                </div>

            <div className="overflow-x-auto">
                {activeTab === 'income' ? (
                    <div className="w-full">
                        {/* Desktop Table */}
                        <table className="hidden sm:table w-full text-left text-sm text-charcoal-600">
                            <thead className="bg-cream-50 text-charcoal font-bold uppercase tracking-widest text-[10px] border-b border-cream-200">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Participant</th>
                                    <th className="px-6 py-4">Transaction Details</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100">
                                {incomeTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-charcoal/40 font-serif italic text-lg">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    incomeTransactions.map((tx, idx) => {
                                        const txDate = new Date(tx.date)
                                        const isPositive = tx.total_amount > 0
                                        const isNegative = tx.total_amount < 0
                                        const isRefunded = tx.type === 'Booking (Refunded)'
                                        const isPenalty = tx.type === 'Cancellation Penalty'

                                        return (
                                            <tr key={idx} className="transition-colors hover:bg-off-white/40">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="font-bold text-charcoal">{txDate.toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-charcoal/40 uppercase font-black">
                                                        {txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center border border-cream-200">
                                                            <User className="w-4 h-4 text-charcoal/30" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-charcoal">
                                                                {tx.client || tx.instructor || 'System'}
                                                            </span>
                                                            {(tx.client && tx.instructor) && (
                                                                <span className="text-[10px] font-bold text-charcoal/40 uppercase">
                                                                    with {tx.instructor}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-charcoal text-xs uppercase tracking-wider">{tx.type}</span>
                                                            {isRefunded && (
                                                                <span className="text-[9px] bg-charcoal/5 text-charcoal/40 px-2 py-0.5 rounded-full font-black uppercase">
                                                                    Refunded
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-charcoal/50 italic leading-tight">
                                                            {tx.details}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={clsx(
                                                    "px-6 py-5 text-right font-black transition-colors whitespace-nowrap",
                                                    isRefunded ? "text-charcoal/40" :
                                                        isPenalty ? "text-red-600" :
                                                            isPositive ? "text-green-600" :
                                                                isNegative ? "text-blue-600" : "text-charcoal"
                                                )}>
                                                    {isRefunded ? "₱0" :
                                                        (isPositive ? '+' : '') + `₱${tx.total_amount.toLocaleString()}`}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Stacked View */}
                        <div className="sm:hidden divide-y divide-cream-100">
                            {incomeTransactions.length === 0 ? (
                                <div className="px-6 py-12 text-center text-charcoal/40 font-serif italic">
                                    No transactions found.
                                </div>
                            ) : (
                                incomeTransactions.map((tx, idx) => {
                                    const txDate = new Date(tx.date)
                                    const isPositive = tx.total_amount > 0
                                    const isPenalty = tx.type === 'Cancellation Penalty'
                                    const isRefunded = tx.type === 'Booking (Refunded)'

                                    return (
                                        <div key={idx} className="p-4 space-y-3">
                                            {/* Mobile Header Row: Date & Status */}
                                            <div className="flex justify-between items-center bg-cream-50/50 -mx-4 -mt-4 px-4 py-2 border-b border-cream-100">
                                                <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">
                                                    {txDate.toLocaleDateString()} • {txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className={clsx(
                                                    "text-[10px] font-black uppercase tracking-widest",
                                                    isRefunded ? "text-charcoal/40" :
                                                        isPenalty ? "text-red-600" :
                                                            isPositive ? "text-green-600" : "text-charcoal"
                                                )}>
                                                    {isRefunded ? "₱0" : (isPositive ? '+' : '') + `₱${tx.total_amount.toLocaleString()}`}
                                                </span>
                                            </div>

                                            {/* Mobile Body: Participant & Details Side-by-Side */}
                                            <div className="flex gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black text-charcoal/30 uppercase tracking-[0.2em] mb-1">Participant</p>
                                                    <p className="text-xs font-bold text-charcoal truncate">{tx.client || tx.instructor || 'System'}</p>
                                                </div>
                                                <div className="flex-[1.5] min-w-0">
                                                    <p className="text-[9px] font-black text-charcoal/30 uppercase tracking-[0.2em] mb-1">Activity</p>
                                                    <p className="text-xs font-bold text-charcoal truncate">{tx.type}</p>
                                                </div>
                                            </div>
                                            {tx.details && (
                                                <p className="text-[10px] text-charcoal/50 italic leading-tight truncate">{tx.details}</p>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full">
                        {/* Desktop Payouts Table */}
                        <table className="hidden sm:table w-full text-left text-sm text-charcoal-600">
                            <thead className="bg-cream-50 text-charcoal font-bold uppercase tracking-widest text-[10px] border-b border-cream-200">
                                <tr>
                                    <th className="px-6 py-4">Date Requested</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100">
                                {payoutTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-charcoal/40 font-serif italic text-lg">
                                            No payout requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    payoutTransactions.map((tx, idx) => (
                                        <tr key={idx} className="transition-colors hover:bg-off-white/40">
                                            <td className="px-6 py-5 font-bold text-charcoal">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-xs font-medium text-charcoal/60 leading-tight">
                                                    {tx.details}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`status-pill-frosted inline-flex items-center gap-1.5 ${tx.status === 'paid' ? 'bg-sage/10 text-sage' :
                                                        tx.status === 'pending' ? 'bg-gold/10 text-gold-deep' :
                                                            tx.status === 'rejected' ? 'bg-rose-gold/10 text-rose-gold-deep' :
                                                                'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {tx.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                                                    {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                                                    {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                    <span className="font-black uppercase tracking-widest text-[9px]">
                                                        {tx.status || 'Unknown'}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-charcoal">
                                                -₱{Math.abs(tx.total_amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Stacked Payouts View */}
                        <div className="sm:hidden divide-y divide-cream-100">
                            {payoutTransactions.length === 0 ? (
                                <div className="px-6 py-12 text-center text-charcoal/40 font-serif italic">
                                    No payout requests found.
                                </div>
                            ) : (
                                payoutTransactions.map((tx, idx) => {
                                    const txDate = new Date(tx.date)
                                    return (
                                        <div key={idx} className="p-4 space-y-3">
                                            <div className="flex justify-between items-center bg-cream-50/50 -mx-4 -mt-4 px-4 py-2 border-b border-cream-100">
                                                <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">
                                                    Requested: {txDate.toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] font-black text-charcoal uppercase tracking-widest">
                                                    -₱{Math.abs(tx.total_amount).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black text-charcoal/30 uppercase tracking-[0.2em] mb-1">Details</p>
                                                    <p className="text-xs font-bold text-charcoal leading-tight">{tx.details}</p>
                                                </div>
                                                <div className="shrink-0">
                                                    <p className="text-[9px] font-black text-charcoal/30 uppercase tracking-[0.2em] mb-1 text-right">Status</p>
                                                    <span className={clsx(
                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                                        tx.status === 'paid' ? 'bg-sage/10 text-sage' :
                                                            tx.status === 'pending' ? 'bg-gold/10 text-gold-deep' :
                                                                'bg-rose-gold/10 text-rose-gold-deep'
                                                    )}>
                                                        {tx.status || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
