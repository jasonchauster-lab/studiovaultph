import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import TopUpPaymentForm from '@/components/wallet/TopUpPaymentForm'
import ExpandableImage from '@/components/ui/ExpandableImage'
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react'
import Link from 'next/link'

export default async function TopUpPaymentPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Top-Up Request
    const { data: topUp, error } = await supabase
        .from('wallet_top_ups')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (error || !topUp) {
        console.error('Top-up Payment Page Fetch Error:', error)
        return notFound()
    }

    // If already approved or rejected, redirect back to wallet
    if (topUp.status !== 'pending' && topUp.payment_proof_url) {
        redirect('/customer/wallet')
    }

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/customer/wallet" className="inline-flex items-center text-charcoal-600 hover:text-charcoal-900 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Wallet
                </Link>

                <div className="bg-white rounded-3xl border border-cream-200 shadow-xl overflow-hidden">
                    <div className="bg-charcoal-900 p-8 text-center text-white relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Wallet className="w-24 h-24" />
                        </div>
                        <div className="w-16 h-16 bg-rose-gold text-white rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-lg">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-serif mb-2">Wallet Top-up</h1>
                        <p className="text-cream-50/70 max-w-sm mx-auto">
                            Complete your payment to credit funds to your available balance.
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200 mb-8 max-w-sm mx-auto text-center">
                            <span className="text-charcoal-500 text-sm uppercase tracking-widest block mb-1">Amount to Pay</span>
                            <span className="text-4xl font-serif text-charcoal-900">
                                ₱{topUp.amount?.toLocaleString() || '0.00'}
                            </span>
                        </div>

                        {/* Admin Payment Details */}
                        <div className="space-y-8 mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="text-center group">
                                    <p className="font-bold text-charcoal-900 mb-3 uppercase tracking-wider text-sm">GCash</p>
                                    <div className="bg-white p-3 rounded-2xl border border-cream-200 shadow-md group-hover:shadow-xl transition-all duration-300 inline-block hover:-translate-y-1">
                                        <ExpandableImage
                                            src="/gcash-qr.jpg"
                                            alt="GCash QR Code"
                                            className="w-48 h-48 rounded-lg"
                                        />
                                        <div className="mt-3 py-1 px-3 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                                            Scan with GCash App
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center group">
                                    <p className="font-bold text-charcoal-900 mb-3 uppercase tracking-wider text-sm">BPI</p>
                                    <div className="bg-white p-3 rounded-2xl border border-cream-200 shadow-md group-hover:shadow-xl transition-all duration-300 inline-block hover:-translate-y-1">
                                        <ExpandableImage
                                            src="/bpi-qr.jpg"
                                            alt="BPI QR Code"
                                            className="w-48 h-48 rounded-lg"
                                        />
                                        <div className="mt-3 py-1 px-3 bg-red-50 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                                            Scan with BPI App
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-charcoal-900/5 p-4 rounded-xl border border-charcoal-900/10 text-center">
                                <p className="text-xs text-charcoal-500 italic">
                                    "Once payment is sent, please take a screenshot of your receipt/confirmation and upload it below for verification."
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-cream-100 pt-8">
                            <TopUpPaymentForm
                                topUpId={topUp.id}
                                amount={topUp.amount}
                            />
                        </div>
                    </div>
                </div>

                <p className="text-center text-charcoal-400 text-xs mt-8">
                    Security Policy: All transactions are encrypted and verified by Admin.
                    Top-ups typically reflect within 24 hours of receipt approval.
                </p>
            </div>
        </div>
    )
}
