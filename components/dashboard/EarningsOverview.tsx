import { TrendingUp, CreditCard, Wallet, Clock, Info, X, ShieldCheck, AlertCircle } from 'lucide-react'
import PayoutRequestModal from './PayoutRequestModal'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { topUpWallet } from '@/app/(dashboard)/customer/actions'
import { ArrowUpRight } from 'lucide-react'

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
    const [topUpAmount, setTopUpAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleTopUp = async () => {
        const amount = parseFloat(topUpAmount)
        if (isNaN(amount) || amount <= 0) return alert('Please enter a valid amount.')

        setIsSubmitting(true)
        const result = await topUpWallet(amount)
        setIsSubmitting(false)

        if (result.error) {
            alert(result.error)
        } else {
            router.push(`/customer/payment/top-up/${result.topUpId}`)
        }
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Gross Earnings Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(188,146,110,0.1)' }}>
                            <TrendingUp className="w-6 h-6" style={{ color: '#BC926E' }} />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Gross Earnings</p>
                    <h3 className="text-2xl font-bold text-charcoal-900"><strong>₱</strong>{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Compensation Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Cancellation Compensation</p>
                    <h3 className="text-2xl font-bold text-green-600"><strong>₱</strong>{summary.totalCompensation.toLocaleString()}</h3>
                </div>

                {/* Penalty Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <TrendingUp className="w-6 h-6 text-red-600" transform="rotate(180)" />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Cancellation Penalty</p>
                    <h3 className="text-2xl font-bold text-red-600"><strong>- ₱</strong>{summary.totalPenalty.toLocaleString()}</h3>
                </div>

                {/* Net Earnings Card */}
                <div className="bg-charcoal-900 p-6 rounded-xl shadow-lg border border-rose-gold/20 text-white">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(188,146,110,0.2)' }}>
                            <TrendingUp className="w-6 h-6 text-rose-gold" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-rose-gold px-2 py-1 rounded bg-rose-gold/10">
                            Calculation: Gross + Comp - Penalty
                        </span>
                    </div>
                    <p className="text-sm text-white/70 mb-1">Net Earnings</p>
                    <h3 className="text-2xl font-bold text-white"><strong>₱</strong>{summary.netEarnings.toLocaleString()}</h3>
                </div>

                {/* Available Balance Card */}
                <div className="p-6 rounded-xl shadow-sm text-white flex flex-col justify-between" style={{ background: '#BC926E' }}>
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <button
                                    onClick={() => setShowInfoModal(true)}
                                    className="text-white/80 hover:text-white transition-colors p-1"
                                    title="Wallet Rules"
                                >
                                    <Info className="w-5 h-5" />
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
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                                >
                                    <ArrowUpRight className="w-3 h-3" />
                                    Top-Up Wallet
                                </button>
                            </div>
                        </div>
                        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Available Balance</p>
                        <h3 className="text-2xl font-bold text-white"><strong>₱</strong>{summary.availableBalance.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Paid Out Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <p className="text-sm text-charcoal-500 mb-1">Total Paid Out</p>
                    <h3 className="text-2xl font-bold text-charcoal-900"><strong>₱</strong>{summary.totalPaidOut.toLocaleString()}</h3>
                    {summary.pendingPayouts > 0 && (
                        <p className="text-xs text-orange-500 mt-1">
                            + <strong>₱</strong>{summary.pendingPayouts.toLocaleString()} pending
                        </p>
                    )}
                </div>

                {/* Security Hold Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm border-l-4" style={{ borderLeftColor: '#BC926E' }}>
                    <p className="text-sm text-charcoal-500 mb-1">Security Hold (24h)</p>
                    <h3 className="text-2xl font-bold text-charcoal-900"><strong>₱</strong>{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-xs text-charcoal-400 mt-1">Unlocking within 24 hours</p>
                </div>
            </div>
        </div>
    )
}
