'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'

function LoginContent() {
    const searchParams = useSearchParams()
    const initialMode = searchParams.get('mode') === 'signup'
    const initialRole = searchParams.get('role') || 'customer'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [isSignUp, setIsSignUp] = useState(initialMode)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!isValidEmail(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' })
            return
        }

        setLoading(true)
        setMessage(null)

        if (isSignUp) {
            // HANDLE SIGN UP
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        email: email,
                        role: initialRole
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/verified`
                }
            })

            if (error) {
                console.error('Sign-up error:', error)
                const authError = error as any
                setMessage({
                    type: 'error',
                    text: `${authError.message}${authError.details ? ' - ' + authError.details : ''}${authError.hint ? ' (Hint: ' + authError.hint + ')' : ''}`
                })
                setLoading(false)
            } else {
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' })
                setLoading(false)
            }

        } else {
            // HANDLE LOGIN
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setMessage({ type: 'error', text: error.message })
                setLoading(false)
            } else {
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    // Check credentials/role
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single()

                    if (profile) {
                        switch (profile.role) {
                            case 'admin':
                                router.push('/admin')
                                break
                            case 'instructor':
                                router.push('/instructor')
                                break
                            case 'studio':
                                router.push('/studio')
                                break
                            case 'customer':
                                router.push('/customer') // Or discovery
                                break
                            default:
                                router.push('/welcome')
                        }
                        setMessage({ type: 'success', text: `Welcome back! Redirecting to ${profile.role} dashboard...` })
                    } else {
                        // Fallback logic if no profile (shouldn't happen usually)
                        const { data: studio } = await supabase
                            .from('studios')
                            .select('id')
                            .eq('owner_id', user.id)
                            .single()

                        if (studio) {
                            router.push('/studio')
                        } else {
                            router.push('/welcome')
                        }
                    }
                } else {
                    router.push('/welcome')
                }
                router.refresh()
            }
        }
    }



    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row">
            {/* Left Side: Image - Hidden on mobile, full height on desktop */}
            <div className="hidden md:block md:w-1/2 relative">
                <Image
                    src="/auth-bg.png"
                    alt="Pilates Studio"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Subtle overlay for better text readability and premium feel */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/40 via-transparent to-transparent" />

                <div className="absolute bottom-12 left-12 text-white max-w-lg z-10">
                    <h2 className="text-4xl font-serif mb-4">Elevate Your Studio Management</h2>
                    <p className="text-lg text-white/90 font-light max-w-md leading-relaxed">
                        Experience the art of seamless booking and client care with StudioVault's premium platform.
                    </p>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Link href="/">
                            <Image src="/logo.png" alt="StudioVault Logo" width={64} height={64} className="w-16 h-16 object-contain" />
                        </Link>
                    </div>

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-3">
                            {isSignUp ? 'Create an Account' : 'Welcome Back'}
                        </h1>
                        <p className="text-charcoal-500 text-sm">
                            {isSignUp ? 'Join our community of pilates enthusiasts.' : 'Please enter your details to access your dashboard.'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                    placeholder="e.g. Jane Doe"
                                    className="w-full px-4 py-3 border border-cream-200 bg-cream-50/30 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="jane@example.com"
                                className="w-full px-4 py-3 border border-cream-200 bg-cream-50/30 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-charcoal-700">Password</label>
                                {!isSignUp && (
                                    <Link href="/forgot-password" gap-2 className="text-xs text-charcoal-500 hover:text-charcoal-900 transition-colors">
                                        Forgot password?
                                    </Link>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
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
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Create Account' : 'Sign In')}
                        </button>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-cream-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-wider">
                                <span className="px-4 bg-white text-charcoal-400">Or</span>
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp)
                                    setMessage(null)
                                    setFullName('')
                                    setEmail('')
                                    setPassword('')
                                }}
                                className="text-charcoal-600 hover:text-charcoal-900 font-medium text-sm transition-colors"
                            >
                                {isSignUp ? (
                                    <>Already have an account? <span className="text-charcoal-900 underline underline-offset-4 font-semibold">Sign In</span></>
                                ) : (
                                    <>Don't have an account? <span className="text-charcoal-900 underline underline-offset-4 font-semibold">Create one</span></>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
                <Loader2 className="animate-spin w-8 h-8 text-charcoal-400" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
