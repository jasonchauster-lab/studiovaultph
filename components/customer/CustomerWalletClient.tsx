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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Available Balance */}
                <div className="bg-gradient-to-br from-forest to-forest/90 text-white p-6 rounded-2xl shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute -right-6 -top-6 text-white/5 group-hover:text-white/10 transition-colors duration-500">
                        <Wallet className="w-32 h-32 md:w-40 md:h-40 rotate-12" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                                <Wallet className="w-4 h-4 text-rose-gold/80" />
                                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Available Balance</span>
                            </div>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="text-white/60 hover:text-rose-gold transition-colors p-1.5 bg-black/10 rounded-full"
                                title="Wallet Rules"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-serif text-rose-gold/80 font-light">₱</span>
                                <p className="text-3xl sm:text-5xl font-serif tracking-tight leading-none">{(available || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending Balance */}
                <div className={`p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${pending > 0 ? 'bg-amber-50/50 border-amber-200 shadow-md ring-1 ring-amber-100' : 'bg-white border-cream-200 shadow-sm'}`}>
                    <div className="absolute -right-4 -top-4 text-charcoal/5">
                        <Clock className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full w-fit bg-charcoal/5">
                            <Clock className={`w-4 h-4 ${pending > 0 ? 'text-amber-500' : 'text-charcoal-400'}`} />
                            <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-charcoal-700">Pending</span>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-xl font-serif text-charcoal-400 font-light">₱</span>
                                <p className="text-2xl sm:text-4xl font-serif text-charcoal-900 leading-none">{(pending || 0).toLocaleString()}</p>
                            </div>
                            {pending > 0 && <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Processing...</p>}
                        </div>
                    </div>
                </div>

                {/* Quick Info - Rules */}
                <div className="md:col-span-2 lg:col-span-1 bg-cream-50/50 p-6 rounded-2xl border border-cream-200 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-charcoal-900 border-b border-cream-200 pb-3">
                            <History className="w-4 h-4 text-forest" />
                            <span className="text-xs font-bold tracking-widest uppercase">Wallet Protocol</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="mt-1 bg-forest/10 p-1 rounded">
                                    <div className="w-1 h-1 bg-forest rounded-full" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-charcoal-900 uppercase tracking-wide">Instant Refunds</p>
                                    <p className="text-xs text-charcoal-500 leading-relaxed">Returns with &gt;24h notice credited immediately.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="mt-1 bg-forest/10 p-1 rounded">
                                    <div className="w-1 h-1 bg-forest rounded-full" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-charcoal-900 uppercase tracking-wide">Automatic Credit</p>
                                    <p className="text-xs text-charcoal-500 leading-relaxed">Balance applied first on all future bookings.</p>
                                </div>
                            </div>
                        </div>
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
                                transactions.map((tx, i) => {
                                    const formatStatus = (status: string) => {
                                        return status.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                    }

                                    const getStatusStyles = (status: string) => {
                                        const clean = status.toUpperCase();
                                        if (clean.includes('COMPLETED') || clean.includes('SUCCESS')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
                                        if (clean.includes('PENDING') || clean.includes('CANCELLED_REFUNDED')) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
                                        if (clean.includes('REJECTED') || clean.includes('FAILED') || clean.includes('EXPIRED') || clean.includes('CANCELLED_CHARGED')) return 'bg-rose-50 text-rose-700 ring-rose-600/20';
                                        return 'bg-slate-50 text-slate-700 ring-slate-600/20';
                                    }

                                    return (
                                        <tr key={i} className="hover:bg-cream-50/50 transition-all duration-200 group">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-[11px] font-bold text-charcoal-900 uppercase tracking-tight">
                                                    {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] text-charcoal-400 font-medium uppercase tracking-tight mt-0.5">
                                                    {new Date(tx.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-charcoal-900 text-xs">
                                                        {tx.studio || tx.instructor || 'StudioVault System'}
                                                    </span>
                                                    <span className="text-[9px] text-charcoal-400 font-bold uppercase tracking-widest mt-0.5">Entity</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className="font-black text-forest text-[9px] uppercase tracking-wider px-2 py-0.5 bg-forest/5 rounded-md border border-forest/10">
                                                        {tx.type}
                                                    </span>
                                                    {tx.details && <span className="text-[10px] text-charcoal-500 font-medium">{tx.details}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {tx.session_date ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-charcoal-900">
                                                            <Clock className="w-3 h-3 text-forest" />
                                                            <span className="text-[10px] font-bold uppercase whitespace-nowrap">
                                                                {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] text-charcoal-400 font-medium ml-4.5">{tx.session_time?.slice(0, 5)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-charcoal-300 font-bold uppercase italic tracking-widest">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${getStatusStyles(tx.status)}`}>
                                                    {formatStatus(tx.status)}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-5 text-right font-serif whitespace-nowrap text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-charcoal-900'}`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-xs opacity-60">₱</span>
                                                    <span className="font-bold">{tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString()}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <History className="w-12 h-12 text-cream-200" />
                                            <p className="text-charcoal-300 font-serif italic text-lg">No transactions yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile List View */}
                    <div className="sm:hidden divide-y divide-cream-100">
                        {transactions && transactions.length > 0 ? (
                            transactions.map((tx, i) => (
                                <div key={i} className="p-5 flex items-start justify-between gap-4 bg-white hover:bg-cream-50/30 transition-colors">
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-charcoal-900 uppercase tracking-widest whitespace-nowrap bg-cream-100 px-2 py-0.5 rounded">
                                                {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-[9px] text-charcoal-400 font-medium uppercase">
                                                {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-black text-charcoal-900 uppercase tracking-wide truncate">
                                                {tx.studio || tx.instructor || 'System'}
                                            </p>
                                            <p className="text-[10px] text-charcoal-500 font-medium leading-tight">
                                                <span className="uppercase text-[9px] font-bold text-forest mr-1.5">{tx.type}</span>
                                                {tx.details}
                                            </p>
                                        </div>
                                        {tx.session_date && (
                                            <div className="flex items-center gap-1.5 text-[9px] text-charcoal-400 font-bold uppercase bg-off-white w-fit px-2 py-0.5 rounded">
                                                <Clock className="w-3 h-3 text-forest/50" />
                                                <span>{new Date(tx.session_date).toLocaleDateString()} • {tx.session_time?.slice(0, 5)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right space-y-2">
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-[10px] text-charcoal-400 font-serif">₱</span>
                                            <span className={`text-base font-serif font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-charcoal-900'}`}>
                                                {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString()}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest border ${tx.status?.includes('COMPLETED') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-cream-50 text-charcoal-600 border-cream-200'}`}>
                                            {tx.status?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <History className="w-10 h-10 text-cream-200 mx-auto mb-2" />
                                <p className="text-charcoal-300 font-serif italic text-lg text-center">No transactions yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
