import { getInstructorEarnings, getPayoutHistory } from '../actions'
import PayoutForm from './PayoutForm'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { clsx } from 'clsx'

export default async function PayoutPage() {
    const { availableBalance, error: balanceError } = await getInstructorEarnings()
    const { payouts, error: historyError } = await getPayoutHistory()

    if (balanceError) {
        return <div className="p-8">Error loading wallet information.</div>
    }

    return (
        <div className="py-6 sm:py-10 max-w-4xl mx-auto px-4 sm:px-8">
            <Link href="/instructor/earnings" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-burgundy hover:text-forest transition-all mb-8">
                <ArrowLeft className="w-3 h-3" />
                Back to Earnings
            </Link>

            <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900 mb-6 px-2">Payouts</h1>

            <PayoutForm availableBalance={availableBalance || 0} />

            <div className="mt-12">
                <h3 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-charcoal-500" />
                    Payout History
                </h3>

                <div className="space-y-3">
                    {payouts && payouts.length > 0 ? (
                        payouts.map((payout: any) => (
                            <div key={payout.id} className="earth-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-off-white border border-border-grey flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[10px] font-black text-burgundy uppercase">
                                            {new Date(payout.created_at).toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                        <span className="text-lg font-serif text-charcoal leading-none">
                                            {new Date(payout.created_at).getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-charcoal-900 capitalize">
                                                {payout.payment_method} Transfer
                                            </span>
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-border-grey shadow-tight",
                                                payout.status === 'processed' ? "bg-green-50 text-green-700" : 
                                                payout.status === 'pending' ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {payout.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-charcoal-400 uppercase tracking-widest">
                                            {payout.payment_method === 'bank'
                                                ? payout.payment_details?.bankName
                                                : payout.payment_details?.accountNumber}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center sm:block sm:text-right">
                                    <span className="sm:hidden text-[10px] font-black text-slate uppercase tracking-widest">Amount</span>
                                    <span className="text-lg font-serif text-burgundy font-bold">
                                        ₱{payout.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="earth-card p-8 text-center text-charcoal-400 text-sm">
                            No payout requests found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
