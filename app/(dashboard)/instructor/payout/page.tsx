import { getInstructorEarnings, getPayoutHistory } from '../actions'
import PayoutForm from './PayoutForm'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'

export default async function PayoutPage() {
    const { availableBalance, error: balanceError } = await getInstructorEarnings()
    const { payouts, error: historyError } = await getPayoutHistory()

    if (balanceError) {
        return <div className="p-8">Error loading wallet information.</div>
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link href="/instructor/earnings" className="inline-flex items-center gap-2 text-charcoal-600 hover:text-charcoal-900 mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Earnings
            </Link>

            <PayoutForm availableBalance={availableBalance || 0} />

            <div className="mt-12">
                <h3 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-charcoal-500" />
                    Payout History
                </h3>

                <div className="bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-cream-50 text-charcoal-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Method</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {payouts && payouts.length > 0 ? (
                                payouts.map((payout: any) => (
                                    <tr key={payout.id} className="hover:bg-cream-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-charcoal-600">
                                            {new Date(payout.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-charcoal-900 capitalize">
                                            {payout.payment_method}
                                            <span className="block text-xs text-charcoal-400">
                                                {payout.payment_method === 'bank'
                                                    ? payout.payment_details?.bankName
                                                    : payout.payment_details?.accountNumber}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${payout.status === 'processed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : payout.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }
                                            `}>
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-right text-charcoal-900">
                                            ₱{payout.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-charcoal-500 text-sm">
                                        No payout requests found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
