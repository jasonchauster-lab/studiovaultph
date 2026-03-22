import { getInstructorEarnings, getPayoutHistory } from '../actions'
import PayoutForm from './PayoutForm'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/server'

export default async function PayoutPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // Parallelize data fetching for performance
    const [earningsRes, historyRes] = await Promise.all([
        getInstructorEarnings(),
        getPayoutHistory()
    ]);

    const { availableBalance, error: balanceError } = earningsRes;
    const { payouts, error: historyError } = historyRes;

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

            <PayoutForm availableBalance={availableBalance || 0} userEmail={user?.email} />

            <div className="mt-12">
                <h3 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-charcoal-500" />
                    Payout History
                </h3>

                <div className="space-y-3">
                    {payouts && payouts.length > 0 ? (
                        payouts.map((payout: any) => (
                            <div key={payout.id} className="atelier-card !p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group transition-all duration-500 hover:border-forest/30">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center justify-center shrink-0 group-hover:bg-forest/5 transition-colors">
                                        <span className="text-[10px] font-black text-burgundy uppercase tracking-widest leading-none mb-1">
                                            {new Date(payout.created_at).toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                        <span className="text-2xl font-serif text-charcoal leading-none">
                                            {new Date(payout.created_at).getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-black text-charcoal uppercase tracking-tight">
                                                {payout.payment_method} Transfer
                                            </span>
                                            <span className={clsx(
                                                "text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border shadow-tight transition-all",
                                                payout.status === 'processed' ? "bg-forest/5 text-forest border-forest/20" : 
                                                payout.status === 'pending' ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-burgundy/5 text-burgundy border-burgundy/20"
                                            )}>
                                                {payout.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate font-bold uppercase tracking-[0.2em] leading-relaxed max-w-[200px] sm:max-w-md">
                                            {payout.payment_method === 'bank'
                                                ? payout.payment_details?.bankName
                                                : payout.payment_details?.accountNumber}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center sm:block sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-outline-variant/10">
                                    <span className="sm:hidden text-[9px] font-black text-slate uppercase tracking-[0.3em]">Amount</span>
                                    <span className="text-2xl font-serif text-charcoal tracking-tighter group-hover:text-forest transition-colors">
                                        ₱{payout.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="atelier-card !p-12 text-center text-slate font-bold uppercase tracking-[0.3em] bg-surface-container-low border-dashed">
                            No payout requests found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
