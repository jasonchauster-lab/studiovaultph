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
    userEmail?: string | null
    transactions?: any[]
}

import Sparkline from './Sparkline'

export default function EarningsOverview({ studioId, summary, userEmail, transactions = [] }: EarningsOverviewProps) {
    // Process transactions for sparkline
    const getTrendData = () => {
        if (!transactions || transactions.length === 0) return [0, 0, 0, 0, 0, 0, 0]
        
        const dailyTotals: { [key: string]: number } = {}
        transactions.forEach(tx => {
            const date = new Date(tx.date).toISOString().split('T')[0]
            if (tx.type !== 'Payout' && tx.total_amount > 0) {
                dailyTotals[date] = (dailyTotals[date] || 0) + tx.total_amount
            }
        })

        const sortedDates = Object.keys(dailyTotals).sort()
        const trend = sortedDates.slice(-7).map(date => dailyTotals[date])
        
        // Ensure at least 7 points for a nice curve
        while (trend.length < 7) trend.unshift(0)
        return trend
    }

    const trendData = getTrendData()

    const [showInfoModal, setShowInfoModal] = useState(false)
    const [showTopUpModal, setShowTopUpModal] = useState(false)
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)
    const router = useRouter()

    const handleTopUp = () => {
        setShowTopUpModal(true)
    }

    return (
        <div className="space-y-6">
            {/* Info Modal */}
            {/* ... (same as before) */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
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
                                <p className="text-sm text-charcoal-600 leading-relaxed">
                                    If penalty deductions cause your wallet to drop below ₱0.00, your account will carry a negative balance. While negative, your "Request Payout" feature is disabled and new bookings are restricted.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-charcoal font-bold text-sm uppercase tracking-wider">
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

            {/* Consolidated Stats Grid (Responsive) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Available Balance - Hero Card */}
                <div className="atelier-card p-6 sm:p-8 col-span-2 relative overflow-hidden group border-0 shadow-2xl !bg-forest text-white">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center border border-gold/30">
                                <Wallet className="w-6 h-6 text-gold-400" />
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
                        <div className="flex items-center gap-2">
                             <button
                                onClick={() => setShowTopUpModal(true)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                            >
                                Top-Up
                            </button>
                            <button
                                onClick={() => setIsPayoutModalOpen(true)}
                                disabled={summary.availableBalance <= 0}
                                className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    summary.availableBalance > 0 
                                    ? 'bg-gold hover:bg-gold-600 text-charcoal shadow-lg shadow-gold/20 active:scale-95' 
                                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                                }`}
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl sm:text-6xl font-serif text-gold-400 tracking-tighter">₱{summary.availableBalance.toLocaleString()}</span>
                            <span className="text-xs font-black text-gold/40 tracking-widest uppercase mb-2">PHP</span>
                        </div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">LIQUID BALANCE READY FOR PAYOUT</p>
                    </div>
                </div>

                <div className="atelier-card p-6 sm:p-8 group overflow-hidden relative">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-forest/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-forest" />
                            </div>
                            <span className="text-[10px] font-black text-forest/40 uppercase tracking-[0.2em]">NET YIELD</span>
                        </div>
                        <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                            <Sparkline data={trendData} color="#5C8A42" width={80} height={30} />
                        </div>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <h3 className="text-3xl font-serif text-charcoal tracking-tighter">₱{summary.netEarnings.toLocaleString()}</h3>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                            <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">REALIZED INCOME</p>
                        </div>
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
                        <h3 className="text-3xl font-serif text-burgundy/80 tracking-tighter">₱{summary.pendingBalance.toLocaleString()}</h3>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3 h-3 text-burgundy/30" />
                            <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-widestLeading">24H SAFETY PERIOD</p>
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
                        <h3 className="text-2xl font-serif text-charcoal">₱{summary.totalEarnings.toLocaleString()}</h3>
                        <div className="flex items-center gap-4 pt-1">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-serif text-forest">+₱{summary.totalCompensation.toLocaleString()}</span>
                                <span className="text-[7px] font-black text-forest/40 uppercase tracking-widest">COMPS</span>
                            </div>
                            <div className="w-px h-6 bg-border-grey" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-serif text-burgundy">-₱{summary.totalPenalty.toLocaleString()}</span>
                                <span className="text-[7px] font-black text-burgundy/40 uppercase tracking-widest">FEES</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Paid Out */}
                <div className="atelier-card p-6 sm:p-8 group">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-charcoal/5 flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5 text-charcoal" />
                        </div>
                        <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">CASHOUTS</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-serif text-charcoal">₱{summary.totalPaidOut.toLocaleString()}</h3>
                        {summary.pendingPayouts > 0 && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gold/10 rounded-full border border-gold/20">
                                <Clock className="w-2.5 h-2.5 text-gold-600" />
                                <span className="text-[8px] font-black uppercase text-gold-600 tracking-wider">
                                    ₱{summary.pendingPayouts.toLocaleString()} PENDING
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <PayoutRequestModal
                studioId={studioId}
                availableBalance={summary.availableBalance}
                payoutApprovalStatus={summary.payoutApprovalStatus}
                isOpen={isPayoutModalOpen}
                onClose={() => setIsPayoutModalOpen(false)}
                showTrigger={false}
                userEmail={userEmail}
            />
            {/* Top-Up Modal */}
            <TopUpModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
            />
        </div>
    )
}
