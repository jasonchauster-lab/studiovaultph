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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Gross Earnings Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-charcoal/5 group-hover:bg-charcoal/10 transition-colors">
                            <TrendingUp className="w-4 h-4 text-charcoal/60" />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Gross Earnings</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Compensation Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1 leading-tight">Cancellation Comp.</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-green-600">₱{summary.totalCompensation.toLocaleString()}</h3>
                </div>

                {/* Penalty Card */}
                <div className="group bg-white p-3 sm:p-4 rounded-2xl border border-cream-200 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
                            <TrendingUp className="w-4 h-4 text-red-600" transform="rotate(180)" />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1 leading-tight">Penalty</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-red-600">-₱{summary.totalPenalty.toLocaleString()}</h3>
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
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-forest/60 mb-1">Net Earnings</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.netEarnings.toLocaleString()}</h3>
                </div>

                {/* Available Balance Card */}
                <div className="group p-0.5 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-[#BC926E] via-[#A67B5B] to-[#8E6548] overflow-hidden col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-1">
                    <div className="p-3 sm:p-4 h-full flex flex-col justify-between relative">
                        {/* Background subtle decoration */}
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
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/70 mb-1">Available to Withdraw</p>
                            <h3 className="text-xl sm:text-3xl font-black text-white drop-shadow-sm tracking-tight">₱{summary.availableBalance.toLocaleString()}</h3>
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
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Paid Out</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.totalPaidOut.toLocaleString()}</h3>
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
                <div className="group bg-cream-50/50 p-3 sm:p-4 rounded-2xl border-2 border-dashed border-cream-300 shadow-tight hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-xl bg-cream-200/50 group-hover:bg-cream-200 transition-colors">
                            <Clock className="w-4 h-4 text-charcoal/40" />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Security Hold</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal/60 tracking-tight">₱{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-[9px] font-bold uppercase text-charcoal/30 mt-1 flex items-center gap-1">
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
