'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/auth/actions'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

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
                <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                    <Image
                        src="/auth-bg.png"
                        alt="Pilates Studio"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
                </div>

                {/* Right Side: Success Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 bg-white overflow-y-auto">
                    <div className="w-full max-w-lg text-center">
                        <div className="flex justify-center mb-8">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-serif text-charcoal-900 mb-6">Password Updated</h1>
                        <p className="text-charcoal-500 text-lg mb-10 leading-relaxed max-w-md mx-auto">
                            Your password has been successfully reset. You can now use your new credentials to sign in to the Vault.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-charcoal-400 font-medium animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Redirecting to sign in...</span>
                        </div>
                    </div>
                </div>
            </div>
        )
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
                    <h2 className="text-4xl lg:text-5xl font-serif mb-6 leading-tight">Secure Your Session</h2>
                    <p className="text-lg text-white/90 font-light max-w-sm leading-relaxed">
                        Setting a strong password is the first step towards protecting your personal practice data.
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 bg-white overflow-y-auto relative">
                {/* Back to Home Button */}
                <Link
                    href="/"
                    className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-2 text-charcoal-600 hover:text-charcoal-900 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform border border-cream-200 rounded-lg p-1" />
                    <span className="text-sm font-bold">Back to Home</span>
                </Link>

                <div className="w-full max-w-lg">
                    <div className="flex flex-col items-center mb-12">
                        <div className="mb-10">
                            <Image src="/logo.png" alt="StudioVault Logo" width={128} height={128} className="w-32 h-32 object-contain" />
                        </div>

                        <div className="text-center">
                            <h2 className="text-charcoal-800 text-sm font-bold uppercase tracking-[0.2em] mb-3">Welcome to the Vault</h2>
                            <h1 className="text-4xl font-serif text-charcoal-900 mb-4">Update Password</h1>
                            <p className="text-charcoal-800 text-base max-w-sm mx-auto font-medium">
                                Please enter your new password below to secure your account.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-charcoal-800 mb-2">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full px-5 py-3.5 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-charcoal-800 mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="w-full px-5 py-3.5 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-300"
                            />
                        </div>

                        {error && (
                            <div className="text-sm p-4 rounded-xl bg-red-50 text-red-700 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-charcoal-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-charcoal-800 active:scale-[0.99] transition-all flex justify-center shadow-lg hover:shadow-xl disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : 'Update Password'}
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
