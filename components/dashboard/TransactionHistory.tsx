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
            <div className="border-b border-cream-200">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('income')}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'income'
                            ? 'border-charcoal-900 text-charcoal-900'
                            : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                            }`}
                    >
                        Income (Bookings/Adjustments)
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'payouts'
                            ? 'border-charcoal-900 text-charcoal-900'
                            : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                            }`}
                    >
                        Withdrawals (Payouts)
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                {activeTab === 'income' ? (
                    <table className="w-full text-left text-sm text-charcoal-600">
                        <thead className="bg-cream-50 text-charcoal-900 font-medium border-b border-cream-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Participant</th>
                                <th className="px-6 py-4">Transaction Details</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-600">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((tx, idx) => {
                                    const txDate = new Date(tx.date)
                                    const isPositive = tx.total_amount > 0
                                    const isNegative = tx.total_amount < 0
                                    const isRefunded = tx.type === 'Booking (Refunded)'
                                    const isPenalty = tx.type === 'Cancellation Penalty'
                                    const isTopUp = tx.type === 'Wallet Top-Up'

                                    return (
                                        <tr key={idx} className="transition-colors hover:bg-[rgba(180,195,178,0.04)] rounded-lg">
                                            <td className="px-6 py-4">
                                                {txDate.toLocaleDateString()}
                                                <span className="block text-[10px] text-charcoal-400">
                                                    {txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-charcoal-400" />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-charcoal-900">
                                                            {tx.client || tx.instructor || 'System'}
                                                        </span>
                                                        {(tx.client && tx.instructor) && (
                                                            <span className="text-[10px] text-charcoal-400">
                                                                with {tx.instructor}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-charcoal-900">{tx.type}</span>
                                                        {isRefunded && (
                                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                                                Refunded
                                                            </span>
                                                        )}
                                                        {tx.type === 'Booking (Late Cancel)' && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                                                Late Cancel
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-charcoal-500 italic max-w-xs truncate">
                                                        {tx.details}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={clsx(
                                                "px-6 py-4 text-right font-bold transition-colors whitespace-nowrap",
                                                isRefunded ? "text-charcoal-400" :
                                                    isPenalty ? "text-red-600" :
                                                        isPositive ? "text-green-600" :
                                                            isNegative ? "text-blue-600" : "text-charcoal-900"
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
                ) : (
                    <table className="w-full text-left text-sm text-charcoal-600">
                        <thead className="bg-cream-50 text-charcoal-900 font-medium border-b border-cream-200">
                            <tr>
                                <th className="px-6 py-4">Date Requested</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payoutTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-600">
                                        No payout requests found.
                                    </td>
                                </tr>
                            ) : (
                                payoutTransactions.map((tx, idx) => (
                                    <tr key={idx} className="transition-colors hover:bg-[rgba(180,195,178,0.04)]">
                                        <td className="px-6 py-4">
                                            {new Date(tx.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                <p className="font-medium text-charcoal-900">{tx.details}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`status-pill-frosted inline-flex items-center gap-1.5 ${tx.status === 'paid' ? 'bg-sage/10 text-sage' :
                                                    tx.status === 'pending' ? 'bg-gold/10 text-gold-deep' :
                                                        tx.status === 'rejected' ? 'bg-rose-gold/10 text-rose-gold-deep' :
                                                            'bg-gray-100 text-gray-500'
                                                }`}>
                                                {tx.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                                                {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                                                {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                {tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-charcoal-900 whitespace-nowrap">
                                            -₱{Math.abs(tx.total_amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
