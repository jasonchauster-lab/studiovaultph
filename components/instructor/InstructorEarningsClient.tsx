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
        <div className="max-w-7xl mx-auto space-y-12 pb-20">
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

            <div className="sticky top-0 z-50 bg-off-white/80 backdrop-blur-md -mx-4 px-4 py-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:mx-0 sm:px-0 sm:py-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="relative w-full sm:w-auto px-4 sm:px-0">
                    <Link
                        href="/instructor"
                        className="hidden sm:inline-flex items-center gap-3 text-[10px] font-black text-charcoal/20 hover:text-gold uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-3xl sm:text-5xl font-serif text-charcoal tracking-tighter mb-2 sm:mb-4 px-4 sm:px-0">Earnings & Payouts</h1>
                    <p className="hidden sm:block text-[10px] font-bold text-slate uppercase tracking-[0.4em]">Manage your earnings, payouts, and financial history.</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
                    <div className="flex w-full sm:w-auto">
                        {recentTransactions && <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />}
                    </div>
                    <button
                        onClick={() => setShowTopUpModal(true)}
                        className="h-12 sm:h-14 w-full sm:w-auto bg-white text-charcoal px-8 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 border border-border-grey hover:bg-off-white transition-all shadow-tight active:scale-95 whitespace-nowrap"
                    >
                        <ArrowUpRight className="w-4 h-4 text-forest stroke-[3px]" />
                        ADD FUNDS
                    </button>
                    <div className="w-full sm:w-auto">
                        {availableBalance < 0 ? (
                            <button
                                disabled
                                className="h-12 sm:h-14 w-full sm:w-[180px] bg-[#43302E] text-white/40 px-10 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 cursor-not-allowed opacity-50 whitespace-nowrap"
                                title="Payouts are restricted while balance is negative."
                            >
                                <Wallet className="w-4 h-4 text-white/40" />
                                RESTRICTED
                            </button>
                        ) : (
                            <Link
                                href="/instructor/payout"
                                className="h-12 sm:h-14 w-full sm:w-[180px] bg-[#43302E] text-white px-10 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:brightness-125 transition-all shadow-tight active:scale-95 whitespace-nowrap"
                            >
                                <Wallet className="w-4 h-4 text-white" />
                                CASH OUT
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="earth-card p-4 inline-block bg-white shadow-tight">
                <DateRangeFilters />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
                {/* Available Balance */}
                <div className="earth-card p-3 sm:p-5 relative overflow-hidden bg-white hover:-translate-y-2 transition-all duration-700 shadow-tight">
                    {/* Info Icon - Fixed to Top Right */}
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 text-charcoal/20 hover:text-charcoal transition-colors p-1 bg-off-white rounded-lg border border-border-grey"
                    >
                        <Info className="w-3 h-3" />
                    </button>

                    <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl sm:blur-2xl pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mb-3 sm:mb-5">
                            <div className="p-1.5 sm:p-2.5 bg-green-50 rounded-lg border border-border-grey shadow-tight w-fit">
                                <Wallet className="w-3.5 h-3.5 sm:w-4 h-4 text-forest" />
                            </div>
                            <span className="text-[10px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight">LIQUID BALANCE</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(availableBalance || 0).toLocaleString()}</h2>
                        <div className="flex items-center gap-4 text-[7px] sm:text-[8px] font-black text-charcoal/40 uppercase tracking-[0.3em] overflow-hidden">
                            <div className="px-2 py-0.5 bg-green-50 rounded-full border border-forest/10 truncate">LIQUID</div>
                        </div>
                </div>

                {/* Gross Earnings */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white shadow-tight">
                    <div className="flex items-center gap-2 mb-3 sm:mb-5 overflow-hidden">
                        <div className="p-1.5 sm:p-2.5 bg-green-50 rounded-lg border border-border-grey shadow-tight shrink-0">
                            <TrendingUp className="w-3.5 h-3.5 sm:w-4 h-4 text-forest" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">Total</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(totalEarned || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-slate uppercase tracking-[0.2em] truncate">LIFETIME</p>
                </div>

                {/* Net Earnings */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white shadow-tight">
                    <div className="flex items-center justify-between mb-3 sm:mb-5 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 sm:p-2.5 bg-gold/5 rounded-lg border border-border-grey shadow-tight shrink-0">
                                <DollarSign className="w-3.5 h-3.5 sm:w-4 h-4 text-gold" />
                            </div>
                            <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">Current</span>
                        </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(netEarnings || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-slate uppercase tracking-[0.2em] truncate">NET BALANCE</p>
                </div>

                {/* Compensation */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white border-l-forest border-l-4 shadow-tight">
                    <div className="flex items-center gap-2 mb-3 sm:mb-5 overflow-hidden">
                        <div className="p-1.5 sm:p-2.5 bg-green-50 rounded-lg border border-border-grey shadow-tight shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 h-4 text-forest" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">Credits</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(totalCompensation || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-forest uppercase tracking-[0.2em] truncate">ADJUSTMENTS</p>
                </div>

                {/* Penalty */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white border-l-red-400 border-l-4 shadow-tight">
                    <div className="flex items-center gap-2 mb-3 sm:mb-5 overflow-hidden">
                        <div className="p-1.5 sm:p-2.5 bg-red-50/50 rounded-lg border border-border-grey shadow-tight shrink-0">
                            <TrendingUp className="w-3.5 h-3.5 sm:w-4 h-4 text-red-400 transform rotate-180" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">Penalties</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-red-500 tracking-tighter mb-1 truncate">-₱{(totalPenalty || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-red-500 uppercase tracking-[0.2em] truncate">CANCELLATIONS</p>
                </div>

                {/* Security Hold */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white border-l-sage border-l-4 shadow-tight">
                    <div className="flex items-center gap-2 mb-3 sm:mb-5 overflow-hidden">
                        <div className="p-1.5 sm:p-2.5 bg-sage/5 rounded-lg border border-border-grey shadow-tight shrink-0">
                            <Clock className="w-3.5 h-3.5 sm:w-4 h-4 text-sage" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">Security Hold</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(pendingBalance || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-sage uppercase tracking-[0.2em] truncate">CLEARS IN 24H</p>
                </div>

                {/* Pending Payouts */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white shadow-tight">
                    <div className="flex items-center gap-2 mb-3 sm:mb-5 overflow-hidden">
                        <div className="p-1.5 sm:p-2.5 bg-off-white rounded-lg border border-border-grey shadow-tight shrink-0">
                            <Clock className="w-3.5 h-3.5 sm:w-4 h-4 text-charcoal/40" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">In Process</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(pendingPayouts || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-slate uppercase tracking-[0.2em] truncate">PAYOUTS</p>
                </div>

                {/* Total Withdrawn */}
                <div className="earth-card p-3 sm:p-5 hover:-translate-y-2 transition-all duration-700 bg-white shadow-tight">
                    <div className="flex items-center gap-2 mb-3 sm:mb-5 overflow-hidden">
                        <div className="p-1.5 sm:p-2.5 bg-off-white rounded-lg border border-border-grey shadow-tight shrink-0">
                            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 h-4 text-charcoal/40" />
                        </div>
                        <span className="text-[7px] sm:text-[9px] font-bold text-slate uppercase tracking-[0.2em] sm:tracking-[0.4em] leading-tight truncate">Paid Out</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif text-charcoal tracking-tighter mb-1 truncate">₱{(totalWithdrawn || 0).toLocaleString()}</h3>
                    <p className="text-[7px] sm:text-[8px] font-bold text-slate uppercase tracking-[0.2em] truncate">WITHDRAWALS</p>
                </div>
            </div>

            <div className="earth-card overflow-hidden shadow-tight mb-20">
                <div className="p-6 sm:p-10 border-b border-border-grey flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-forest shrink-0" />
                        <h3 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate">Transaction History</h3>
                    </div>
                    <div className="hidden sm:block text-[9px] font-bold text-slate uppercase tracking-[0.4em]">Recent Activity</div>
                </div>

                <div className="w-full">
                    <table className="hidden sm:table w-full text-left">
                        <thead>
                            <tr className="bg-white/40 text-charcoal/50 text-[10px] font-black uppercase tracking-[0.4em]">
                                <th className="px-10 py-6 font-black">Date / Time</th>
                                <th className="px-10 py-6 font-black">STUDENT</th>
                                <th className="px-10 py-6 font-black">Type</th>
                                <th className="px-10 py-6 font-black">SCHEDULE</th>
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
                                            <div className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">
                                                {tx.client || 'System'}
                                            </div>
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
                                            {tx.session_date ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-charcoal text-[11px] uppercase whitespace-nowrap">
                                                        {new Date(tx.session_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] text-charcoal/40 font-black uppercase whitespace-nowrap">
                                                        {tx.session_time?.slice(0, 5)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-charcoal/30 uppercase font-black italic">No session</span>
                                            )}
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
                                    <td colSpan={6} className="px-10 py-32 text-center">
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

                    {/* Mobile List Layout */}
                    <div className="sm:hidden divide-y divide-border-grey/30">
                        {recentTransactions && recentTransactions.length > 0 ? (
                            recentTransactions.map((tx: any, i: number) => (
                                <div key={i} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-off-white transition-colors duration-300">
                                    <div className="shrink-0 flex flex-col gap-1 min-w-[70px]">
                                        <span className="text-[9px] font-black text-charcoal uppercase tracking-widest whitespace-nowrap">
                                            {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-[8px] text-charcoal/40 font-bold uppercase tracking-tight">
                                            {new Date(tx.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-charcoal uppercase tracking-wide truncate">
                                            {tx.client || 'System'}
                                        </p>
                                        <p className="text-xs text-charcoal/40 font-bold uppercase tracking-tighter whitespace-normal break-words leading-tight mt-0.5">
                                            {tx.type} {tx.details ? `• ${tx.details}` : ''}
                                        </p>
                                        {tx.session_date && (
                                            <p className="text-[9px] text-[#43302E]/60 font-black uppercase tracking-tighter mt-1">
                                                Slot: {new Date(tx.session_date).toLocaleDateString()} @ {tx.session_time?.slice(0, 5)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-[11px] font-bold text-[#43302E] tracking-tight">
                                            {tx.total_amount > 0 ? '+' : tx.total_amount < 0 ? '-' : ''}
                                            ₱{Math.abs(tx.total_amount).toLocaleString()}
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
                            <div className="px-10 py-20 text-center">
                                <p className="text-charcoal/20 font-black uppercase tracking-[0.2em] italic text-[10px]">No transaction records found</p>
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
