import Link from 'next/link'
import { ShieldCheck, Clock, AlertCircle, Wallet, ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-cream-50 font-sans text-charcoal-900 py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-charcoal-500 hover:text-charcoal-900 transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-cream-200 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cream-100/50 rounded-bl-full -mr-10 -mt-10" />

                    <h1 className="text-4xl md:text-5xl font-serif text-charcoal-900 mb-4">Terms of Service</h1>
                    <p className="text-xl text-charcoal-600 mb-12 font-serif italic">Studio Vault PH: Partner Cancellation & Wallet Policy</p>

                    <div className="space-y-12">
                        {/* Section 1 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-charcoal-900 rounded-lg">
                                    <Clock className="w-5 h-5 text-cream-200" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-charcoal-900">1. The 24-Hour Strict Cancellation Rule</h2>
                            </div>
                            <p className="text-charcoal-700 leading-relaxed">
                                Studio Vault PH enforces a strict 24-hour cancellation policy to protect the time and revenue of all partners. Any session cancelled less than 24 hours before the scheduled start time is considered a <span className="font-bold text-rose-gold">"Late Cancellation"</span> and is subject to automated penalties.
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-4 border-l-4 border-rose-gold/20 pl-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-serif font-bold text-charcoal-900">2. Instructor-Initiated Late Cancellations</h2>
                            </div>
                            <p className="text-charcoal-700 mb-4">
                                If an Instructor cancels a confirmed booking within the 24-hour window:
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                    <span>The Client will receive a <span className="font-bold">100% refund</span> to their Studio Vault Wallet.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-gold shrink-0 mt-0.5" />
                                    <span>The Instructor’s Wallet will be <span className="font-bold">immediately deducted</span> the cost of the Studio Rental Fee. This fee is credited to the Studio to compensate for the lost rental time.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-4 border-l-4 border-charcoal-900/10 pl-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-serif font-bold text-charcoal-900">3. Studio-Initiated Late Cancellations</h2>
                            </div>
                            <p className="text-charcoal-700 mb-4">
                                If a Studio cancels a confirmed booking within the 24-hour window (e.g., due to equipment failure or double-booking):
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                    <span>The Client will receive a <span className="font-bold">100% refund</span> to their Studio Vault Wallet.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-gold shrink-0 mt-0.5" />
                                    <span>The Studio’s Wallet will be deducted a <span className="font-bold">Displacement Fee</span> (equal to the Studio Rental Rate for that session). This fee is credited to the Instructor’s Wallet to compensate for lost income and schedule disruption.</span>
                                </li>
                                <li className="flex items-start gap-3 italic text-charcoal-500 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Note: Accumulating 3 Late Cancellations within a 30-day period may result in the temporary suspension of the Studio's listing.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Section 4 */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-charcoal-900 rounded-lg">
                                    <Wallet className="w-5 h-5 text-cream-200" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-charcoal-900">4. Negative Wallet Balances & Account Restrictions</h2>
                            </div>
                            <p className="text-charcoal-700 leading-relaxed">
                                If penalty deductions cause a Partner's Studio Vault Wallet to drop below <span className="font-bold">₱0.00</span>, the account will carry a negative balance.
                            </p>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200">
                                    <h3 className="font-bold text-charcoal-900 mb-2">Auto-Recovery</h3>
                                    <p className="text-sm text-charcoal-600">Any future earnings will be automatically applied to the negative balance until the debt to the platform is cleared.</p>
                                </div>
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                    <h3 className="font-bold text-red-900 mb-2">Restrictions</h3>
                                    <p className="text-sm text-red-700">While an account holds a negative balance, the "Request Payout" feature is disabled, and the Partner cannot book new sessions.</p>
                                </div>
                            </div>

                            <div className="bg-charcoal-900 text-cream-50 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 text-white/5 rotate-12">
                                    <ShieldCheck className="w-32 h-32" />
                                </div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">Manual Settlement</h3>
                                        <p className="text-cream-200/80 text-sm max-w-lg">Partners may contact Admin to settle their negative balance directly via GCash/Bank Transfer to restore full account privileges.</p>
                                    </div>
                                    <Link
                                        href="/support"
                                        className="bg-rose-gold text-white px-6 py-3 rounded-full font-bold hover:brightness-110 transition-all whitespace-nowrap shadow-xl"
                                    >
                                        Contact Support
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="mt-16 pt-8 border-t border-cream-200 text-center">
                        <p className="text-charcoal-400 text-sm italic">
                            By using the Studio Vault PH platform, you acknowledge and agree to be bound by these policies. Last updated: March 2026.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
