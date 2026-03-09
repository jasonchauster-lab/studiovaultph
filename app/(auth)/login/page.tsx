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
        <div className="min-h-screen bg-alabaster flex flex-col md:flex-row relative selection:bg-sage/20">
            <div className="fixed inset-0 bg-white/50 animate-mesh -z-10 pointer-events-none" />

            {/* Left Side: Brand Narrative - Hidden on mobile, full height on desktop */}
            <div className="hidden md:flex md:w-[45%] relative flex-col justify-center items-center p-20 overflow-hidden bg-white/20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-sage/5 rounded-full blur-[120px] animate-pulse" />

                <div className="relative z-10 w-full max-w-sm space-y-12">
                    <div className="space-y-6">
                        <Link href="/" className="flex items-center gap-0 group">
                            <Image src="/logo.png" alt="StudioVault Logo" width={80} height={80} className="w-16 h-16 object-contain" />
                            <span className="text-2xl font-serif font-bold text-charcoal tracking-tight -ml-2">StudioVaultPH</span>
                        </Link>
                        <h2 className="text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-[1.1] tracking-tight">
                            The Sanctuary <br />
                            <span className="text-sage italic">of Movement.</span>
                        </h2>
                    </div>

                    <p className="text-lg text-charcoal/40 font-medium leading-relaxed italic">
                        &ldquo;Experience a platform designed with the precision and grace of Pilates itself.&rdquo;
                    </p>

                    <div className="flex items-center gap-4 text-[10px] font-bold text-sage uppercase tracking-widest border-t border-sage/10 pt-8 mt-12">
                        <Award className="w-4 h-4" />
                        A Foundation Built for Professionals
                    </div>
                </div>
            </div>

            {/* Right Side: Form Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 overflow-y-auto relative bg-white/40 backdrop-blur-sm">
                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center gap-3 text-charcoal/40 hover:text-sage transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Return Home</span>
                </Link>

                <div className="w-full max-w-md">
                    <div className="text-center mb-12 space-y-3">
                        <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight">
                            {isSignUp ? 'Begin Your Journey' : 'Secure Access'}
                        </h1>
                        <p className="text-[11px] font-bold text-charcoal/30 uppercase tracking-[0.3em]">
                            {isSignUp ? 'Establish your digital legacy' : 'Return to your dashboard'}
                        </p>
                    </div>

                    {isSignUp && (
                        <div className="mb-10 p-1.5 bg-white/60 backdrop-blur-md rounded-[24px] flex gap-2 border border-white/80 shadow-cloud">
                            {[
                                { id: 'customer', label: 'Client' },
                                { id: 'instructor', label: 'Instructor' },
                                { id: 'studio', label: 'Studio' }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setRole(opt.id)}
                                    className={`flex-1 py-3.5 px-2 rounded-[20px] text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${role === opt.id
                                        ? 'bg-sage text-white shadow-sm'
                                        : 'text-charcoal/40 hover:text-charcoal hover:bg-white/40'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-6">
                        {isSignUp && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-charcoal/40 uppercase tracking-widest px-1">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isSignUp}
                                    placeholder="Jane Doe"
                                    className="w-full px-6 py-4 border border-white/60 bg-white/40 rounded-[20px] text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-sage outline-none transition-all placeholder:text-charcoal/20"
                                />
                            </div>
                        )}

                        {isSignUp && (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-charcoal/40 uppercase tracking-widest px-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                    required={isSignUp}
                                    className="w-full px-6 py-4 border border-white/60 bg-white/40 rounded-[20px] text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-sage outline-none transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-charcoal/40 uppercase tracking-widest px-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="jane@studio-vault.ph"
                                className="w-full px-6 py-4 border border-white/60 bg-white/40 rounded-[20px] text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-sage outline-none transition-all placeholder:text-charcoal/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="block text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Password</label>
                                {!isSignUp && (
                                    <Link href="/forgot-password" gap-2 className="text-[9px] text-charcoal/30 hover:text-sage transition-all font-bold uppercase tracking-widest">
                                        Recover Key
                                    </Link>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-6 py-4 border border-white/60 bg-white/40 rounded-[20px] text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-sage outline-none transition-all placeholder:text-charcoal/20"
                            />
                        </div>

                        {message && (
                            <div className={`text-[10px] font-bold uppercase tracking-widest p-5 rounded-[20px] flex items-center justify-center animate-in fade-in slide-in-from-top-2 shadow-sm ${message.type === 'error' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-sage/10 text-sage border border-sage/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-charcoal text-white py-5 rounded-[24px] text-[11px] font-bold uppercase tracking-widest hover:opacity-90 active:scale-[0.99] transition-all flex justify-center shadow-cloud shadow-charcoal/10 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Initiate Account' : 'Authenticate')}
                        </button>

                        <div className="text-center pt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp)
                                    setMessage(null)
                                    setFullName('')
                                    setEmail('')
                                    setPassword('')
                                }}
                                className="text-charcoal/30 hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.2em] transition-all group"
                            >
                                {isSignUp ? (
                                    <>Account exists? <span className="text-sage border-b border-sage/20 group-hover:border-sage transition-all pb-0.5">Authenticate</span></>
                                ) : (
                                    <>No account? <span className="text-sage border-b border-sage/20 group-hover:border-sage transition-all pb-0.5">Begin Journey</span></>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-20 pt-10 border-t border-charcoal/5 text-center">
                        <p className="text-[9px] font-bold text-charcoal/20 uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                            By proceeding, you adhere to our <Link href="/terms" className="text-charcoal/40 hover:text-sage">Terms</Link> and <Link href="/privacy" className="text-charcoal/40 hover:text-sage">Privacy Policy</Link>.
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
            <div className="min-h-screen bg-alabaster flex items-center justify-center p-4">
                <Loader2 className="animate-spin w-8 h-8 text-sage/40" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
