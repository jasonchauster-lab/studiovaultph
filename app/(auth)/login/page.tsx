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
    const [birthday, setBirthday] = useState('')
    const [role, setRole] = useState(initialRole)
    const [isSignUp, setIsSignUp] = useState(initialMode)
    const [loading, setLoading] = useState(false)

    // Pre-populate error message if redirected back from OAuth callback with an error
    const oauthError = searchParams.get('error')
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(
        oauthError ? { type: 'error', text: decodeURIComponent(oauthError) } : null
    )
    const router = useRouter()
    const supabase = createClient()

    const handleGoogleAuth = async () => {
        setLoading(true)
        setMessage(null)

        const params = new URLSearchParams()
        if (isSignUp && role) params.set('role_intent', role)
        const ref = searchParams.get('ref')
        if (ref) params.set('ref', ref)
        const callbackUrl = `${window.location.origin}/auth/callback${params.toString() ? '?' + params.toString() : ''}`

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: callbackUrl,
            },
        })
        if (error) {
            setMessage({ type: 'error', text: error.message })
            setLoading(false)
        }
    }

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
            const refCode = searchParams.get('ref')
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        email: email.toLowerCase(),
                        role: role,
                        date_of_birth: birthday,
                        ...(refCode ? { referred_by_code: refCode } : {}),
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/verified${refCode ? '&ref=' + refCode : ''}`
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
        <div className="min-h-screen bg-off-white flex flex-col md:flex-row relative selection:bg-forest/10">
            {/* Left Side: Brand Narrative - Hidden on mobile, full height on desktop */}
            <div className="hidden md:flex md:w-[45%] relative flex-col justify-center items-center p-20 overflow-hidden group">
                <Image
                    src={isSignUp ? "/images/auth/auth-left-2.png" : "/images/auth/auth-left-1.png"}
                    alt="Pilates Sanctuary"
                    fill
                    className="object-cover transition-transform duration-[20s] group-hover:scale-105"
                    priority
                />
                <div className="absolute inset-0 bg-charcoal/30" />
                <div className="absolute inset-0 bg-gradient-to-b from-charcoal/10 via-transparent to-charcoal/40" />

                <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="earth-card p-12 border-border-grey/50 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
                        <div className="space-y-12">
                            <div className="space-y-8">
                                <Link href="/" aria-label="Studio Vault PH Home" className="flex items-center gap-0 group/logo">
                                    <div className="bg-white p-3 rounded-xl shadow-tight group-hover/logo:rotate-3 transition-transform border border-border-grey/50">
                                        <Image src="/logo.png" alt="StudioVault Logo" width={60} height={60} className="w-12 h-12 object-contain" />
                                    </div>
                                    <span className="text-2xl font-serif font-bold text-charcoal tracking-tight ml-4">StudioVaultPH</span>
                                </Link>
                                <h2 className="text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-[1.1] tracking-tight">
                                    The Sanctuary <br />
                                    <span className="text-burgundy italic">of Movement.</span>
                                </h2>
                            </div>

                            <p className="text-xl text-charcoal-700 font-medium leading-relaxed italic border-l-4 border-burgundy/20 pl-6">
                                &ldquo;Experience a platform designed with the precision and grace of Pilates itself.&rdquo;
                            </p>

                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] border-t border-border-grey pt-10 mt-12">
                                <Award className="w-5 h-5 text-burgundy" />
                                A Foundation Built for Professionals
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 overflow-y-auto relative bg-off-white">
                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3 text-slate-600 hover:text-charcoal transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Return Home</span>
                </Link>

                <div className="w-full max-w-md">
                    <div className="text-center mb-16 space-y-4">
                        <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight">
                            {isSignUp ? 'Begin Your Journey' : 'Secure Access'}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
                            {isSignUp ? 'Join the community.' : 'Return to your dashboard'}
                        </p>
                    </div>

                    {isSignUp && (
                        <div
                            role="radiogroup"
                            aria-label="Selection Role"
                            className="mb-10 p-1 bg-white rounded-lg flex gap-1 border border-border-grey shadow-tight"
                        >
                            {[
                                { id: 'customer', label: 'Client' },
                                { id: 'instructor', label: 'Instructor' },
                                { id: 'studio', label: 'Studio' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={role === opt.id}
                                    onClick={() => setRole(opt.id)}
                                    className={`flex-1 py-3 px-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${role === opt.id
                                        ? 'bg-burgundy text-white shadow-tight'
                                        : 'text-slate-600 hover:text-charcoal hover:bg-off-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Google OAuth */}
                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-semibold text-charcoal hover:bg-off-white transition-all shadow-tight disabled:opacity-50 mb-6"
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-border-grey" />
                        <span className="text-[10px] font-bold text-muted-burgundy uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-border-grey" />
                    </div>

                    <form onSubmit={handleAuth} className="space-y-6">
                        {isSignUp && (
                            <div className="space-y-3">
                                <label htmlFor="full-name" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Full Name</label>
                                <input
                                    id="full-name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                    placeholder="Jane Doe"
                                    className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all placeholder:text-slate/30"
                                />
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-3">
                                <label htmlFor="birthday" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Date of Birth</label>
                                <input
                                    id="birthday"
                                    type="date"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                    required={isSignUp}
                                    className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-3">
                            <label htmlFor="email" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-1">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="jane@studio-vault.ph"
                                className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all placeholder:text-slate/30"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label htmlFor="password" id="password-label" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Password</label>
                                {!isSignUp && (
                                    <Link href="/forgot-password" gap-2 className="text-[10px] text-slate-600 hover:text-burgundy transition-all font-bold uppercase tracking-widest">
                                        Recover Key
                                    </Link>
                                )}
                            </div>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all placeholder:text-slate/30"
                            />
                        </div>

                        {message && (
                            <div className={`text-[10px] font-bold uppercase tracking-widest p-5 rounded-lg flex items-center justify-center animate-in fade-in slide-in-from-top-2 border shadow-tight ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-forest w-full py-5 rounded-lg text-[11px] font-bold uppercase tracking-[0.3em] shadow-tight disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Create Account' : 'Log In')}
                        </button>

                        <div className="text-center pt-8">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp)
                                    setMessage(null)
                                    setFullName('')
                                    setEmail('')
                                    setPassword('')
                                }}
                                className="text-slate-600 hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.3em] transition-all group"
                            >
                                {isSignUp ? (
                                    <>Already have an account? <span className="text-burgundy border-b border-burgundy/20 group-hover:border-burgundy transition-all pb-1">Log in.</span></>
                                ) : (
                                    <>Don&apos;t have an account? <span className="text-burgundy border-b border-burgundy/20 group-hover:border-burgundy transition-all pb-1">Sign up.</span></>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-20 pt-10 border-t border-border-grey text-center">
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                            By proceeding, you adhere to our <Link href="/terms" className="text-slate-600 hover:text-burgundy">Terms</Link> and <Link href="/privacy" className="text-slate-600 hover:text-burgundy">Privacy Policy</Link>.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-off-white flex items-center justify-center p-4">
                <Loader2 className="animate-spin w-8 h-8 text-forest/20" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
