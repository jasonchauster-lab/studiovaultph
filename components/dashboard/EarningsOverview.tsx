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
                                className="w-full py-2 bg-charcoal-900 text-white rounded-lg font-bold hover:bg-charcoal-800 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                {/* Gross Earnings Card */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-tight">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(188,146,110,0.1)' }}>
                            <TrendingUp className="w-4 h-4" style={{ color: '#BC926E' }} />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Gross Earnings</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Compensation Card */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-tight">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1 leading-tight">Cancellation Comp.</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-green-600">₱{summary.totalCompensation.toLocaleString()}</h3>
                </div>

                {/* Penalty Card */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-tight">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <TrendingUp className="w-4 h-4 text-red-600" transform="rotate(180)" />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1 leading-tight">Penalty</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-red-600">-₱{summary.totalPenalty.toLocaleString()}</h3>
                </div>

                {/* Net Earnings Card */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-tight">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-1.5 rounded-lg" style={{ background: 'rgba(188,146,110,0.1)' }}>
                            <TrendingUp className="w-4 h-4" style={{ color: '#BC926E' }} />
                        </div>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Net Earnings</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.netEarnings.toLocaleString()}</h3>
                </div>

                {/* Available Balance Card */}
                <div className="p-3 sm:p-4 rounded-xl shadow-tight text-white flex flex-col justify-between" style={{ background: '#BC926E' }}>
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                    <Wallet className="w-4 h-4 text-white" />
                                </div>
                                <button
                                    onClick={() => setShowInfoModal(true)}
                                    className="text-white/80 hover:text-white transition-colors p-1"
                                    title="Wallet Rules"
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5 items-end overflow-hidden">
                                <PayoutRequestModal
                                    studioId={studioId}
                                    availableBalance={summary.availableBalance}
                                    payoutApprovalStatus={summary.payoutApprovalStatus}
                                />
                                <button
                                    onClick={() => setShowTopUpModal(true)}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[9px] font-bold transition-colors whitespace-nowrap"
                                >
                                    <ArrowUpRight className="w-3 h-3" />
                                    Top-Up
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Available</p>
                        <h3 className="text-lg sm:text-2xl font-bold text-white">₱{summary.availableBalance.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Paid Out Card */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-tight">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Paid Out</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.totalPaidOut.toLocaleString()}</h3>
                    {summary.pendingPayouts > 0 && (
                        <p className="text-[9px] font-bold uppercase text-orange-500 mt-1">
                            ₱{summary.pendingPayouts.toLocaleString()} pending
                        </p>
                    )}
                </div>

                {/* Security Hold Card */}
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-cream-200 shadow-tight border-l-4" style={{ borderLeftColor: '#BC926E' }}>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">Security Hold</p>
                    <h3 className="text-lg sm:text-2xl font-bold text-charcoal">₱{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-[9px] font-bold uppercase text-charcoal/30 mt-1">24h hold period</p>
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
