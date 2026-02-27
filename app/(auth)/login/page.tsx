'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Award, ArrowLeft } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'

function LoginContent() {
    const searchParams = useSearchParams()
    const initialMode = searchParams.get('mode') === 'signup'
    const initialRole = searchParams.get('role') || 'customer'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [role, setRole] = useState(initialRole)
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
            // Handle Sign-Up Duplicate Check
            // Supabase signUp returns success even if email exists (for security/enumeration protection)
            // We check our public profiles table to provide a better UX
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.toLowerCase())
                .maybeSingle()

            if (existingProfile) {
                setMessage({ type: 'error', text: 'An account with this email already exists. Please sign in instead.' })
                setLoading(false)
                return
            }

            // HANDLE SIGN UP
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        email: email,
                        role: role
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
            <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                <Image
                    src="/auth-bg.png"
                    alt="Pilates Studio"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Subtle overlay for better text readability and premium feel */}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />

                <div className="relative p-16 text-white z-10">
                    <h2 className="text-4xl lg:text-5xl font-serif mb-6 leading-tight">Elevate Your Studio Management</h2>
                    <p className="text-lg text-white/90 font-light max-w-sm leading-relaxed">
                        Experience the art of seamless booking and client care with StudioVault's premium platform.
                    </p>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 bg-white overflow-y-auto relative">
                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-2 text-charcoal-600 hover:text-charcoal-900 transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform border border-cream-200 rounded-lg p-1" />
                    <span className="text-sm font-bold">Back to Home</span>
                </Link>

                <div className="w-full max-w-lg">
                    <div className="flex flex-col items-center mb-12">
                        <Link href="/" className="flex items-center justify-center gap-0 group">
                            <Image src="/logo.png" alt="StudioVault Logo" width={144} height={144} className="w-36 h-36 object-contain" />
                            <span className="text-3xl font-serif font-bold text-charcoal-900 tracking-tight -ml-3 whitespace-nowrap">StudioVaultPH</span>
                        </Link>

                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full mb-6">
                            <Award className="w-4 h-4 text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Founding Partner Access</span>
                        </div>

                        <div className="text-center">
                            <h2 className="text-charcoal-800 text-sm font-bold uppercase tracking-[0.2em] mb-3">Welcome to the Vault</h2>
                            <h1 className="text-4xl font-serif text-charcoal-900 mb-4">
                                {isSignUp
                                    ? (role === 'studio' ? 'List Your Studio' : role === 'instructor' ? 'Join as Instructor' : 'Create an Account')
                                    : 'Welcome Back'}
                            </h1>
                            <p className="text-charcoal-600 text-base max-w-sm mx-auto">
                                {isSignUp
                                    ? (role === 'studio'
                                        ? 'Start monetizing your empty reformers today.'
                                        : role === 'instructor'
                                            ? 'Access premium studio spaces and grow your practice.'
                                            : 'Premium Pilates. Affordable Rates.')
                                    : 'Please enter your credentials to access your secure dashboard.'}
                            </p>
                        </div>
                    </div>

                    {isSignUp && (
                        <div className="mb-10 p-1 bg-cream-50 rounded-2xl flex gap-1 border border-cream-100/50">
                            {[
                                { id: 'customer', label: 'Client' },
                                { id: 'instructor', label: 'Instructor' },
                                { id: 'studio', label: 'Studio' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setRole(opt.id)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-sm font-bold transition-all duration-200 ${role === opt.id
                                        ? 'bg-white text-charcoal-900 shadow-sm border border-cream-200'
                                        : 'text-charcoal-800 hover:text-charcoal-900'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="grid grid-cols-1 gap-6">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-semibold text-charcoal-800 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                    placeholder="e.g. Jane Doe"
                                    className="w-full px-5 py-3.5 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-300"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-charcoal-800 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="jane@example.com"
                                className="w-full px-5 py-3.5 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-300"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-charcoal-800">Password</label>
                                {!isSignUp && (
                                    <Link href="/forgot-password" gap-2 className="text-xs text-charcoal-600 hover:text-charcoal-900 transition-colors font-bold">
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
                            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : (isSignUp ? 'Join the Vault' : 'Sign In')}
                        </button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-cream-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                                <span className="px-6 bg-white text-charcoal-300">Or</span>
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
                                className="text-charcoal-500 hover:text-charcoal-900 font-medium text-sm transition-colors group"
                            >
                                {isSignUp ? (
                                    <>Already have an account? <span className="text-charcoal-900 underline underline-offset-8 decoration-2 decoration-cream-300 group-hover:decoration-charcoal-900 font-bold transition-all">Sign In</span></>
                                ) : (
                                    <>Don't have an account? <span className="text-charcoal-900 underline underline-offset-8 decoration-2 decoration-cream-300 group-hover:decoration-charcoal-900 font-bold transition-all">Join the Vault</span></>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-16 pt-12 border-t border-cream-100 text-center">
                        <p className="text-xs text-charcoal-400 leading-relaxed max-w-xs mx-auto">
                            By continuing, you agree to our <Link href="/terms" className="underline hover:text-charcoal-900">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-charcoal-900">Privacy Policy</Link>.
                        </p>
                    </div>
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
