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
            <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                <Image
                    src="/auth-bg.png"
                    alt="Pilates Studio"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />

                <div className="relative p-16 text-white z-10">
                    <h2 className="text-4xl lg:text-5xl font-serif mb-6 leading-tight">Reset Your Perspective</h2>
                    <p className="text-lg text-white/90 font-light max-w-sm leading-relaxed">
                        Don't worry, even the best of us lose our focus sometimes. We'll help you get back to your practice.
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 bg-white overflow-y-auto">
                <div className="w-full max-w-lg">
                    <Link href="/login" className="inline-flex items-center text-sm text-charcoal-500 hover:text-charcoal-900 mb-12 transition-colors group font-medium">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Sign In
                    </Link>

                    <div className="flex flex-col items-center mb-12">
                        <div className="mb-8">
                            <Image src="/logo.png" alt="StudioVault Logo" width={80} height={80} className="w-20 h-20 object-contain" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-charcoal-400 text-sm font-medium uppercase tracking-[0.2em] mb-2">Welcome to the Vault</h2>
                            <h1 className="text-4xl font-serif text-charcoal-900 mb-4">Reset Password</h1>
                            <p className="text-charcoal-500 text-base max-w-sm mx-auto">
                                Enter your email address and we'll send you a secure link to reset your password.
                            </p>
                        </div>
                    </div>

                    <form action={handleSubmit} className="grid grid-cols-1 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="jane@example.com"
                                className="w-full px-5 py-3.5 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-300"
                            />
                        </div>

                        {message && (
                            <div className={`text-sm p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-charcoal-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-charcoal-800 active:scale-[0.99] transition-all flex justify-center shadow-lg hover:shadow-xl disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="mt-16 pt-12 border-t border-cream-100 text-center text-xs text-charcoal-400">
                        Need help? Contact our <Link href="/support" className="underline hover:text-charcoal-900">Support Team</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
