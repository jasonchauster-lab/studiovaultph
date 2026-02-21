'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/auth/actions'
import { Loader2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
            <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-full max-w-md bg-white p-8 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-serif text-charcoal-900 mb-2">Password Updated</h1>
                    <p className="text-charcoal-500 mb-6">
                        Your password has been successfully reset. Redirecting you to login...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl border border-cream-200 shadow-sm">
                <h1 className="text-2xl font-serif text-charcoal-900 mb-2 text-center">
                    Update Password
                </h1>
                <p className="text-center text-charcoal-500 mb-6 text-sm">
                    Please enter your new password below.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 outline-none"
                        />
                    </div>

                    {error && (
                        <div className="text-sm p-3 rounded-md bg-red-50 text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-charcoal-900 text-white py-2 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
