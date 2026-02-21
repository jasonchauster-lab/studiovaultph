'use client'

import { useState } from 'react'
import { forgotPassword } from '@/app/auth/actions'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl border border-cream-200 shadow-sm">
                <Link href="/login" className="flex items-center text-sm text-charcoal-600 hover:text-charcoal-900 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Login
                </Link>

                <h1 className="text-2xl font-serif text-charcoal-900 mb-2 text-center">Reset Password</h1>
                <p className="text-charcoal-600 text-center mb-6 text-sm">Enter your email and we'll send you a link to reset your password.</p>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="w-full px-4 py-2 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 outline-none"
                        />
                    </div>

                    {message && (
                        <div className={`text-sm p-3 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-charcoal-900 text-white py-2 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Link'}
                    </button>
                </form>
            </div>
        </div>
    )
}
