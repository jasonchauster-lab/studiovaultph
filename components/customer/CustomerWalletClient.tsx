'use client'

import { Wallet, ArrowUpRight, History, Clock, Info, X, ShieldCheck, AlertCircle, TrendingUp, Calendar, CreditCard, ChevronRight, ArrowDownRight, Tag } from 'lucide-react'
import Link from 'next/link'
import { useState, useMemo } from 'react'
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

    const groupedTransactions = useMemo(() => {
        if (!data?.transactions) return []

        const groups: { [key: string]: any[] } = {}
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

        data.transactions.forEach(tx => {
            const txDate = new Date(tx.date)
            const txDateTime = txDate.getTime()
            
            let groupKey = ''
            if (txDateTime >= today) {
                groupKey = 'Today'
            } else if (txDateTime >= thisMonth) {
                groupKey = 'This Month'
            } else {
                groupKey = txDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
            }

            if (!groups[groupKey]) groups[groupKey] = []
            groups[groupKey].push(tx)
        })

        return Object.entries(groups).map(([name, items]) => ({ name, items }))
    }, [data?.transactions])

    if (!data) return (
        <div className="min-h-screen flex items-center justify-center bg-off-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin" />
                <p className="font-serif text-charcoal-600">Loading your wallet...</p>
            </div>
        </div>
    )
    const { available, pending, transactions, error } = data

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-off-white p-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-rose-100 flex flex-col items-center text-center max-w-md gap-4">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-serif text-charcoal-900 mb-2">Something went wrong</h2>
                        <p className="text-charcoal-600">We couldn't load your wallet data. Please try again later.</p>
                    </div>
                    <button onClick={() => router.refresh()} className="px-6 py-2 bg-charcoal-900 text-white rounded-lg font-bold hover:bg-black transition-colors">
                        Retry
                    </button>
                </div>
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-forest mb-0.5">
                        <Wallet className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Financial Overview</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-serif text-charcoal-900">My Wallet</h1>
                    <p className="text-charcoal-500 text-sm max-w-md hidden sm:block">Manage your studio credit, view transaction history, and withdraw your available balance.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Link
                        href="/customer/payout"
                        className="flex-1 md:flex-initial bg-forest text-white px-6 py-3.5 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-forest/10 group text-sm"
                    >
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        Withdraw Funds
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Available Balance */}
                <div className="bg-gradient-to-br from-[#1B3022] via-[#2A4533] to-[#1B3022] text-white p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between group min-h-[160px] sm:min-h-[220px]">
                    <div className="absolute -right-12 -top-12 text-white/[0.03] group-hover:text-white/[0.07] transition-all duration-700">
                        <Wallet className="w-64 h-64 rotate-12" />
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(209,165,124,0.15),transparent_50%)]" />
                    
                    <div className="relative z-10 space-y-6 sm:space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                                <TrendingUp className="w-3.5 h-3.5 text-rose-gold" />
                                <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white/90">Available Balance</span>
                            </div>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all rounded-full border border-white/5"
                                title="Wallet Rules"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl md:text-3xl font-serif text-rose-gold/90 font-light">₱</span>
                                <p className="text-5xl md:text-7xl font-serif tracking-tight leading-none text-white font-medium">
                                    {(available || 0).toLocaleString()}
                                </p>
                            </div>
                            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Secured by StudioVault
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pending Balance */}
                <div className={`p-6 sm:p-8 rounded-[2rem] border transition-all duration-500 relative overflow-hidden flex flex-col justify-between min-h-[140px] sm:min-h-[220px] ${pending > 0 ? 'bg-[#FFF9F2] border-[#F2E3C9] shadow-inner ring-1 ring-[#F2E3C9]/50' : 'bg-white border-cream-200 shadow-sm'}`}>
                    <div className="absolute -right-8 -top-8 text-charcoal/[0.02] group-hover:rotate-12 transition-transform duration-700">
                        <Clock className="w-48 h-48" />
                    </div>
                    
                    <div className="relative z-10 space-y-4 sm:space-y-8">
                        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full w-fit bg-charcoal/5 border border-charcoal/5">
                            <Clock className={`w-3.5 h-3.5 ${pending > 0 ? 'text-amber-500 animate-pulse' : 'text-charcoal-300'}`} />
                            <span className="text-[10px] font-black tracking-[0.15em] uppercase text-charcoal-600">In Review / Pending</span>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl md:text-2xl font-serif text-charcoal-300 font-light">₱</span>
                                <p className="text-4xl md:text-6xl font-serif text-charcoal-900 leading-none">
                                    {(pending || 0).toLocaleString()}
                                </p>
                            </div>
                            {pending > 0 ? (
                                <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-amber-100/50 border border-amber-200/50 rounded-lg w-fit">
                                    <div className="flex gap-0.5">
                                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce" />
                                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-1 h-1 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                    <p className="text-[9px] text-amber-700 font-black uppercase tracking-widest">Processing</p>
                                </div>
                            ) : (
                                <p className="text-charcoal-300 text-[9px] font-bold uppercase tracking-widest">No pending transactions</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Info - Rules */}
                <div className="md:col-span-2 lg:col-span-1 bg-white p-6 sm:p-8 rounded-[2rem] border border-cream-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-forest/[0.02] rounded-full -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="space-y-4 sm:space-y-6 relative z-10">
                        <div className="flex items-center justify-between border-b border-cream-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-forest/10 rounded-lg flex items-center justify-center">
                                    <History className="w-4 h-4 text-forest" />
                                </div>
                                <span className="text-[10px] font-black tracking-[0.15em] uppercase text-charcoal-800">Wallet Protocol</span>
                            </div>
                            <Tag className="w-3.5 h-3.5 text-cream-400" />
                        </div>
                        
                        <div className="space-y-4 sm:space-y-5">
                            <div className="flex gap-3 sm:gap-4 group/item">
                                <div className="shrink-0 mt-1 w-5 h-5 sm:w-6 sm:h-6 bg-forest/5 rounded-full flex items-center justify-center group-hover/item:bg-forest/10 transition-colors">
                                    <div className="w-1.5 h-1.5 bg-forest rounded-full" />
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-black text-charcoal-900 uppercase tracking-wide mb-0.5 sm:mb-1">Instant Refunds</p>
                                    <p className="text-[11px] sm:text-xs text-charcoal-500 leading-relaxed font-medium">Returns with 24h+ notice are credited to your wallet balance instantly.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 sm:gap-4 group/item">
                                <div className="shrink-0 mt-1 w-5 h-5 sm:w-6 sm:h-6 bg-forest/5 rounded-full flex items-center justify-center group-hover/item:bg-forest/10 transition-colors">
                                    <div className="w-1.5 h-1.5 bg-forest rounded-full" />
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-[11px] font-black text-charcoal-900 uppercase tracking-wide mb-0.5 sm:mb-1">Automatic Credit</p>
                                    <p className="text-[11px] sm:text-xs text-charcoal-500 leading-relaxed font-medium">Wallet balance is prioritized as your default payment source for new bookings.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-forest rounded-full" />
                        <h3 className="font-serif text-2xl text-charcoal-900">Transaction History</h3>
                    </div>
                </div>

                {groupedTransactions.length > 0 ? (
                    <div className="space-y-10">
                        {groupedTransactions.map((group, groupIdx) => (
                            <div key={groupIdx} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-400 bg-cream-50 px-3 py-1 rounded-full border border-cream-200/50">
                                        {group.name}
                                    </h4>
                                    <div className="flex-1 h-px bg-gradient-to-r from-cream-200 to-transparent" />
                                </div>

                                <div className="bg-white border border-cream-200 rounded-3xl shadow-sm overflow-hidden">
                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <table className="w-full text-left">
                                            <thead className="bg-[#FAFAFA] text-charcoal-400 font-bold uppercase tracking-widest text-[9px] border-b border-cream-100">
                                                <tr>
                                                    <th className="px-8 py-4">Transaction</th>
                                                    <th className="px-8 py-4">Details</th>
                                                    <th className="px-8 py-4 text-center">Reference</th>
                                                    <th className="px-8 py-4">Status</th>
                                                    <th className="px-8 py-4 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cream-50">
                                                {group.items.map((tx, i) => {
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

                                                    const isNegative = tx.amount < 0 || tx.status?.includes('CHARGED');

                                                    return (
                                                        <tr key={i} className="hover:bg-cream-50/30 transition-all duration-200 group">
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${isNegative ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                                        {isNegative ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[11px] font-black text-charcoal-900 uppercase tracking-tight">
                                                                            {tx.type}
                                                                        </div>
                                                                        <div className="text-[10px] text-charcoal-400 font-medium whitespace-nowrap">
                                                                            {new Date(tx.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-charcoal-800 text-xs">
                                                                        {tx.studio || tx.instructor || 'StudioVault System'}
                                                                    </span>
                                                                    <span className="text-[10px] text-charcoal-400 font-medium leading-relaxed mt-0.5 line-clamp-1">
                                                                        {tx.details}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                {tx.session_date ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="flex items-center gap-1.5 text-charcoal-900">
                                                                            <Calendar className="w-3.5 h-3.5 text-forest/40" />
                                                                            <span className="text-[10px] font-bold uppercase">
                                                                                {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[9px] text-charcoal-400 font-medium mt-0.5">{tx.session_time?.slice(0, 5)}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center opacity-30">
                                                                        <CreditCard className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ring-1 ring-inset ${getStatusStyles(tx.status)}`}>
                                                                    {formatStatus(tx.status)}
                                                                </span>
                                                            </td>
                                                            <td className={`px-8 py-6 text-right font-serif whitespace-nowrap text-base ${!isNegative ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <span className="text-xs font-sans text-charcoal-400 font-bold uppercase">PHP</span>
                                                                    <span className="font-black tracking-tight">{!isNegative ? '+' : ''}{tx.amount.toLocaleString()}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile View */}
                                    <div className="md:hidden divide-y divide-cream-100">
                                        {group.items.map((tx, i) => {
                                            const isNegative = tx.amount < 0 || tx.status?.includes('CHARGED');
                                            return (
                                                <div key={i} className="p-4 flex items-start justify-between gap-3 bg-white active:bg-cream-50 transition-colors">
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isNegative ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                                {isNegative ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div>
                                                                <div className="text-[9px] font-black text-charcoal-900 uppercase tracking-[0.1em]">
                                                                    {tx.type}
                                                                </div>
                                                                <div className="text-[8px] text-charcoal-400 font-medium">
                                                                    {new Date(tx.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-0.5">
                                                            <p className="text-[10px] font-bold text-charcoal-900 uppercase leading-none">
                                                                {tx.studio || tx.instructor || 'StudioVault System'}
                                                            </p>
                                                            <p className="text-[9px] text-charcoal-500 font-medium leading-relaxed line-clamp-2">
                                                                {tx.details}
                                                            </p>
                                                        </div>

                                                        {tx.session_date && (
                                                            <div className="flex items-center gap-1.5 text-[8px] text-charcoal-600 font-bold uppercase bg-cream-50 w-fit px-2 py-0.5 rounded-md border border-cream-100">
                                                                <Calendar className="w-2.5 h-2.5 text-forest/60" />
                                                                <span>{new Date(tx.session_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {tx.session_time?.slice(0, 5)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="shrink-0 text-right flex flex-col items-end justify-between self-stretch py-0.5">
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-base font-serif font-black tracking-tight leading-none ${!isNegative ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                {!isNegative ? '+' : ''}{tx.amount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.05em] ring-1 ring-inset ${
                                                            tx.status?.toUpperCase().includes('COMPLETED') ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 
                                                            tx.status?.toUpperCase().includes('PENDING') ? 'bg-amber-50 text-amber-700 ring-amber-600/20' : 
                                                            'bg-rose-50 text-rose-700 ring-rose-600/20'
                                                        }`}>
                                                            {tx.status?.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-cream-300 rounded-[3rem] py-24 flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 bg-cream-50 rounded-full flex items-center justify-center text-cream-200">
                            <History className="w-10 h-10" />
                        </div>
                        <div>
                            <p className="text-xl font-serif text-charcoal-900 mb-1">No transactions found</p>
                            <p className="text-charcoal-400 text-sm max-w-xs mx-auto">Once you start booking or adding funds, your history will appear here.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
