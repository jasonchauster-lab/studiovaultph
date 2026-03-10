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
                        email: email.toLowerCase(),
                        role: role,
                        date_of_birth: birthday
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
                                        <Image src="/logo.png" alt="" width={60} height={60} className="w-12 h-12 object-contain" />
                                    </div>
                                    <span className="text-2xl font-serif font-bold text-charcoal tracking-tight ml-4">StudioVaultPH</span>
                                </Link>
                                <h2 className="text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-[1.1] tracking-tight">
                                    The Sanctuary <br />
                                    <span className="text-forest italic">of Movement.</span>
                                </h2>
                            </div>

                            <p className="text-xl text-slate font-medium leading-relaxed italic border-l-4 border-forest/20 pl-6">
                                &ldquo;Experience a platform designed with the precision and grace of Pilates itself.&rdquo;
                            </p>

                            <div className="flex items-center gap-4 text-[10px] font-bold text-slate uppercase tracking-[0.4em] border-t border-border-grey pt-10 mt-12">
                                <Award className="w-5 h-5 text-forest" />
                                A Foundation Built for Professionals
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 overflow-y-auto relative bg-off-white">
                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3 text-slate hover:text-charcoal transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Return Home</span>
                </Link>

                <div className="w-full max-w-md">
                    <div className="text-center mb-16 space-y-4">
                        <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight">
                            {isSignUp ? 'Begin Your Journey' : 'Secure Access'}
                        </h1>
                        <p className="text-[10px] font-bold text-slate uppercase tracking-[0.4em]">
                            {isSignUp ? 'Establish your digital legacy' : 'Return to your dashboard'}
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
                                        ? 'bg-forest text-white shadow-tight'
                                        : 'text-slate hover:text-charcoal hover:bg-off-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-6">
                        {isSignUp && (
                            <div className="space-y-3">
                                <label htmlFor="full-name" className="block text-[10px] font-bold text-slate uppercase tracking-widest px-1">Full Name</label>
                                <input
                                    id="full-name"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                    placeholder="Jane Doe"
                                    className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all placeholder:text-slate/30"
                                />
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-3">
                                <label htmlFor="birthday" className="block text-[10px] font-bold text-slate uppercase tracking-widest px-1">Date of Birth</label>
                                <input
                                    id="birthday"
                                    type="date"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                    required={isSignUp}
                                    className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-3">
                            <label htmlFor="email" className="block text-[10px] font-bold text-slate uppercase tracking-widest px-1">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="jane@studio-vault.ph"
                                className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all placeholder:text-slate/30"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label htmlFor="password" id="password-label" className="block text-[10px] font-bold text-slate uppercase tracking-widest">Password</label>
                                {!isSignUp && (
                                    <Link href="/forgot-password" gap-2 className="text-[10px] text-slate hover:text-forest transition-all font-bold uppercase tracking-widest">
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
                                className="w-full px-5 py-4 border border-border-grey bg-white rounded-lg text-[13px] font-medium text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all placeholder:text-slate/30"
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
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Initiate Account' : 'Authenticate')}
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
                                className="text-slate hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.3em] transition-all group"
                            >
                                {isSignUp ? (
                                    <>Account exists? <span className="text-forest border-b border-forest/20 group-hover:border-forest transition-all pb-1">Authenticate</span></>
                                ) : (
                                    <>No account? <span className="text-forest border-b border-forest/20 group-hover:border-forest transition-all pb-1">Begin Journey</span></>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-20 pt-10 border-t border-border-grey text-center">
                        <p className="text-[9px] font-bold text-slate uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                            By proceeding, you adhere to our <Link href="/terms" className="text-slate hover:text-forest">Terms</Link> and <Link href="/privacy" className="text-slate hover:text-forest">Privacy Policy</Link>.
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
            <div className="min-h-screen bg-off-white flex items-center justify-center p-4">
                <Loader2 className="animate-spin w-8 h-8 text-forest/20" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
