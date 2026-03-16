import Link from 'next/link'
import { ArrowLeft, MessageCircle, ChevronDown } from 'lucide-react'

const faqs = [
    {
        question: 'How do I book an instructor?',
        answer: 'Browse instructors on the Instructors page, select one you like, choose a date and time that works for both of you, and submit your booking request. You\'ll receive a confirmation once the instructor accepts.'
    },
    {
        question: 'How does the wallet work?',
        answer: 'Your Studio Vault wallet holds credits used to pay for bookings. You can top up via GCash or BPI by uploading a payment screenshot. Funds are credited once an admin verifies your proof of payment.'
    },
    {
        question: 'How long does a top-up take to reflect?',
        answer: 'Top-ups are typically approved within 24 hours after you submit your payment proof. You\'ll receive an email notification once it\'s credited to your wallet.'
    },
    {
        question: 'Can I cancel a booking?',
        answer: 'Yes. You can cancel a booking from your Sessions page. Cancellation policies vary — please review the terms before cancelling, as charges may apply depending on how close to the session date you cancel.'
    },
    {
        question: 'How do I become an instructor on Studio Vault?',
        answer: 'Create an account and select "Instructor" as your role during onboarding. Complete your profile, add your certifications, and set your availability. Our team reviews instructor profiles for verification.'
    },
    {
        question: 'What if I have a billing or payment issue?',
        answer: 'If your wallet balance looks incorrect or a payment wasn\'t credited, please chat with us using the button in your dashboard. Include your transaction reference number so we can resolve it quickly.'
    },
    {
        question: 'How do instructor payouts work?',
        answer: 'Earnings from completed sessions are held in your pending balance for 24 hours after session completion, then moved to your available balance. You can request a payout from your Earnings page.'
    },
    {
        question: 'Is my personal information safe?',
        answer: 'Yes. We take privacy seriously. Your data is protected and never sold to third parties. See our Privacy Policy for full details.'
    },
]

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-cream-50">
            {/* Header */}
            <div className="bg-forest text-white px-6 py-16 text-center">
                <div className="max-w-2xl mx-auto">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.3em] transition-all mb-10 group"
                    >
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                        Back to Home
                    </Link>
                    <h1 className="text-4xl sm:text-5xl font-serif tracking-tighter mb-4">Support & FAQ</h1>
                    <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
                        Find answers to common questions below. Still need help? Chat with us directly from your dashboard.
                    </p>
                </div>
            </div>

            {/* Chat CTA */}
            <div className="max-w-2xl mx-auto px-6 -mt-6">
                <div className="bg-white rounded-2xl border border-cream-200 shadow-lg p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <div className="w-12 h-12 bg-rose-gold/10 rounded-xl flex items-center justify-center shrink-0">
                        <MessageCircle className="w-6 h-6 text-rose-gold" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-charcoal text-sm">Have a question not covered here?</p>
                        <p className="text-charcoal/50 text-xs mt-0.5">Log in to your account and use the chat button — our team is ready to help.</p>
                    </div>
                    <Link
                        href="/login"
                        className="shrink-0 bg-forest text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 rounded-xl hover:bg-charcoal/80 transition-all"
                    >
                        Chat with Us
                    </Link>
                </div>
            </div>

            {/* FAQ */}
            <div className="max-w-2xl mx-auto px-6 py-16 space-y-3">
                <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-[0.4em] mb-8">Frequently Asked Questions</p>
                {faqs.map((faq, i) => (
                    <details key={i} className="group bg-white rounded-2xl border border-cream-200 overflow-hidden">
                        <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none hover:bg-cream-50 transition-colors">
                            <span className="font-semibold text-charcoal text-sm">{faq.question}</span>
                            <ChevronDown className="w-4 h-4 text-charcoal/40 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="px-6 pb-5 text-sm text-charcoal/60 leading-relaxed border-t border-cream-100 pt-4">
                            {faq.answer}
                        </div>
                    </details>
                ))}
            </div>

            {/* Footer */}
            <footer className="border-t border-cream-200 px-6 py-10">
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.3em]">
                    <span>© {new Date().getFullYear()} Studio Vault PH. All rights reserved.</span>
                    <div className="flex gap-6">
                        <Link href="/terms-of-service" className="hover:text-charcoal transition-colors">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-charcoal transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
