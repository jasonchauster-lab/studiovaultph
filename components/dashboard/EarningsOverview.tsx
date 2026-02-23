import { DollarSign, CreditCard, Wallet, Clock } from 'lucide-react'
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
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            Lifetime
                        </span>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Total Earnings</p>
                    <h3 className="text-2xl font-bold text-charcoal-900">₱{summary.totalEarnings.toLocaleString()}</h3>
                </div>

                {/* Paid Out Card */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Total Paid Out</p>
                    <h3 className="text-2xl font-bold text-charcoal-900">₱{summary.totalPaidOut.toLocaleString()}</h3>
                    {summary.pendingPayouts > 0 && (
                        <p className="text-xs text-orange-500 mt-1">
                            + ₱{summary.pendingPayouts.toLocaleString()} pending
                        </p>
                    )}
                </div>

                {/* Available Balance Card */}
                <div className="bg-charcoal-900 p-6 rounded-xl border border-charcoal-800 shadow-sm text-ivory-50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-charcoal-800 rounded-lg">
                            <Wallet className="w-6 h-6 text-cream-50" />
                        </div>
                        <PayoutRequestModal
                            studioId={studioId}
                            availableBalance={summary.availableBalance}
                            payoutApprovalStatus={summary.payoutApprovalStatus}
                        />
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Available Balance</p>
                    <h3 className="text-2xl font-bold text-white">₱{summary.availableBalance.toLocaleString()}</h3>
                </div>

                {/* Security Hold (Hold for 24h) */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm border-l-4 border-l-amber-400">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-sm text-charcoal-500 mb-1">Security Hold (24h)</p>
                    <h3 className="text-2xl font-bold text-charcoal-900">₱{summary.pendingBalance.toLocaleString()}</h3>
                    <p className="text-xs text-charcoal-400 mt-1">Unlocking within 24 hours</p>
                </div>
            </div>
        </div>
    )
}
