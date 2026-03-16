import Link from 'next/link'
import { ShieldCheck, Clock, AlertCircle, Wallet, ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-off-white font-sans text-charcoal py-16 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-3 text-slate hover:text-charcoal transition-all mb-10 group text-[10px] font-bold uppercase tracking-[0.3em]"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <div className="bg-white rounded-xl p-10 md:p-20 border border-border-grey shadow-tight overflow-hidden relative">
                    <h1 className="text-4xl md:text-5xl font-serif text-charcoal mb-4 tracking-tighter">Terms of Service</h1>
                    <p className="text-[10px] font-bold text-slate uppercase tracking-[0.4em] mb-16">Studio Vault PH: Partner Cancellation & Wallet Policy</p>

                    <div className="space-y-12">
                        {/* Section 1 */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-forest rounded-lg shadow-tight">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-serif text-charcoal">1. The 24-Hour Strict Cancellation Rule</h2>
                            </div>
                            <p className="text-slate leading-relaxed font-medium">
                                Studio Vault PH enforces a strict 24-hour cancellation policy to protect the time and revenue of all partners. Any session cancelled less than 24 hours before the scheduled start time is considered a <span className="font-bold text-forest uppercase tracking-widest text-[11px]">"Late Cancellation"</span> and is subject to automated penalties.
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-6 border-l-2 border-forest/20 pl-10 ml-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-serif text-charcoal">2. Instructor-Initiated Late Cancellations</h2>
                            </div>
                            <p className="text-slate font-medium">
                                If an Instructor cancels a confirmed booking within the 24-hour window:
                            </p>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center shrink-0 mt-1">
                                        <ShieldCheck className="w-4 h-4 text-forest" />
                                    </div>
                                    <span className="text-slate font-medium">The Client will receive a <span className="font-bold text-charcoal">100% refund</span> to their Studio Vault Wallet.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center shrink-0 mt-1">
                                        <AlertCircle className="w-4 h-4 text-forest" />
                                    </div>
                                    <span className="text-slate font-medium">The Instructor’s Wallet will be <span className="font-bold text-charcoal">immediately deducted</span> the cost of the Studio Rental Fee. This fee is credited to the Studio to compensate for the lost rental time.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-6 border-l-2 border-charcoal/10 pl-10 ml-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-serif text-charcoal">3. Studio-Initiated Late Cancellations</h2>
                            </div>
                            <p className="text-slate font-medium">
                                If a Studio cancels a confirmed booking within the 24-hour window (e.g., due to equipment failure or double-booking):
                            </p>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center shrink-0 mt-1">
                                        <ShieldCheck className="w-4 h-4 text-forest" />
                                    </div>
                                    <span className="text-slate font-medium">The Client will receive a <span className="font-bold text-charcoal">100% refund</span> to their Studio Vault Wallet.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center shrink-0 mt-1">
                                        <AlertCircle className="w-4 h-4 text-forest" />
                                    </div>
                                    <span className="text-slate font-medium">The Studio’s Wallet will be deducted a <span className="font-bold text-charcoal">Displacement Fee</span> (equal to the Studio Rental Rate for that session). This fee is credited to the Instructor’s Wallet to compensate for lost income and schedule disruption.</span>
                                </li>
                                <li className="flex items-start gap-4 italic text-slate text-xs uppercase tracking-widest font-bold">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-slate/40" />
                                    <span>Note: Accumulating 3 Late Cancellations within a 30-day period may result in the temporary suspension of the Studio's listing.</span>
                                </li>
                            </ul>
                        </section>

                        {/* Section 4 */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-forest rounded-lg shadow-tight">
                                    <Wallet className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-serif text-charcoal">4. Negative Wallet Balances & Restrictions</h2>
                            </div>
                            <p className="text-slate leading-relaxed font-medium">
                                If penalty deductions cause a Partner's Studio Vault Wallet to drop below <span className="font-bold text-charcoal">₱0.00</span>, the account will carry a negative balance.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-off-white p-8 rounded-lg border border-border-grey shadow-tight">
                                    <h3 className="text-[10px] font-bold text-charcoal uppercase tracking-[0.2em] mb-4">Auto-Recovery</h3>
                                    <p className="text-[13px] text-slate font-medium leading-relaxed">Any future earnings will be automatically applied to the negative balance until the debt to the platform is cleared.</p>
                                </div>
                                <div className="bg-red-50 p-8 rounded-lg border border-red-100 shadow-tight">
                                    <h3 className="text-[10px] font-bold text-red-900 uppercase tracking-[0.2em] mb-4">Restrictions</h3>
                                    <p className="text-[13px] text-red-700 font-medium leading-relaxed">While an account holds a negative balance, the "Request Payout" feature is disabled, and the Partner cannot book new sessions.</p>
                                </div>
                            </div>

                            <div className="bg-forest text-white p-10 rounded-lg shadow-tight relative overflow-hidden">
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                    <div>
                                        <h3 className="text-xl font-serif mb-4 italic">Manual Settlement</h3>
                                        <p className="text-white/60 text-sm max-w-lg leading-relaxed">Partners may contact Admin to settle their negative balance directly via GCash or Bank Transfer to restore full account privileges.</p>
                                    </div>
                                    <Link
                                        href="/support"
                                        className="bg-forest text-white px-10 py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all whitespace-nowrap shadow-tight"
                                    >
                                        Contact Support
                                    </Link>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="mt-20 pt-10 border-t border-border-grey text-center">
                        <p className="text-slate text-[10px] uppercase font-bold tracking-[0.2em]">
                            Last updated: March 10, 2026.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
