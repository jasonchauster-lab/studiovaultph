'use client'
import { TrendingUp, CreditCard, Wallet, Clock, Info, X, ShieldCheck, AlertCircle, ArrowUpRight } from 'lucide-react'
import PayoutRequestModal from './PayoutRequestModal'
import TopUpModal from './TopUpModal'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { topUpWallet } from '@/app/(dashboard)/customer/actions'

interface EarningsOverviewProps {
    studioId: string
    summary: {
        totalEarnings: number
        totalCompensation: number
        totalPenalty: number
        netEarnings: number
        totalPaidOut: number
        pendingPayouts: number
        availableBalance: number
        pendingBalance: number
        payoutApprovalStatus?: string
    }
}

export default function EarningsOverview({ studioId, summary }: EarningsOverviewProps) {
    const [showInfoModal, setShowInfoModal] = useState(false)
    const [showTopUpModal, setShowTopUpModal] = useState(false)
    const router = useRouter()

    const handleTopUp = () => {
        setShowTopUpModal(true)
    }

    return (
        <div className="space-y-6">
            {/* Info Modal */}
            {/* ... (same as before) */}
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

            {/* Mobile: 2-col summary cards row */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
                {/* Gross Earnings */}
                <div className="group bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-charcoal/5">
                            <TrendingUp className="w-3.5 h-3.5 text-charcoal/40" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/30 mb-1">Gross Earnings</p>
                    <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">₱{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Cancellation Comp */}
                <div className="group bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-green-50">
                            <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/30 mb-1 leading-tight">Cancel Comp.</p>
                    <h3 className="text-2xl font-serif font-bold text-green-600 tracking-tight">₱{summary.totalCompensation.toLocaleString()}</h3>
                </div>

                {/* Penalty */}
                <div className="group bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-red-50">
                            <TrendingUp className="w-3.5 h-3.5 text-red-500" style={{transform:'rotate(180deg)'}} />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/30 mb-1">Penalty</p>
                    <h3 className="text-2xl font-serif font-bold text-red-500 tracking-tight">-₱{summary.totalPenalty.toLocaleString()}</h3>
                </div>

                {/* Net Earnings */}
                <div className="group bg-white p-4 rounded-2xl border-2 border-forest/20 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1.5 bg-forest/5 rounded-bl-lg">
                        <ShieldCheck className="w-3.5 h-3.5 text-forest/20" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-forest/10">
                            <TrendingUp className="w-3.5 h-3.5 text-forest" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-forest/50 mb-1">Net Earnings</p>
                    <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">₱{summary.netEarnings.toLocaleString()}</h3>
                </div>
            </div>

            {/* Mobile: Available Balance — full width hero card */}
            <div className="sm:hidden group p-0.5 rounded-3xl shadow-xl bg-gradient-to-br from-[#BC926E] via-[#A67B5B] to-[#8E6548] overflow-hidden">
                <div className="p-6 h-full flex flex-col relative">
                    <div className="absolute -right-6 -bottom-6 opacity-[0.15]">
                        <Wallet className="w-32 h-32 text-white" />
                    </div>
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/10 shadow-inner">
                                <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white transition-all hover:bg-white/20"
                                title="Wallet Rules"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowTopUpModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/10"
                            >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                Top-Up
                            </button>
                            <PayoutRequestModal
                                studioId={studioId}
                                availableBalance={summary.availableBalance}
                                payoutApprovalStatus={summary.payoutApprovalStatus}
                            />
                        </div>
                    </div>

                    <div className="relative z-10">
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white/50 mb-1.5">Available to Withdraw</p>
                        <h3 className="text-[2.75rem] font-serif font-bold text-white leading-none tracking-tight drop-shadow-md">
                            ₱{summary.availableBalance.toLocaleString()}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Mobile: Paid Out + Security Hold row */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
                <div className="group bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-charcoal/5">
                            <CreditCard className="w-3.5 h-3.5 text-charcoal/40" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/30 mb-1">Paid Out</p>
                    <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">₱{summary.totalPaidOut.toLocaleString()}</h3>
                    {summary.pendingPayouts > 0 && (
                        <div className="flex items-center gap-1 mt-2 px-2 py-0.5 bg-orange-50 rounded-full w-fit">
                            <Clock className="w-2.5 h-2.5 text-orange-500" />
                            <span className="text-[8px] font-black uppercase text-orange-600 tracking-wider">₱{summary.pendingPayouts.toLocaleString()} pending</span>
                        </div>
                    )}
                </div>
                <div className="group bg-white p-4 rounded-2xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-charcoal/5">
                            <Clock className="w-3.5 h-3.5 text-charcoal/40" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal/30 mb-1">Security Hold</p>
                    <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">₱{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-[9px] font-black text-charcoal/30 mt-2 flex items-center gap-1.5 uppercase tracking-tight">
                        <ShieldCheck className="w-3 h-3 opacity-50" />
                        24h hold
                    </p>
                </div>
            </div>

            {/* Desktop: original grid layout */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Gross Earnings Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-charcoal/5 group-hover:bg-charcoal/10 transition-colors">
                            <TrendingUp className="w-4 h-4 text-charcoal/60" />
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Gross Earnings</p>
                    <h3 className="text-2xl font-bold text-charcoal">₱{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Compensation Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1 leading-tight">Cancellation Comp.</p>
                    <h3 className="text-2xl font-bold text-green-600">₱{summary.totalCompensation.toLocaleString()}</h3>
                </div>

                {/* Penalty Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
                            <TrendingUp className="w-4 h-4 text-red-600" transform="rotate(180)" />
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1 leading-tight">Penalty</p>
                    <h3 className="text-2xl font-bold text-red-600">-₱{summary.totalPenalty.toLocaleString()}</h3>
                </div>

                {/* Net Earnings Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border-2 border-forest/20 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 bg-forest/5 rounded-bl-xl">
                        <ShieldCheck className="w-3 h-3 text-forest/40" />
                    </div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-forest/10 group-hover:bg-forest/20 transition-colors">
                            <TrendingUp className="w-4 h-4 text-forest" />
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-forest/60 mb-1">Net Earnings</p>
                    <h3 className="text-2xl font-bold text-charcoal">₱{summary.netEarnings.toLocaleString()}</h3>
                </div>

                {/* Available Balance Card */}
                <div className="group p-0.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-[#BC926E] via-[#A67B5B] to-[#8E6548] overflow-hidden col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-1">
                    <div className="p-3 sm:p-4 h-full flex flex-col justify-between relative">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Wallet className="w-24 h-24 text-white" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                                        <Wallet className="w-4 h-4 text-white" />
                                    </div>
                                    <button
                                        onClick={() => setShowInfoModal(true)}
                                        className="text-white/60 hover:text-white transition-colors p-1"
                                        title="Wallet Rules"
                                    >
                                        <Info className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 items-end">
                                    <PayoutRequestModal
                                        studioId={studioId}
                                        availableBalance={summary.availableBalance}
                                        payoutApprovalStatus={summary.payoutApprovalStatus}
                                    />
                                    <button
                                        onClick={() => setShowTopUpModal(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md border border-white/10"
                                    >
                                        <ArrowUpRight className="w-3 h-3" />
                                        Top-Up
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-1">Available to Withdraw</p>
                            <h3 className="text-3xl font-black text-white drop-shadow-sm tracking-tight">₱{summary.availableBalance.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                {/* Paid Out Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-charcoal/5 group-hover:bg-charcoal/10 transition-colors">
                            <CreditCard className="w-4 h-4 text-charcoal/60" />
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Paid Out</p>
                    <h3 className="text-2xl font-bold text-charcoal">₱{summary.totalPaidOut.toLocaleString()}</h3>
                    {summary.pendingPayouts > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-orange-50 rounded-full w-fit">
                            <Clock className="w-2.5 h-2.5 text-orange-500" />
                            <span className="text-[9px] font-black uppercase text-orange-600 tracking-wider">
                                ₱{summary.pendingPayouts.toLocaleString()} pending
                            </span>
                        </div>
                    )}
                </div>

                {/* Security Hold Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-charcoal/5 group-hover:bg-charcoal/10 transition-colors">
                            <Clock className="w-4 h-4 text-charcoal/60" />
                        </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Security Hold</p>
                    <h3 className="text-2xl font-bold text-charcoal">₱{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-[9px] font-bold uppercase text-charcoal/40 mt-1 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        24h hold period
                    </p>
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
