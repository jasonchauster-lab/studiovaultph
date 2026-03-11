'use client'

import { Wallet, TrendingUp, Clock, ArrowUpRight, DollarSign, ArrowLeft, Info, X, ShieldCheck, AlertCircle, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import TopUpModal from '@/components/dashboard/TopUpModal'

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

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16">
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
            />

            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-xl animate-in fade-in duration-700" onClick={() => setShowInfoModal(false)}>
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

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                <div className="relative">
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/20 hover:text-gold uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-5xl font-serif text-charcoal tracking-tighter mb-4">Earnings & Payouts</h1>
                    <p className="text-[10px] font-bold text-slate uppercase tracking-[0.4em]">Manage your earnings, payouts, and financial history.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    {recentTransactions && <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />}
                    <button
                        onClick={() => setShowTopUpModal(true)}
                        className="h-14 bg-white text-charcoal px-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-3 border border-border-grey hover:bg-off-white transition-all shadow-tight active:scale-95"
                    >
                        <ArrowUpRight className="w-4 h-4 text-forest stroke-[3px]" />
                        ADD FUNDS
                    </button>
                    {availableBalance < 0 ? (
                        <button
                            disabled
                            className="h-14 bg-charcoal/10 text-charcoal/40 px-10 rounded-[12px] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 cursor-not-allowed opacity-50"
                            title="Payouts are restricted while balance is negative."
                        >
                            <Wallet className="w-4 h-4" />
                            PAYOUTS RESTRICTED
                        </button>
                    ) : (
                        <Link
                            href="/instructor/payout"
                            className="h-14 bg-forest text-white px-10 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-tight active:scale-95"
                        >
                            <Wallet className="w-4 h-4 text-white" />
                            CASH OUT
                        </Link>
                    )}
                </div>
            </div>

            <div className="earth-card p-4 inline-block bg-white shadow-tight">
                <DateRangeFilters />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Available Balance */}
                <div className="earth-card p-10 relative overflow-hidden bg-forest border-forest/20 hover:-translate-y-2 transition-all duration-700 col-span-1 sm:col-span-2 shadow-tight">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white uppercase tracking-[0.4em]">Available to Cash Out</span>
                            </div>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="text-white/40 hover:text-white transition-colors p-2 bg-white/10 rounded-xl border border-white/20"
                            >
                                <Info className="w-5 h-5" />
                            </button>
                        </div>
                        <h2 className="text-6xl font-serif text-white tracking-tighter mb-4">₱{(availableBalance || 0).toLocaleString()}</h2>
                        <div className="flex items-center gap-4 text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">
                            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20">READY FOR LIQUIDATION</div>
                        </div>
                    </div>
                </div>

                {/* Gross Earnings */}
                <div className="earth-card p-10 hover:-translate-y-2 transition-all duration-700 bg-white shadow-tight">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-green-50 rounded-lg border border-border-grey shadow-tight">
                            <TrendingUp className="w-6 h-6 text-forest" />
                        </div>
                        <span className="text-[10px] font-bold text-slate uppercase tracking-[0.4em]">Total Earnings</span>
                    </div>
                    <h3 className="text-4xl font-serif text-charcoal tracking-tighter mb-3">₱{(totalEarned || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-bold text-slate uppercase tracking-[0.2em]">LIFETIME EARNINGS</p>
                </div>

                {/* Net Earnings */}
                <div className="glass-card p-10 hover:-translate-y-2 transition-all duration-700 bg-charcoal text-white">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-white/10 rounded-[12px] border border-white/20 shadow-sm">
                                <DollarSign className="w-6 h-6 text-gold" />
                            </div>
                            <span className="text-[10px] font-black text-white/90 uppercase tracking-[0.4em]">Current Balance</span>
                        </div>
                    </div>
                    <h3 className="text-4xl font-serif text-white tracking-tighter mb-3">₱{(netEarnings || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">POST-DEDUCTION BALANCE</p>
                </div>

                {/* Compensation */}
                <div className="earth-card p-10 hover:-translate-y-2 transition-all duration-700 bg-white border-l-forest border-l-4 shadow-tight">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-green-50 rounded-lg border border-border-grey shadow-tight">
                            <ShieldCheck className="w-6 h-6 text-forest" />
                        </div>
                        <span className="text-[10px] font-bold text-slate uppercase tracking-[0.4em]">Adjustments</span>
                    </div>
                    <h3 className="text-4xl font-serif text-charcoal tracking-tighter mb-3">₱{(totalCompensation || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-bold text-forest uppercase tracking-[0.2em]">MANUAL CREDITS</p>
                </div>

                {/* Penalty */}
                <div className="glass-card p-10 hover:-translate-y-2 transition-all duration-700 bg-white/40 border-l-red-400 border-l-4">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-red-50/50 rounded-[12px] border border-white/60 shadow-sm">
                            <TrendingUp className="w-6 h-6 text-red-400 transform rotate-180" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em]">Penalties</span>
                    </div>
                    <h3 className="text-4xl font-serif text-red-500 tracking-tighter mb-3">- ₱{(totalPenalty || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">LATE CANCELLATIONS</p>
                </div>

                {/* Security Hold */}
                <div className="glass-card p-10 hover:-translate-y-2 transition-all duration-700 bg-white/40 border-l-sage border-l-4">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-sage/5 rounded-[12px] border border-white/60 shadow-sm">
                            <Clock className="w-6 h-6 text-sage" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em]">Pending Funds</span>
                    </div>
                    <h3 className="text-4xl font-serif text-charcoal tracking-tighter mb-3">₱{(pendingBalance || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-black text-sage font-bold uppercase tracking-[0.2em]">AVAILABLE IN 24H</p>
                </div>

                {/* Pending Payouts */}
                <div className="glass-card p-10 hover:-translate-y-2 transition-all duration-700 bg-white/40">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-white rounded-[12px] border border-white/60 shadow-sm">
                            <Clock className="w-6 h-6 text-charcoal/40" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em]">In Process</span>
                    </div>
                    <h3 className="text-4xl font-serif text-charcoal tracking-tighter mb-3">₱{(pendingPayouts || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">PENDING PAYOUTS</p>
                </div>

                {/* Total Withdrawn */}
                <div className="glass-card p-10 hover:-translate-y-2 transition-all duration-700 bg-white/40">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-white rounded-[12px] border border-white/60 shadow-sm">
                            <ArrowUpRight className="w-6 h-6 text-charcoal/40" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em]">Total Paid Out</span>
                    </div>
                    <h3 className="text-4xl font-serif text-charcoal tracking-tighter mb-3">₱{(totalWithdrawn || 0).toLocaleString()}</h3>
                    <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">TOTAL WITHDRAWALS</p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="earth-card overflow-hidden shadow-tight">
                <div className="p-10 border-b border-border-grey flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                        <Clock className="w-6 h-6 text-forest" />
                        <h3 className="text-3xl font-serif text-charcoal tracking-tighter">Transaction History</h3>
                    </div>
                    <div className="text-[9px] font-bold text-slate uppercase tracking-[0.4em]">Recent Activity</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/40 text-charcoal/50 text-[10px] font-black uppercase tracking-[0.4em]">
                                <th className="px-10 py-6 font-black">Date / Time</th>
                                <th className="px-10 py-6 font-black">Type</th>
                                <th className="px-10 py-6 font-black">Status</th>
                                <th className="px-10 py-6 font-black text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/60 bg-white/20">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.map((tx: any, i: number) => (
                                    <tr key={i} className="hover:bg-white transition-all duration-500 group">
                                        <td className="px-10 py-8">
                                            <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">
                                                {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <span className="block text-[9px] text-charcoal/20 font-black uppercase tracking-[0.2em] mt-1.5">
                                                {new Date(tx.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.22em] flex items-center gap-3">
                                                {tx.type}
                                                {tx.details && (
                                                    <span className="text-[8px] text-gold border border-gold/20 px-2 py-0.5 rounded-md tracking-tighter">
                                                        {tx.details}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={`status-pill-earth inline-flex items-center
                                                ${tx.status === 'approved' || tx.status === 'processed'
                                                    ? 'status-pill-green'
                                                    : tx.status === 'pending'
                                                        ? 'status-pill-yellow'
                                                        : 'bg-off-white text-slate border-border-grey'
                                                }
                                            `}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-10 py-8 text-[11px] font-bold uppercase tracking-[0.1em] text-right ${tx.total_amount > 0 ? 'text-forest' : tx.total_amount < 0 ? 'text-red-600' : 'text-charcoal'}`}>
                                            <div className="flex items-center justify-end gap-2">
                                                {tx.total_amount > 0 ? <Plus className="w-3 h-3 stroke-[4px]" /> : tx.total_amount < 0 ? <Minus className="w-3 h-3 stroke-[4px]" /> : null}
                                                ₱{Math.abs(tx.total_amount).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-10 bg-white/40 rounded-full border border-white/60 mb-8 shadow-sm group-hover:scale-110 transition-transform duration-700">
                                                <Wallet className="w-12 h-12 text-charcoal/5" />
                                            </div>
                                            <p className="text-charcoal/20 font-black uppercase tracking-[0.4em] italic">No transaction records detected in the vault</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
