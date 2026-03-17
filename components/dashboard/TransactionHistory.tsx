'use client'

import { useState } from 'react'
import { User, CheckCircle, Clock, XCircle } from 'lucide-react'
import clsx from 'clsx'

interface TransactionRecord {
    date: string;
    booking_date?: string;
    type: string;
    client?: string;
    instructor?: string;
    studio?: string;
    total_amount: number;
    details?: string;
    status?: string;
    session_date?: string;
    session_time?: string;
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
                            <thead className="bg-cream-50/50 text-charcoal/60 font-black uppercase tracking-[0.1em] text-[10px] border-b border-cream-200">
                                <tr>
                                    <th className="px-6 py-5">Date</th>
                                    <th className="px-6 py-5 font-black">Student / Instructor</th>
                                    <th className="px-6 py-5 font-black">Transaction Details</th>
                                    <th className="px-6 py-5 font-black">Schedule</th>
                                    <th className="px-6 py-5 text-right font-black">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100/50">
                                {incomeTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center">
                                                    <Clock className="w-6 h-6 text-charcoal/20" />
                                                </div>
                                                <p className="text-charcoal/40 font-serif italic text-lg">No transactions found for this period.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    incomeTransactions.map((tx, idx) => {
                                        const txDate = new Date(tx.date)
                                        const isPositive = tx.total_amount > 0
                                        const isNegative = tx.total_amount < 0
                                        const isRefunded = tx.type === 'Booking (Refunded)'
                                        const isPenalty = tx.type === 'Cancellation Penalty'
                                        
                                        // Dynamic color mapping for types
                                        const typeColors: Record<string, string> = {
                                            'Booking': 'bg-forest/5 text-forest',
                                            'Booking (Refunded)': 'bg-charcoal/5 text-charcoal/40',
                                            'Cancellation Comp.': 'bg-sage/10 text-sage',
                                            'Cancellation Penalty': 'bg-rose-gold/10 text-rose-gold-deep',
                                            'Direct Adjustment': 'bg-indigo-50 text-indigo-600',
                                            'Late Cancel': 'bg-orange-50 text-orange-600',
                                        }

                                        const typeClass = typeColors[tx.type] || 'bg-charcoal/5 text-charcoal/60'

                                        return (
                                            <tr key={idx} className="group transition-all hover:bg-cream-50/50">
                                                <td className="px-6 py-6 whitespace-nowrap">
                                                    <div className="font-bold text-charcoal group-hover:text-forest transition-colors">{txDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                    <div className="text-[10px] text-charcoal/40 uppercase font-black tracking-tighter mt-0.5">
                                                        {txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-cream-200 shadow-sm group-hover:border-forest/20 group-hover:scale-105 transition-all">
                                                                <User className="w-5 h-5 text-charcoal/30" />
                                                            </div>
                                                            {isPositive && (
                                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-sage border-2 border-white flex items-center justify-center">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-charcoal text-base">
                                                                {tx.client || tx.instructor || 'System'}
                                                            </span>
                                                            {(tx.client && tx.instructor) && (
                                                                <span className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest mt-0.5">
                                                                    Instructor: {tx.instructor}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider",
                                                                typeClass
                                                            )}>
                                                                {tx.type}
                                                            </span>
                                                        </div>
                                                        {tx.booking_date && (
                                                            <div className="text-[11px] font-black text-charcoal/60 leading-tight flex items-center gap-1.5 uppercase">
                                                                <Clock className="w-3 h-3 opacity-40" />
                                                                {new Date(tx.booking_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ {new Date(tx.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        )}
                                                        <div className="text-[11px] text-charcoal/40 font-bold uppercase tracking-tight leading-tight max-w-[200px] truncate">
                                                            {tx.details}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 font-black">
                                                    {tx.session_date ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-charcoal text-[11px] uppercase whitespace-nowrap tracking-wider">
                                                                {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                            <span className="text-[10px] text-charcoal/30 uppercase whitespace-nowrap mt-0.5">
                                                                {tx.session_time?.slice(0, 5)} {parseInt(tx.session_time?.split(':')[0] || '0') >= 12 ? 'PM' : 'AM'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-charcoal/20 uppercase font-black italic">--</span>
                                                    )}
                                                </td>
                                                <td className={clsx(
                                                    "px-6 py-6 text-right font-black text-lg transition-all whitespace-nowrap group-hover:scale-105",
                                                    isRefunded ? "text-charcoal/30" :
                                                        isPenalty ? "text-red-500" :
                                                            isPositive ? "text-sage" :
                                                                isNegative ? "text-blue-500" : "text-charcoal"
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
                        <div className="sm:hidden">
                            {incomeTransactions.length === 0 ? (
                                <div className="px-6 py-12 text-center text-charcoal-400 font-serif italic">
                                    No transactions found.
                                </div>
                            ) : (
                                Object.entries(
                                    incomeTransactions.reduce((groups, tx) => {
                                        const date = new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                        if (!groups[date]) groups[date] = []
                                        groups[date].push(tx)
                                        return groups
                                    }, {} as Record<string, TransactionRecord[]>)
                                ).map(([date, groupTx]) => {
                                    const parsedDate = new Date(date)
                                    const dayName = parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()
                                    
                                    return (
                                        <div key={date} className="relative">
                                            {/* Date Header */}
                                            <div className="sticky top-0 z-10 bg-cream-50/90 backdrop-blur-md px-4 py-3 border-y border-cream-100/50">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-black text-charcoal-900 uppercase tracking-[0.2em] whitespace-nowrap">
                                                        {dayName}
                                                    </span>
                                                    <div className="h-px flex-1 bg-cream-200/40" />
                                                </div>
                                            </div>

                                            <div className="divide-y divide-cream-100/30">
                                                {groupTx.map((tx, idx) => {
                                                    const txTime = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    const isPositive = tx.total_amount > 0
                                                    const isNegative = tx.total_amount < 0
                                                    const isPenalty = tx.type === 'Cancellation Penalty'
                                                    const isRefunded = tx.type === 'Booking (Refunded)'

                                                    const typeColors: Record<string, string> = {
                                                        'Booking': 'bg-forest/5 text-forest',
                                                        'Booking (Refunded)': 'bg-charcoal/5 text-charcoal/40',
                                                        'Cancellation Comp.': 'bg-sage/10 text-sage',
                                                        'Cancellation Penalty': 'bg-rose-gold/10 text-rose-gold-deep',
                                                        'Direct Adjustment': 'bg-indigo-50 text-indigo-600',
                                                        'Late Cancel': 'bg-orange-50 text-orange-600',
                                                    }
                                                    const typeClass = typeColors[tx.type] || 'bg-charcoal/5 text-charcoal/60'
                                                    const amountColor = isRefunded ? 'text-charcoal/30' :
                                                        isPenalty ? 'text-red-500' :
                                                        isPositive ? 'text-forest' :
                                                        isNegative ? 'text-blue-500' : 'text-charcoal'

                                                    return (
                                                        <div key={idx} className="px-4 py-4 flex items-start justify-between gap-4 bg-white hover:bg-cream-50/30 transition-colors duration-200">
                                                            {/* Details */}
                                                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={clsx(
                                                                        "inline-block text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider",
                                                                        typeClass
                                                                    )}>
                                                                        {tx.type}
                                                                    </span>
                                                                    <span className="text-[9px] text-charcoal/30 font-bold uppercase tracking-widest">
                                                                        {txTime}
                                                                    </span>
                                                                </div>
                                                                
                                                                {tx.details && (
                                                                    <p className="text-[11px] text-charcoal-800 font-bold uppercase tracking-tight leading-snug break-words">
                                                                        {tx.details}
                                                                    </p>
                                                                )}
                                                                
                                                                {tx.session_date && (
                                                                    <p className="text-[9px] text-charcoal/40 font-black uppercase tracking-wider flex items-center gap-1.5">
                                                                        <Clock className="w-2.5 h-2.5 opacity-60" />
                                                                        SLOT: {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' })} @ {tx.session_time?.slice(0, 5)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {/* Amount */}
                                                            <div className="shrink-0 text-right pt-0.5">
                                                                <span className={clsx('text-base font-serif font-bold tracking-tight', amountColor)}>
                                                                    {isRefunded ? '₱0' : (isPositive ? '+' : '') + `₱${tx.total_amount.toLocaleString()}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
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
                            <thead className="bg-cream-50/50 text-charcoal/60 font-black uppercase tracking-[0.1em] text-[10px] border-b border-cream-200">
                                <tr>
                                    <th className="px-6 py-5">Date Requested</th>
                                    <th className="px-6 py-5">Details</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right font-black">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100/50">
                                {payoutTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center">
                                                    <Clock className="w-6 h-6 text-charcoal/20" />
                                                </div>
                                                <p className="text-charcoal/40 font-serif italic text-lg">No payout requests found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    payoutTransactions.map((tx, idx) => (
                                        <tr key={idx} className="group transition-all hover:bg-cream-50/50">
                                            <td className="px-6 py-6 font-bold text-charcoal group-hover:text-forest transition-colors">
                                                {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-6">
                                                <p className="text-[11px] font-black text-charcoal/60 uppercase tracking-tight leading-tight">
                                                    {tx.details}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6 font-black">
                                                <span className={`px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${tx.status === 'paid' ? 'bg-sage/10 text-sage' :
                                                        tx.status === 'pending' ? 'bg-gold/10 text-gold-deep' :
                                                            tx.status === 'rejected' ? 'bg-rose-gold/10 text-rose-gold-deep' :
                                                                'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {tx.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                                                    {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                                                    {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                    <span className="uppercase tracking-widest text-[9px]">
                                                        {tx.status || 'Unknown'}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-right font-black text-charcoal text-lg group-hover:scale-105 transition-all">
                                                -₱{Math.abs(tx.total_amount).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Stacked Payouts View */}
                        <div className="sm:hidden">
                            {payoutTransactions.length === 0 ? (
                                <div className="px-6 py-12 text-center text-charcoal-400 font-serif italic">
                                    No payout requests found.
                                </div>
                            ) : (
                                Object.entries(
                                    payoutTransactions.reduce((groups, tx) => {
                                        const date = new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                        if (!groups[date]) groups[date] = []
                                        groups[date].push(tx)
                                        return groups
                                    }, {} as Record<string, TransactionRecord[]>)
                                ).map(([date, groupTx]) => {
                                    const parsedDate = new Date(date)
                                    const dayName = parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()

                                    return (
                                        <div key={date} className="relative">
                                            {/* Date Header */}
                                            <div className="sticky top-0 z-10 bg-cream-50/90 backdrop-blur-md px-4 py-3 border-y border-cream-100/50">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-black text-charcoal-900 uppercase tracking-[0.2em] whitespace-nowrap">
                                                        {dayName}
                                                    </span>
                                                    <div className="h-px flex-1 bg-cream-200/40" />
                                                </div>
                                            </div>

                                            <div className="divide-y divide-cream-100/30">
                                                {groupTx.map((tx, idx) => {
                                                    const txDate = new Date(tx.date)
                                                    return (
                                                        <div key={idx} className="px-4 py-4 flex items-start justify-between gap-4 bg-white hover:bg-cream-50/30 transition-colors duration-200">
                                                            {/* Middle */}
                                                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="inline-block text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-charcoal/5 text-charcoal/60">
                                                                        Withdrawal
                                                                    </span>
                                                                    <span className="text-[9px] text-charcoal/30 font-bold uppercase tracking-widest">
                                                                        Requested
                                                                    </span>
                                                                </div>
                                                                {tx.details && (
                                                                    <p className="text-[11px] text-charcoal-800 font-bold uppercase tracking-tight leading-snug break-words">
                                                                        {tx.details}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {/* Right: amount + status */}
                                                            <div className="shrink-0 text-right pt-0.5">
                                                                <span className="text-base font-serif font-bold text-charcoal tracking-tight">
                                                                    -₱{Math.abs(tx.total_amount).toLocaleString()}
                                                                </span>
                                                                <span className={clsx(
                                                                    "flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wider mt-1.5",
                                                                    tx.status === 'paid' ? 'text-sage' :
                                                                        tx.status === 'pending' ? 'text-gold-deep' :
                                                                            'text-rose-gold-deep'
                                                                )}>
                                                                    {tx.status === 'paid' && <CheckCircle className="w-2.5 h-2.5" />}
                                                                    {tx.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                                                                    {tx.status === 'rejected' && <XCircle className="w-2.5 h-2.5" />}
                                                                    {tx.status || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
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
