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
    const incomeTransactions = recentTransactions?.filter((t: any) => t.type !== 'Payout') || []
    const withdrawalTransactions = recentTransactions?.filter((t: any) => t.type === 'Payout') || []
    const [activeTab, setActiveTab] = useState<'income' | 'withdrawals'>('income')

    return (
        <div className="min-h-screen bg-cream-50/30 px-4 py-6 sm:p-8 selection:bg-forest/10 selection:text-forest">
            <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 pb-20">
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
            />

            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                            <h3 className="font-serif text-lg text-charcoal">Wallet & Recovery Rules</h3>
                            <button onClick={() => setShowInfoModal(false)} className="text-charcoal/40 hover:text-charcoal transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-rose-gold font-bold text-sm uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4" />
                                    Negative Balances
                                </div>
                                <p className="text-sm text-charcoal-600 leading-relaxed uppercase tracking-tight font-medium">
                                    If penalty deductions cause your wallet to drop below ₱0.00, your account will carry a negative balance. While negative, payouts are suspended.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-charcoal font-bold text-sm uppercase tracking-wider">
                                    <ShieldCheck className="w-4 h-4" />
                                    Auto-Recovery
                                </div>
                                <p className="text-sm text-charcoal-600 leading-relaxed uppercase tracking-tight font-medium">
                                    Any future earnings will be automatically applied to the negative balance until the debt is cleared. Admin settlement is also available.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-cream-50 border-t border-cream-200">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="w-full py-3 bg-forest text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-colors shadow-lg shadow-forest/20"
                            >
                                Acknowledge Protocol
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                        <Link
                            href="/instructor"
                            className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/40 hover:text-charcoal uppercase tracking-[0.3em] transition-all mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Return to Dashboard
                        </Link>
                        <h1 className="text-[2.25rem] sm:text-4xl font-serif text-charcoal-900 mb-2 tracking-tight leading-tight">Earnings &amp; Payouts</h1>
                        <p className="text-charcoal-600/80 font-medium text-sm sm:text-base max-w-2xl leading-relaxed">
                            Overview of your professional yield, settlements, and withdrawal history.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowTopUpModal(true)}
                            className="h-11 px-6 bg-white text-charcoal rounded-xl flex items-center justify-center gap-2 border border-border-grey shadow-tight hover:bg-off-white active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
                        >
                            <Plus className="w-3.5 h-3.5 text-forest" />
                            TOP UP
                        </button>
                        {recentTransactions && (
                            <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />
                        )}
                    </div>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both py-2">
                <DateRangeFilters />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                {/* Available Balance - Hero Card */}
                <div className="atelier-card p-6 sm:p-8 col-span-2 relative overflow-hidden group border-0 shadow-2xl !bg-forest text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center border border-gold/30">
                                <Wallet className="w-6 h-6 text-gold" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">AVAILABLE FUNDS</span>
                                    <button
                                        onClick={() => setShowInfoModal(true)}
                                        className="text-white/20 hover:text-white transition-colors"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="h-px w-full bg-gold/20 mt-1" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowTopUpModal(true)}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 text-gold" />
                                TOP UP
                            </button>
                            {availableBalance < 0 ? (
                                <div className="px-6 py-2.5 bg-white/5 text-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
                                    <ShieldCheck className="w-3 h-3" />
                                    RESTRICTED
                                </div>
                            ) : (
                                <Link
                                    href="/instructor/payout"
                                    className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                        availableBalance > 0 
                                        ? 'bg-gold hover:bg-gold-600 text-charcoal shadow-lg shadow-gold/20 active:scale-95' 
                                        : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                                    }`}
                                >
                                    Withdraw
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl sm:text-6xl font-serif text-gold tracking-tighter">₱{(availableBalance || 0).toLocaleString()}</span>
                            <span className="text-xs font-black text-gold/40 tracking-widest uppercase mb-2">PHP</span>
                        </div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">LIQUID BALANCE READY FOR PAYOUT</p>
                    </div>
                </div>

                {/* Net Earnings */}
                <div className="atelier-card p-6 sm:p-8 group">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-forest/10 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-forest" />
                        </div>
                        <span className="text-[10px] font-black text-forest/40 uppercase tracking-[0.2em]">NET YIELD</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-serif text-charcoal tracking-tighter">₱{(netEarnings || 0).toLocaleString()}</h3>
                        <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">REALIZED INCOME</p>
                    </div>
                </div>

                {/* Security Hold */}
                <div className="atelier-card p-6 sm:p-8 group">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-burgundy/10 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-burgundy/60" />
                        </div>
                        <span className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em]">VAULT HOLD</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-serif text-burgundy/80 tracking-tighter">₱{(pendingBalance || 0).toLocaleString()}</h3>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-burgundy/30" />
                            <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-widest leading-tight">24H SAFETY PERIOD</p>
                        </div>
                    </div>
                </div>

                {/* Gross Stats */}
                <div className="atelier-card p-6 sm:p-8 group">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-charcoal/5 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-charcoal" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">GROSS</span>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-2xl font-serif text-charcoal">₱{(totalEarned || 0).toLocaleString()}</h3>
                        <div className="flex items-center gap-4 pt-1">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-serif text-forest">+₱{(totalCompensation || 0).toLocaleString()}</span>
                                <span className="text-[7px] font-black text-forest/40 uppercase tracking-widest">COMPS</span>
                            </div>
                            <div className="w-px h-6 bg-border-grey" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-serif text-burgundy">-₱{(totalPenalty || 0).toLocaleString()}</span>
                                <span className="text-[7px] font-black text-burgundy/40 uppercase tracking-widest">FEES</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paid Out */}
                <div className="atelier-card p-6 sm:p-8 group">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-charcoal/5 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-5 h-5 text-charcoal" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">CASHOUTS</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-serif text-charcoal">₱{(totalWithdrawn || 0).toLocaleString()}</h3>
                        {pendingPayouts > 0 && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gold/10 rounded-full border border-gold/20">
                                <Clock className="w-2.5 h-2.5 text-gold-600" />
                                <span className="text-[8px] font-black uppercase text-gold-600 tracking-wider">
                                    ₱{pendingPayouts.toLocaleString()} PENDING
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-serif text-charcoal-900 tracking-tight">Transaction History</h2>
                    <div className="h-px flex-1 bg-cream-200/60" />
                </div>

                <div className="earth-card overflow-hidden shadow-tight">
                    <div className="flex border-b border-cream-200/60 bg-cream-50/30">
                        <button
                            onClick={() => setActiveTab('income')}
                            className={`flex-1 px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === 'income'
                                ? 'border-forest text-forest bg-sage/5'
                                : 'border-transparent text-charcoal/40 hover:text-forest/60'
                                }`}
                        >
                            INCOME & ADJUSTMENTS
                        </button>
                        <button
                            onClick={() => setActiveTab('withdrawals')}
                            className={`flex-1 px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${activeTab === 'withdrawals'
                                ? 'border-burgundy text-burgundy bg-burgundy/5'
                                : 'border-transparent text-charcoal/40 hover:text-burgundy/60'
                                }`}
                        >
                            WITHDRAWALS
                        </button>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="hidden sm:table w-full text-left">
                            <thead className="bg-cream-50/50 text-charcoal/60 font-black uppercase tracking-[0.1em] text-[10px] border-b border-cream-200">
                                <tr>
                                    <th className="px-6 py-5">Date / Time</th>
                                    <th className="px-6 py-5">Student</th>
                                    <th className="px-6 py-5">Type</th>
                                    <th className="px-6 py-5">Schedule</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right font-black">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100/50 bg-white/20">
                                {(activeTab === 'income' ? incomeTransactions : withdrawalTransactions).length > 0 ? (
                                    (activeTab === 'income' ? incomeTransactions : withdrawalTransactions).map((tx: any, i: number) => (
                                        <tr key={i} className="hover:bg-off-white/50 transition-all duration-500 group border-b border-border-grey/20">
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.1em]">
                                                    {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <span className="block text-[8px] text-charcoal/40 font-bold uppercase tracking-[0.2em] mt-1">
                                                    {new Date(tx.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">
                                                    {tx.client || 'System'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="inline-block px-2.5 py-1 bg-charcoal/5 rounded-lg font-black tracking-widest text-[8px] border border-charcoal/10 uppercase w-fit">
                                                        {tx.type}
                                                    </span>
                                                    {tx.details && (
                                                        <span className="text-[8px] text-charcoal/50 font-bold px-2.5 py-1 bg-off-white rounded-lg tracking-tighter uppercase border border-border-grey/40 truncate max-w-[150px]">
                                                            {tx.details}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                {tx.session_date ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-charcoal/60 text-[9px] uppercase whitespace-nowrap px-2.5 py-1 bg-buttermilk/10 rounded-lg border border-charcoal/5 w-fit">
                                                            {new Date(tx.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} / {tx.session_time?.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-charcoal/20 uppercase font-black italic tracking-widest">--</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={clsx(
                                                    "text-[8px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-lg border shadow-sm",
                                                    (tx.status === 'approved' || tx.status === 'processed' || tx.status === 'completed' || tx.status === 'paid')
                                                        ? "bg-sage/10 text-forest border-forest/20"
                                                        : tx.status === 'pending'
                                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                                            : "bg-off-white text-charcoal/40 border-border-grey/60"
                                                )}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className={clsx(
                                                "px-6 py-6 text-[13px] font-bold uppercase tracking-[0.1em] text-right",
                                                tx.total_amount > 0 ? "text-emerald-600" : tx.total_amount < 0 ? "text-rose-500" : "text-charcoal"
                                            )}>
                                                <div className="flex items-center justify-end gap-1.5 font-serif text-base">
                                                    {tx.total_amount > 0 ? '+' : tx.total_amount < 0 ? '-' : ''}
                                                    ₱{Math.abs(tx.total_amount).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="p-10 bg-off-white rounded-full border border-border-grey/60 mb-8 shadow-tight">
                                                    <Clock className="w-12 h-12 text-charcoal/10" />
                                                </div>
                                                <p className="text-charcoal/40 font-black uppercase tracking-[0.4em] italic text-[10px]">No records detected in the vault</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile List Layout (Simplified for brevity but standardized) */}
                        <div className="sm:hidden divide-y divide-border-grey/10">
                            {(activeTab === 'income' ? incomeTransactions : withdrawalTransactions).length > 0 ? (
                                (activeTab === 'income' ? incomeTransactions : withdrawalTransactions).map((tx: any, i: number) => (
                                    <div key={i} className="px-4 py-5 flex items-start justify-between gap-3 bg-white active:bg-off-white/30 transition-all duration-300">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={clsx(
                                                    "text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded border shadow-sm",
                                                    (tx.status === 'approved' || tx.status === 'processed' || tx.status === 'completed' || tx.status === 'paid')
                                                        ? "bg-sage/10 text-forest border-forest/10"
                                                        : tx.status === 'pending'
                                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                                            : "bg-off-white text-charcoal/40 border-border-grey/20"
                                                )}>
                                                    {tx.status}
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
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right pt-0.5">
                                            <span className={clsx('text-base font-serif tracking-tight', tx.total_amount > 0 ? 'text-emerald-600' : tx.total_amount < 0 ? 'text-rose-500' : 'text-charcoal')}>
                                                {tx.total_amount > 0 ? '+' : tx.total_amount < 0 ? '-' : ''}
                                                ₱{Math.abs(tx.total_amount).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-10 py-32 text-center bg-white">
                                    <p className="text-charcoal/40 font-black uppercase tracking-[0.4em] italic text-[10px]">No records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
)
}
