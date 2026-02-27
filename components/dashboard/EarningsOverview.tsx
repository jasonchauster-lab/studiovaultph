import { TrendingUp, CreditCard, Wallet, Clock } from 'lucide-react'
import PayoutRequestModal from './PayoutRequestModal'

interface EarningsOverviewProps {
    studioId: string
    summary: {
        totalEarnings: number
        totalPaidOut: number
        pendingPayouts: number
        availableBalance: number
        pendingBalance: number
        payoutApprovalStatus?: string
    }
}

export default function EarningsOverview({ studioId, summary }: EarningsOverviewProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Total Earnings Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(188,146,110,0.1)' }}>
                            <TrendingUp className="w-6 h-6" style={{ color: '#BC926E' }} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ color: '#BC926E', background: 'rgba(188,146,110,0.1)' }}>
                            Lifetime
                        </span>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Total Earnings</p>
                    <h3 className="text-2xl font-bold text-charcoal-900"><strong>₱</strong>{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Paid Out Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(188,146,110,0.1)' }}>
                            <CreditCard className="w-6 h-6" style={{ color: '#BC926E' }} />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Total Paid Out</p>
                    <h3 className="text-2xl font-bold text-charcoal-900"><strong>₱</strong>{summary.totalPaidOut.toLocaleString()}</h3>
                    {summary.pendingPayouts > 0 && (
                        <p className="text-xs text-orange-500 mt-1">
                            + <strong>₱</strong>{summary.pendingPayouts.toLocaleString()} pending
                        </p>
                    )}
                </div>

                {/* Available Balance Card */}
                <div className="p-6 rounded-xl shadow-sm text-white" style={{ background: '#BC926E' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <PayoutRequestModal
                            studioId={studioId}
                            availableBalance={summary.availableBalance}
                            payoutApprovalStatus={summary.payoutApprovalStatus}
                        />
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Available Balance</p>
                    <h3 className="text-2xl font-bold text-white"><strong>₱</strong>{summary.availableBalance.toLocaleString()}</h3>
                </div>

                {/* Security Hold (Hold for 24h) — Rose Gold border instead of amber */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm border-l-4" style={{ borderLeftColor: '#BC926E' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-lg" style={{ background: 'rgba(188,146,110,0.1)' }}>
                            <Clock className="w-6 h-6" style={{ color: '#BC926E' }} />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Security Hold (24h)</p>
                    <h3 className="text-2xl font-bold text-charcoal-900"><strong>₱</strong>{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-xs text-charcoal-400 mt-1">Unlocking within 24 hours</p>
                </div>
            </div>
        </div>
    )
}
