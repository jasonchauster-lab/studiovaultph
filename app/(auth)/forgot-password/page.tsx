'use client'

import { useState } from 'react'
import { forgotPassword } from '@/app/auth/actions'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        setMessage(null)

        const result = await forgotPassword(formData)

        if (result?.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: 'If an account exists, we sent a reset link to your email.' })
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row">
            {/* Left Side: Image */}
            <div className="hidden md:block md:w-1/2 relative">
                <Image
                    src="/auth-bg.png"
                    alt="Pilates Studio"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/40 via-transparent to-transparent" />

                <div className="absolute bottom-12 left-12 text-white max-w-lg z-10">
                    <h2 className="text-4xl font-serif mb-4">Reset Your Perspective</h2>
                    <p className="text-lg text-white/90 font-light max-w-md leading-relaxed">
                        Don't worry, even the best of us lose our focus sometimes. We'll help you get back to your practice.
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md">
                    <Link href="/login" className="inline-flex items-center text-sm text-charcoal-500 hover:text-charcoal-900 mb-10 transition-colors group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Sign In
                    </Link>

                    <div className="mb-10">
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-3">Reset Password</h1>
                        <p className="text-charcoal-500 text-sm">
                            Enter your email address and we'll send you a secure link to reset your password.
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="jane@example.com"
                                className="w-full px-4 py-3 border border-cream-200 bg-cream-50/30 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {message && (
                            <div className={`text-sm p-4 rounded-xl flex items-start gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-charcoal-900 text-white py-3.5 rounded-xl font-medium hover:bg-charcoal-800 active:scale-[0.98] transition-all flex justify-center shadow-sm"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Link'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
