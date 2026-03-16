'use client'

import { Wallet, ArrowUpRight, History, Clock, Info, X, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CustomerWalletClientProps {
    data: {
        available: number;
        pending: number;
        transactions: any[];
        error: any;
    } | null;
}

export default function CustomerWalletClient({ data }: CustomerWalletClientProps) {
    const [showInfoModal, setShowInfoModal] = useState(false)
    const router = useRouter()


    if (!data) return <div className="p-8">Loading wallet...</div>
    const { available, pending, transactions, error } = data

    if (error) {
        return (
            <div className="p-8 text-red-600">
                Failed to load wallet data. Please try again later.
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                            <h3 className="font-serif text-lg text-charcoal-900">Wallet & Recovery Rules</h3>
                            <button onClick={() => setShowInfoModal(false)} className="text-charcoal-400 hover:text-charcoal-900 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-rose-gold font-bold text-sm uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4" />
                                    Negative Balances
                                </div>
                                <p className="text-sm text-charcoal-600 leading-relaxed">
                                    If penalty deductions cause your wallet to drop below ₱0.00, your account will carry a negative balance. While negative, your "Request Payout" feature is disabled and new bookings are restricted.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-charcoal-900 font-bold text-sm uppercase tracking-wider">
                                    <ShieldCheck className="w-4 h-4" />
                                    Auto-Recovery
                                </div>
                                <p className="text-sm text-charcoal-600 leading-relaxed">
                                    Any future earnings or refunds will be automatically applied to the negative balance until the debt is cleared. You can also contact Admin to settle manually via GCash/Bank Transfer.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-cream-50 border-t border-cream-200">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="w-full py-2 bg-forest text-white rounded-lg font-bold hover:brightness-110 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Wallet</h1>
                    <p className="text-charcoal-600">Manage your balance for seamless bookings.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/customer/payout"
                        className="bg-forest text-white px-6 py-3 rounded-lg font-medium hover:brightness-110 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Withdraw Funds
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-4xl">
                {/* Available Balance */}
                <div className="bg-forest text-white p-4 sm:p-6 rounded-xl shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
                    <div className="absolute -right-4 -top-4 text-white/5">
                        <Wallet className="w-24 h-24 sm:w-32 sm:h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 opacity-80">
                                <Wallet className="w-4 h-4" />
                                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase truncate">Balance</span>
                            </div>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="text-rose-gold hover:text-white transition-colors p-1"
                                title="Wallet Rules"
                            >
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-2xl sm:text-4xl font-serif mt-2">₱{(available || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Pending Balance */}
                <div className={`p-4 sm:p-6 rounded-xl border border-cream-200 shadow-sm border-l-4 h-full flex flex-col justify-between bg-white ${pending > 0 ? 'border-l-amber-400' : 'border-l-sage'}`}>
                    <div className="flex items-center gap-2 mb-2 text-charcoal-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase truncate">Pending</span>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-4xl font-serif text-charcoal-900 mt-2">₱{(pending || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Quick Info - Full width on small screens */}
                <div className="col-span-2 bg-white p-4 sm:p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-charcoal-500">
                        <History className="w-4 h-4" />
                        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Wallet Rules</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
                        <p className="text-[11px] sm:text-xs text-charcoal-600 flex gap-2"><span className="text-charcoal-900">•</span> Refunds ({'>'}24h notice) are instant.</p>
                        <p className="text-[11px] sm:text-xs text-charcoal-600 flex gap-2"><span className="text-charcoal-900">•</span> Used automatically on new bookings.</p>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-cream-100 flex justify-between items-center">
                    <h3 className="font-serif text-xl text-charcoal-900">Transaction History</h3>
                </div>

                <div className="w-full">
                    {/* Desktop Table */}
                    <table className="hidden sm:table w-full text-left">
                        <thead className="bg-cream-50 text-slate font-bold uppercase tracking-widest text-[10px] border-b border-cream-200">
                            <tr>
                                <th className="px-6 py-4 min-w-[140px]">Date / Time</th>
                                <th className="px-6 py-4">STUDIO / INSTRUCTOR</th>
                                <th className="px-6 py-4">Activity</th>
                                <th className="px-6 py-4">Schedule</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {transactions && transactions.length > 0 ? (
                                transactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-off-white/40 transition-colors">
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="text-[10px] font-bold text-charcoal uppercase tracking-tight">
                                                {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="text-[9px] text-slate font-medium uppercase tracking-tight mt-0.5">
                                                {new Date(tx.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="font-bold text-charcoal uppercase text-xs truncate">
                                                {tx.studio || tx.instructor || 'System'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className="font-black text-charcoal text-[9px] uppercase tracking-widest px-2 py-1 bg-charcoal/5 rounded">{tx.type}</span>
                                                {tx.details && <span className="text-[10px] text-charcoal/50 italic truncate">{tx.details}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {tx.session_date ? (
                                                <div className="flex flex-col">
                                                    <span className="font-black text-charcoal/60 text-[9px] uppercase whitespace-nowrap px-2 py-0.5 bg-off-white rounded w-fit">
                                                        {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} / {tx.session_time?.slice(0, 5)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-charcoal/20 uppercase font-black italic">System</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate font-medium px-2 py-1 bg-cream-50 rounded">
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-3 text-right font-black whitespace-nowrap text-[11px] ${tx.amount > 0 ? 'text-green-600' : 'text-charcoal'}`}>
                                            {tx.amount > 0 ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-charcoal/40 font-serif italic text-lg">
                                        No transactions yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile List View */}
                    <div className="sm:hidden divide-y divide-cream-100">
                        {transactions && transactions.length > 0 ? (
                            transactions.map((tx, i) => (
                                <div key={i} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-off-white transition-colors duration-300">
                                    <div className="shrink-0 flex flex-col gap-1 min-w-[80px]">
                                        <span className="text-[9px] font-black text-charcoal uppercase tracking-widest whitespace-nowrap">
                                            {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-[8px] text-charcoal/40 font-bold uppercase tracking-tight">
                                            {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-charcoal uppercase tracking-wide truncate">
                                            {tx.studio || tx.instructor || 'System'}
                                        </p>
                                        <p className="text-xs text-charcoal/40 font-bold uppercase tracking-tighter whitespace-normal break-words leading-tight mt-0.5">
                                            {tx.type} {tx.details ? `• ${tx.details}` : ''}
                                        </p>
                                        {tx.session_date && (
                                            <p className="text-[9px] text-charcoal/60 font-black uppercase tracking-tighter mt-1">
                                                Slot: {new Date(tx.session_date).toLocaleDateString()} @ {tx.session_time?.slice(0, 5)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-[11px] font-bold text-[#43302E] tracking-tight">
                                            {tx.amount > 0 ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString()}
                                        </span>
                                        {tx.status && (
                                            <span className="block text-[7px] font-black uppercase tracking-widest text-slate/40 mt-1">
                                                {tx.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-charcoal/40 font-serif italic">
                                No transactions yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
