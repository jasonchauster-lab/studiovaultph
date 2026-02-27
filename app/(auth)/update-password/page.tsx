'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/auth/actions'
import { Loader2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('password', password)
            const result = await updatePassword(formData)

            if (result.success) {
                setSuccess(true)
                setTimeout(() => {
                    router.push('/login')
                }, 2000)
            } else {
                setError(result.error || 'Failed to update password')
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
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
                </div>

                {/* Right Side: Success Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white overflow-y-auto">
                    <div className="w-full max-w-md text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-4">Password Updated</h1>
                        <p className="text-charcoal-500 mb-8 leading-relaxed">
                            Your password has been successfully reset. You can now use your new password to sign in.
                        </p>
                        <p className="text-sm text-charcoal-400">
                            Redirecting you to sign in...
                        </p>
                    </div>
                </div>
            </div>
        )
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
                    <h2 className="text-4xl font-serif mb-4">Secure Your Session</h2>
                    <p className="text-lg text-white/90 font-light max-w-md leading-relaxed">
                        Setting a strong password is the first step towards protecting your personal practice data.
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="mb-10">
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-3">Update Password</h1>
                        <p className="text-charcoal-500 text-sm">
                            Please enter your new password below to secure your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-cream-200 bg-cream-50/30 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-cream-200 bg-cream-50/30 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        {error && (
                            <div className="text-sm p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 flex items-start gap-3">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-charcoal-900 text-white py-3.5 rounded-xl font-medium hover:bg-charcoal-800 active:scale-[0.98] transition-all flex justify-center shadow-sm"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
