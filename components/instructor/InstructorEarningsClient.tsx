'use client'

import { Wallet, TrendingUp, Clock, ArrowUpRight, DollarSign, ArrowLeft, Info, X, ShieldCheck, AlertCircle, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import TopUpModal from '@/components/dashboard/TopUpModal'
import { clsx } from 'clsx'

export default function InstructorEarningsClient({
    data
}: {
    data: any
}) {
    const [showInfoModal, setShowInfoModal] = useState(false)
    const [showTopUpModal, setShowTopUpModal] = useState(false) // Included to match previous state
    const router = useRouter()

    const {
        totalEarned,
        totalWithdrawn,
        pendingPayouts,
        availableBalance,
        pendingBalance,
        recentTransactions,
        totalCompensation,
        totalPenalty,
        netEarnings
    } = data

    // Helper for date grouping
    const groupTransactionsByDate = (transactions: any[]) => {
        if (!transactions) return {}
        const groups: { [key: string]: any[] } = {}
        
        transactions.forEach(tx => {
            const date = new Date(tx.date)
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(today.getDate() - 1)

            let dateLabel = ''
            if (date.toDateString() === today.toDateString()) {
                dateLabel = 'TODAY'
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateLabel = 'YESTERDAY'
            } else {
                dateLabel = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
            }

            if (!groups[dateLabel]) {
                groups[dateLabel] = []
            }
            groups[dateLabel].push(tx)
        })
        
        return groups
    }

    const groupedTransactions = groupTransactionsByDate(recentTransactions)

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20">
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
            />

            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-md animate-in fade-in duration-700" onClick={() => setShowInfoModal(false)}>
                    <div className="glass-card w-full max-w-lg overflow-hidden p-10 relative animate-in zoom-in-95 duration-700 rounded-[12px]" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                        <div className="flex justify-between items-start mb-10 border-b border-white/60 pb-8">
                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter">Vault Protocol</h3>
                            <button onClick={() => setShowInfoModal(false)} className="text-charcoal/10 hover:text-charcoal transition-colors p-2 bg-white/40 rounded-xl border border-white/60">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-10 mb-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-red-400 font-black text-[10px] uppercase tracking-[0.3em]">
                                    <AlertCircle className="w-5 h-5" />
                                    NEGATIVE BALANCE
                                </div>
                                <p className="text-[11px] text-charcoal/60 font-black uppercase tracking-[0.2em] leading-relaxed">
                                    Should penalty deductions cause your balance to drop below zero, payouts will be temporarily suspended until the balance is restored.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gold font-black text-[10px] uppercase tracking-[0.3em]">
                                    <ShieldCheck className="w-5 h-5" />
                                    AUTO-RECOVERY SYSTEM
                                </div>
                                <p className="text-[11px] text-charcoal/60 font-black uppercase tracking-[0.2em] leading-relaxed">
                                    Future earnings will be automatically allocated to settle outstanding obligations. Manual reconciliation via Administrative channels remains available.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInfoModal(false)}
                            className="btn-forest w-full py-4 text-[10px] font-bold uppercase tracking-[0.4em]"
                        >
                            ACKNOWLEDGE PROTOCOL
                        </button>
                    </div>
                </div>
            )}

            <div className="sticky top-0 z-50 bg-off-white/95 backdrop-blur-md -mx-4 px-4 py-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:mx-0 sm:px-0 sm:py-0 border-b border-border-grey/10 sm:border-0">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="relative">
                            <Link
                                href="/instructor"
                                className="hidden sm:inline-flex items-center gap-3 text-[10px] font-black text-charcoal/50 hover:text-gold uppercase tracking-[0.3em] transition-all mb-4 group"
                            >
                                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                                BACK TO DASHBOARD
                            </Link>
                            <h1 className="text-2xl sm:text-5xl font-serif text-charcoal tracking-tighter mb-0.5 sm:mb-4">Earnings & Payouts</h1>
                            <p className="text-[9px] sm:text-[10px] font-bold text-charcoal/40 uppercase tracking-[0.3em] leading-relaxed">Financial Overview & History</p>
                        </div>
                        <div className="flex sm:hidden items-center gap-2">
                             <button
                                onClick={() => setShowTopUpModal(true)}
                                className="h-10 px-4 bg-white text-charcoal rounded-xl flex items-center justify-center gap-2 border border-border-grey shadow-tight active:scale-95 transition-all text-[9px] font-black uppercase tracking-[0.1em]"
                                title="TOP UP"
                            >
                                <Plus className="w-3.5 h-3.5 text-forest" />
                                TOP UP
                            </button>
                            {recentTransactions && (
                                <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="hidden sm:flex gap-2 w-full">
                                <div className="flex-1">
                                    {recentTransactions && <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />}
                                </div>
                                <button
                                    onClick={() => setShowTopUpModal(true)}
                                    className="flex-1 h-11 sm:h-12 bg-white text-charcoal px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-border-grey hover:bg-off-white transition-all shadow-tight active:scale-95"
                                >
                                    <Plus className="w-3.5 h-3.5 text-forest" />
                                    TOP UP
                                </button>
                            </div>
                            <div className="w-full sm:w-auto">
                                {availableBalance < 0 ? (
                                    <button
                                        disabled
                                        className="h-11 sm:h-12 w-full px-8 bg-charcoal text-white/40 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 cursor-not-allowed opacity-50"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        RESTRICTED
                                    </button>
                                ) : (
                                        <Link
                                            href="/instructor/payout"
                                            className="h-11 sm:h-12 w-full px-8 bg-forest text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-tight active:scale-95 text-center"
                                        >
                                            <Wallet className="w-3.5 h-3.5" />
                                            WITHDRAW
                                        </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="py-2 inline-block w-full sm:w-auto">
                <DateRangeFilters />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-4 sm:px-0">
                {/* Available Balance */}
                <div className="earth-card p-4 sm:p-6 relative overflow-hidden bg-white/60 backdrop-blur-sm hover:-translate-y-1 transition-all duration-500 shadow-tight border border-border-grey group">
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-charcoal/30 hover:text-charcoal transition-colors p-1.5 bg-off-white rounded-lg border border-border-grey"
                    >
                        <Info className="w-3.5 h-3.5" />
                    </button>
 
                    <div className="absolute top-0 right-0 w-32 h-32 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none group-hover:bg-forest/10 transition-colors" />
                        
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="p-1 sm:p-1.5 bg-sage/5 rounded-lg border border-border-grey shadow-sm shrink-0">
                            <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-forest" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] leading-tight">AVAILABLE</span>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate">₱{(availableBalance || 0).toLocaleString()}</h2>
                        <div className="flex items-center justify-between gap-2 mt-2">
                            <div className="text-[7px] sm:text-[8px] font-black text-forest uppercase tracking-widest bg-sage/10 w-fit px-2 py-0.5 rounded border border-forest/10">LIQUID</div>
                            {availableBalance > 0 && (
                                <Link
                                    href="/instructor/payout"
                                    className="text-[7px] sm:text-[8px] font-black text-white uppercase tracking-widest bg-forest px-3 py-1 rounded-lg border border-forest shadow-sm hover:brightness-110 transition-all active:scale-95 flex items-center gap-1"
                                >
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    WITHDRAW
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pending Balance */}
                <div className="earth-card p-4 sm:p-6 hover:-translate-y-1 transition-all duration-500 bg-white/60 backdrop-blur-sm shadow-tight border border-border-grey group">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="p-1 sm:p-1.5 bg-buttermilk/10 rounded-lg border border-border-grey shadow-sm shrink-0">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-burgundy/40" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] leading-tight truncate">PENDING</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate text-burgundy/80">₱{(pendingBalance || 0).toLocaleString()}</h3>
                        <p className="text-[7px] sm:text-[8px] font-black text-charcoal/40 uppercase tracking-widest truncate">FUTURE INCOME</p>
                    </div>
                </div>

                {/* Gross Earnings */}
                <div className="earth-card p-4 sm:p-6 hover:-translate-y-1 transition-all duration-500 bg-white/60 backdrop-blur-sm shadow-tight border border-border-grey group">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="p-1 sm:p-1.5 bg-sage/5 rounded-lg border border-border-grey shadow-sm shrink-0">
                            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-forest/40 group-hover:text-forest transition-colors" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] leading-tight">LIFETIME</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate">₱{(totalEarned || 0).toLocaleString()}</h3>
                        <p className="text-[7px] sm:text-[8px] font-black text-charcoal/40 uppercase tracking-widest truncate">GROSS EARNINGS</p>
                    </div>
                </div>

                {/* Total Withdrawn */}
                <div className="earth-card p-4 sm:p-6 hover:-translate-y-1 transition-all duration-500 bg-white/60 backdrop-blur-sm shadow-tight border border-border-grey group relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="p-1 sm:p-1.5 bg-charcoal/5 rounded-lg border border-border-grey shadow-sm shrink-0">
                            <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-charcoal/30 group-hover:text-charcoal/50 transition-colors" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] leading-tight">CASHOUTS</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate">₱{(totalWithdrawn || 0).toLocaleString()}</h3>
                        <p className="text-[7px] sm:text-[8px] font-black text-charcoal/40 uppercase tracking-widest truncate">TOTAL WITHDRAWN</p>
                    </div>
                </div>

                {/* Net Balance / Current */}
                <div className="earth-card p-4 sm:p-6 hover:-translate-y-1 transition-all duration-500 bg-white/60 backdrop-blur-sm shadow-tight border border-border-grey group">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <div className="p-1 sm:p-1.5 bg-gold/5 rounded-lg border border-border-grey shadow-sm shrink-0">
                            <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold/40 group-hover:text-gold transition-colors" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] leading-tight">NET YIELD</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate text-gold-700">₱{(netEarnings || 0).toLocaleString()}</h3>
                        <p className="text-[7px] sm:text-[8px] font-black text-charcoal/40 uppercase tracking-widest truncate">CURRENT BALANCE</p>
                    </div>
                </div>

                {/* Adjustments (Compensation & penalties) */}
                <div className="earth-card p-4 sm:p-6 hover:-translate-y-1 transition-all duration-500 bg-white/60 backdrop-blur-sm shadow-tight border border-border-grey group">
                    <div className="flex items-center gap-2 mb-2 sm:mb-2">
                        <div className="p-1 sm:p-1.5 bg-red-400/5 rounded-lg border border-border-grey shadow-sm shrink-0">
                            <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400/30 group-hover:text-red-400/60 transition-colors" />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em] leading-tight">VAULT ADJ.</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex flex-row items-center gap-3">
                            <span className="text-[10px] sm:text-[11px] font-black text-forest tracking-tighter">+₱{(totalCompensation || 0).toLocaleString()}</span>
                            <span className="text-[10px] sm:text-[11px] font-black text-red-500 tracking-tighter">-₱{(totalPenalty || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[7px] sm:text-[8px] font-black text-charcoal/40 uppercase tracking-widest truncate">PENALTIES & COMPS</p>
                    </div>
                </div>
            </div>

            <div className="earth-card overflow-hidden shadow-tight mb-20">
                <div className="p-6 sm:p-10 border-b border-border-grey/60 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-forest shrink-0" />
                        <h3 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate">Transaction History</h3>
                    </div>
                    <div className="hidden sm:block text-[9px] font-bold text-charcoal/50 uppercase tracking-[0.4em]">Recent Activity</div>
                </div>

                <div className="w-full">
                    <table className="hidden sm:table w-full text-left">
                        <thead>
                            <tr className="bg-white/40 text-charcoal/50 text-[10px] font-black uppercase tracking-[0.4em] border-b border-border-grey/40">
                                <th className="px-6 py-4 font-black min-w-[140px]">Date / Time</th>
                                <th className="px-6 py-4 font-black">STUDENT</th>
                                <th className="px-6 py-4 font-black">Type</th>
                                <th className="px-6 py-4 font-black">SCHEDULE</th>
                                <th className="px-6 py-4 font-black">Status</th>
                                <th className="px-6 py-4 font-black text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/60 bg-white/20">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.map((tx: any, i: number) => (
                                    <tr key={i} className="hover:bg-off-white/50 transition-all duration-500 group border-b border-border-grey/20">
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.1em]">
                                                {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <span className="block text-[8px] text-charcoal/50 font-bold uppercase tracking-[0.2em] mt-1">
                                                {new Date(tx.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">
                                                {tx.client || 'System'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-bold text-charcoal uppercase tracking-tighter flex items-center gap-2">
                                                <span className="px-2.5 py-1 bg-charcoal/5 rounded-lg font-black tracking-widest text-[8px] border border-charcoal/10">{tx.type}</span>
                                                {tx.details && (
                                                    <span className="text-[8px] text-charcoal/50 font-bold px-2.5 py-1 bg-off-white rounded-lg tracking-tighter uppercase border border-border-grey/40">
                                                        {tx.details}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {tx.session_date ? (
                                                <div className="flex flex-col">
                                                    <span className="font-black text-charcoal/60 text-[9px] uppercase whitespace-nowrap px-2.5 py-1 bg-buttermilk/10 rounded-lg border border-charcoal/5 w-fit">
                                                        {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} / {tx.session_time?.slice(0, 5)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-charcoal/40 uppercase font-black italic tracking-widest">System</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-lg border shadow-sm",
                                                (tx.status === 'approved' || tx.status === 'processed' || tx.status === 'completed')
                                                    ? "bg-sage/10 text-forest border-forest/20"
                                                    : tx.status === 'pending'
                                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                                        : "bg-off-white text-charcoal/50 border-border-grey/60"
                                            )}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-right ${tx.total_amount > 0 ? 'text-emerald-600' : tx.total_amount < 0 ? 'text-rose-500' : 'text-charcoal'}`}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {tx.total_amount > 0 ? <Plus className="w-3 h-3 stroke-[3px]" /> : tx.total_amount < 0 ? <Minus className="w-3 h-3 stroke-[3px]" /> : null}
                                                ₱{Math.abs(tx.total_amount).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-10 bg-off-white rounded-full border border-border-grey/60 mb-8 shadow-tight group-hover:scale-110 transition-transform duration-700">
                                                <Wallet className="w-12 h-12 text-charcoal/10" />
                                            </div>
                                            <p className="text-charcoal/40 font-black uppercase tracking-[0.4em] italic text-[10px]">No transaction records detected in the vault</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile List Layout */}
                    <div className="sm:hidden">
                        {groupedTransactions && Object.keys(groupedTransactions).length > 0 ? (
                            Object.entries(groupedTransactions).map(([date, transactions]) => (
                                <div key={date}>
                                    <div className="bg-off-white/80 backdrop-blur-sm px-4 py-2 border-y border-border-grey/10">
                                        <span className="text-[8px] font-black text-charcoal/30 uppercase tracking-[0.3em]">{date}</span>
                                    </div>
                                    <div className="divide-y divide-border-grey/5">
                                        {(transactions as any[]).map((tx: any, i: number) => (
                                            <div key={i} className="px-4 py-5 flex items-start justify-between gap-3 bg-white hover:bg-off-white/30 active:scale-[0.99] transition-all duration-300">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={clsx(
                                                            "text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded border shadow-sm",
                                                            (tx.status === 'approved' || tx.status === 'processed' || tx.status === 'completed')
                                                                ? "bg-sage/10 text-forest border-forest/10"
                                                                : tx.status === 'pending'
                                                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                                                    : "bg-off-white text-charcoal/40 border-border-grey/20"
                                                        )}>
                                                            {tx.status?.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-[8px] text-charcoal/20 font-bold uppercase tracking-[0.1em]">
                                                            {new Date(tx.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[15px] font-serif text-charcoal tracking-tight truncate leading-tight mb-1.5">
                                                        {tx.client || 'System Settlement'}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        <span className="text-[8px] font-bold text-charcoal/40 uppercase tracking-widest px-1.5 py-0.5 bg-off-white/50 rounded border border-border-grey/30">
                                                            {tx.type}
                                                        </span>
                                                        {tx.session_date && (
                                                            <span className="text-[8px] text-charcoal/60 font-black uppercase tracking-tighter bg-buttermilk/5 px-1.5 py-0.5 rounded border border-charcoal/5">
                                                                {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                                                    <span className={`text-base font-serif tracking-tight ${tx.total_amount > 0 ? 'text-emerald-600' : tx.total_amount < 0 ? 'text-rose-500' : 'text-charcoal'}`}>
                                                        {tx.total_amount > 0 ? '+' : tx.total_amount < 0 ? '-' : ''}
                                                        ₱{Math.abs(tx.total_amount).toLocaleString()}
                                                    </span>
                                                    {tx.details && (
                                                        <span className="text-[7px] text-charcoal/30 font-bold uppercase tracking-widest max-w-[70px] leading-tight truncate">
                                                            {tx.details}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-10 py-32 text-center bg-white">
                                <p className="text-charcoal/40 font-black uppercase tracking-[0.4em] italic text-[10px]">No transaction records found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top-Up Modal */}
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
            />
        </div>
    )
}
