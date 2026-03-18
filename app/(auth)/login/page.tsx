'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Award, ArrowLeft, ShieldCheck, Mail } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'

// step='credentials' → email+password form
// step='otp'         → 2FA: send link (otpSent=false) or await click (otpSent=true)
type Step = 'credentials' | 'otp'

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
    const [step, setStep] = useState<Step>('credentials')
    const [otpSent, setOtpSent] = useState(false)
    const [lastOtpSentAt, setLastOtpSentAt] = useState<number | null>(null)
    const [rememberDevice, setRememberDevice] = useState(false)
    const [isRedirecting, setIsRedirecting] = useState(false)

    const oauthError = searchParams.get('error')
    const resolveInitialMessage = (raw: string | null): { type: 'error' | 'success', text: string } | null => {
        if (!raw) return null
        const decoded = decodeURIComponent(raw)
        // PKCE verifier errors mean the link was clicked on a different device —
        // the auth likely succeeded there. Show a friendly prompt instead of
        // the raw Supabase internal error.
        if (decoded.toLowerCase().includes('pkce') || decoded.toLowerCase().includes('code verifier')) {
            return { type: 'success', text: 'Email verified! If you signed in on another device, you\'re all set there. To sign in here, enter your credentials below.' }
        }
        return { type: 'error', text: decoded }
    }
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(
        resolveInitialMessage(oauthError)
    )
    const router = useRouter()
    const supabase = createClient()

    // 0. Auto-redirect if already logged in (client-side backup to middleware)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user && !isRedirecting) {
                // Check if they were already remembered
                if (isOtpRemembered(session.user.id)) {
                   setIsRedirecting(true)
                   await redirectByRole(session.user.id)
                } else {
                    // Passed password but not 2FA -> jump to OTP step
                    console.log('[Auth] session exists but not remembered, showing OTP step')
                    setStep('otp')
                    if (session.user.email) setEmail(session.user.email)
                    
                    // Restore "Remember me" preference from cookie if it was set
                    const rememberMePref = document.cookie.split('; ').find(row => row.startsWith('remember_me_pref='))?.split('=')[1]
                    if (rememberMePref === '1') setRememberDevice(true)
                }
            }
        }
        checkSession()
    }, [])

    // Cross-device 2FA: listen for SIGNED_IN on this tab.
    // When the user clicks the verification link on ANY device (e.g. desktop),
    // Supabase broadcasts the session via the storage channel and this fires
    // on all open tabs — including the mobile that's still on the waiting screen.
    useEffect(() => {
        // Start listening for auth changes once we are at the OTP step
        // OR if we already have a session (cross-tab sync).
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: string, session: { user?: { id: string } } | null) => {
                // 1. Avoid infinite redirect loops if we are already redirecting
                if (isRedirecting) return

                // 2. Filter for events that imply a full verification or fresh session
                const isVerificationEvent = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED'
                
                if (isVerificationEvent && session?.user) {
                    // 3. Skip if this is just the INITIAL password-only session event
                    // (we know if it's the password event if we JUST sent an OTP 
                    // and it hasn't been 2 seconds yet).
                    const isTooFresh = lastOtpSentAt && (Date.now() - lastOtpSentAt < 2000)
                    if (otpSent && isTooFresh) {
                        console.log('[Auth] Ignoring event (too fresh):', event)
                        return
                    }

                    console.log('[Auth] Valid verification event detected:', event)
                    setIsRedirecting(true)
                    
                    // Read "Remember Me" preference from cookie (survives refreshes)
                    const rememberMePref = document.cookie.split('; ').find(row => row.startsWith('remember_me_pref='))?.split('=')[1]
                    const shouldRemember = rememberDevice || (rememberMePref === '1')

                    if (shouldRemember) {
                        const maxAge = 14 * 24 * 60 * 60
                        const cookieOptions = `; max-age=${maxAge}; path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
                        document.cookie = `otp_remembered=${session.user.id}${cookieOptions}`
                        document.cookie = `remember_me=1${cookieOptions}`
                        console.log('[Auth] Set "Remember Me" cookies client-side via listener')
                    }

                    await redirectByRole(session.user.id)
                }
            }
        )

        return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otpSent, lastOtpSentAt]) // Re-bind if OTP timing reference changes

    const isOtpRemembered = (userId: string) => {
        if (typeof document === 'undefined') return false
        const cookies = document.cookie.split(';').map(c => c.trim())
        
        // Log all cookies for debugging (excluding Supabase tokens for security)
        const debugCookies = cookies
            .filter(c => !c.toLowerCase().includes('auth-token'))
            .join(', ')
        console.log('[Auth] Visible non-auth cookies:', debugCookies)

        const found = cookies.some(c => {
            const [name, val] = c.split('=')
            const cleanVal = val?.replace(/"/g, '')
            return name === 'otp_remembered' && cleanVal?.toLowerCase() === userId?.toLowerCase()
        })
        
        console.log(`[Auth] 2FA Check for user ${userId.slice(0, 5)}... result: ${found}`)
        return found
    }

    const redirectByRole = async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        // If user just successfully bypassed 2FA via a "Remember Me" cookie from the callback,
        // or if they were already remembered, we simply redirect.
        const roleMap: Record<string, string> = { admin: '/admin', instructor: '/instructor', studio: '/studio', customer: '/customer' }
        const dest = profile?.role ? (roleMap[profile.role] ?? '/welcome') : '/welcome'

        router.push(dest)
        router.refresh()
    }

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
            options: { redirectTo: callbackUrl },
        })
        if (error) { setMessage({ type: 'error', text: error.message }); setLoading(false) }
    }

    // Step 1: verify password, then prompt 2FA
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValidEmail(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' })
            return
        }
        setLoading(true)
        setMessage(null)

        if (isSignUp) {
            const { data: existingProfile } = await supabase
                .from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle()
            if (existingProfile) {
                setMessage({ type: 'error', text: 'An account with this email already exists. Please sign in instead.' })
                setLoading(false)
                return
            }
            const refCode = searchParams.get('ref')
            const { error } = await supabase.auth.signUp({
                email, password,
                options: {
                    data: { full_name: fullName, email: email.toLowerCase(), role, date_of_birth: birthday, ...(refCode ? { referred_by_code: refCode } : {}) },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=confirm${refCode ? '&ref=' + refCode : ''}`
                }
            })
            if (error) {
                const e2 = error as any
                setMessage({ type: 'error', text: `${e2.message}${e2.details ? ' - ' + e2.details : ''}${e2.hint ? ' (Hint: ' + e2.hint + ')' : ''}` })
            } else {
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' })
            }
            setLoading(false)
            return
        }

        // Sign-in: check password
        const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setMessage({ type: 'error', text: error.message })
            setLoading(false)
            return
        }
        if (!user) { router.push('/welcome'); router.refresh(); return }

        // Skip 2FA if this device is already remembered for this specific user
        if (isOtpRemembered(user.id)) {
            await redirectByRole(user.id)
            return
        }

        // Show 2FA step
        setStep('otp')
        setLoading(false)
    }

    // Step 2a: send the magic link (called when user clicks "Send Verification Link")
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        // Use implicit flow so the magic link carries a token_hash (not a PKCE
        // code), making it work when opened on any device or browser.
        const supabaseImplicit = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { flowType: 'implicit' } }
        )
        // Embed the remember preference directly in the callback URL so it
        // works regardless of which device or browser opens the link.
        const callbackUrl = `${window.location.origin}/auth/callback?next=2fa${rememberDevice ? '&remember=1' : ''}`
        const { error } = await supabaseImplicit.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false,
                emailRedirectTo: callbackUrl,
            },
        })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setOtpSent(true)
            setLastOtpSentAt(Date.now())
        }
        setLoading(false)
    }

    const handleResendOtp = async () => {
        setLoading(true)
        setMessage(null)
        const supabaseImplicit = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { flowType: 'implicit' } }
        )
        const callbackUrl = `${window.location.origin}/auth/callback?next=2fa${rememberDevice ? '&remember=1' : ''}`
        const { error } = await supabaseImplicit.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false, emailRedirectTo: callbackUrl },
        })
        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setOtpSent(true)
            setLastOtpSentAt(Date.now())
            setMessage({ type: 'success', text: 'A new verification link was sent.' })
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-off-white flex flex-col md:flex-row relative selection:bg-forest/10">
            {/* Left Side */}
            <div className="hidden md:flex md:w-[45%] relative flex-col justify-center items-center p-20 overflow-hidden group">
                <Image
                    src={isSignUp ? "/images/auth/auth-left-2.png" : "/images/auth/auth-left-1.png"}
                    alt="Pilates Sanctuary" fill
                    className="object-cover transition-transform duration-[20s] group-hover:scale-105" priority
                />
                <div className="absolute inset-0 bg-charcoal/30" />
                <div className="absolute inset-0 bg-gradient-to-b from-charcoal/10 via-transparent to-charcoal/40" />
                <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="earth-card p-12 border-border-grey/50 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
                        <div className="space-y-12">
                            <h2 className="text-5xl lg:text-6xl font-serif font-bold text-charcoal leading-[1.1] tracking-tight pt-12">
                                The Sanctuary <br /><span className="text-burgundy italic">of Movement.</span>
                            </h2>
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

            {/* Right Side */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 lg:p-24 overflow-y-auto relative bg-off-white pb-16 md:pb-24">
                <Link href="/" className="hidden md:flex absolute top-12 left-12 items-center gap-3 text-slate-600 hover:text-charcoal transition-all group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Return Home</span>
                </Link>

                <div className="w-full max-w-md pt-10 sm:pt-0">
                    <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <Link href="/" className="flex flex-col items-center group">
                            <Image src="/logo4.png" alt="StudioVault Logo" width={240} height={80} className="h-20 w-auto object-contain" />
                        </Link>
                    </div>

                    {/* ── 2FA Step ───────────────────────────────────────────────── */}
                    {step === 'otp' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="text-center mb-10">
                                <div className="w-14 h-14 rounded-2xl bg-forest/10 flex items-center justify-center mx-auto mb-4">
                                    {otpSent ? <Mail className="w-7 h-7 text-forest" /> : <ShieldCheck className="w-7 h-7 text-forest" />}
                                </div>
                                <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal tracking-tight mb-2">
                                    {otpSent ? 'Check Your Email' : 'Verify It\'s You'}
                                </h1>
                                <p className="text-sm text-slate-500 font-medium">
                                    {otpSent
                                        ? <>We sent a sign-in link to <span className="font-bold text-charcoal">{email}</span>. Click it to complete login.</>
                                        : 'We\'ll send a verification link to your email as a second step.'
                                    }
                                </p>
                            </div>

                            {!otpSent ? (
                                // Pre-send: checkbox + send button
                                <form onSubmit={handleSendOtp} className="space-y-5">
                                    <label className="flex items-center gap-3 px-5 cursor-pointer group p-4 rounded-xl border border-border-grey bg-white hover:border-forest/30 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={rememberDevice}
                                            onChange={(e) => {
                                                const checked = e.target.checked
                                                setRememberDevice(checked)
                                                // Persist preference to a temporary cookie for 10 mins (link lifetime)
                                                document.cookie = `remember_me_pref=${checked ? '1' : '0'}; max-age=600; path=/; SameSite=Lax`
                                            }}
                                            className="w-4 h-4 rounded border-border-grey cursor-pointer accent-forest"
                                        />
                                        <div>
                                            <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Remember this device</p>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Skip this step for 14 days on this browser</p>
                                        </div>
                                    </label>

                                    {message && (
                                        <div className={`text-[10px] font-bold uppercase tracking-widest p-5 rounded-lg flex items-center justify-center animate-in fade-in border shadow-tight ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                            {message.text}
                                        </div>
                                    )}

                                    <button type="submit" disabled={loading}
                                        className="btn-forest w-full h-14 rounded-lg text-[11px] font-bold uppercase tracking-[0.3em] shadow-tight disabled:opacity-50">
                                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Verification Link'}
                                    </button>

                                    <div className="text-center">
                                        <button type="button" onClick={() => { setStep('credentials'); setMessage(null) }}
                                            className="text-[10px] text-slate-500 hover:text-charcoal font-bold uppercase tracking-widest transition-all">
                                            ← Back
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // Post-send: awaiting click
                                <div className="space-y-5">
                                    {isRedirecting ? (
                                        <div className="p-8 rounded-xl border border-forest/20 bg-forest/5 text-center space-y-4">
                                            <Loader2 className="animate-spin w-8 h-8 text-forest mx-auto" />
                                            <p className="text-[11px] font-bold text-forest uppercase tracking-widest">Redirecting to dashboard...</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Email verified! Taking you there now.</p>
                                        </div>
                                    ) : (
                                    <div className="p-5 rounded-xl border border-forest/20 bg-forest/5 text-center space-y-1">
                                        <p className="text-[10px] font-bold text-forest uppercase tracking-widest">Link expires in 10 minutes</p>
                                        <p className="text-[10px] text-slate-500 font-medium">You can click it on any device — this page will update automatically.</p>
                                    </div>
                                    )}

                                    {message && (
                                        <div className={`text-[10px] font-bold uppercase tracking-widest p-5 rounded-lg flex items-center justify-center animate-in fade-in border shadow-tight ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2 px-1">
                                        <button type="button" onClick={() => { setOtpSent(false); setMessage(null) }}
                                            className="text-[10px] text-slate-500 hover:text-charcoal font-bold uppercase tracking-widest transition-all">
                                            ← Back
                                        </button>
                                        <button type="button" disabled={loading} onClick={handleResendOtp}
                                            className="text-[10px] text-slate-500 hover:text-burgundy font-bold uppercase tracking-widest transition-all disabled:opacity-50">
                                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Resend Link'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Credentials Step ──────────────────────────────────────── */
                        <>
                            <div className="text-center mb-12">
                                <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal tracking-tight">
                                    {isSignUp ? 'Begin Your Journey' : 'Secure Access'}
                                </h1>
                            </div>

                            {isSignUp && (
                                <div role="radiogroup" aria-label="Selection Role" className="mb-10 p-1 bg-white rounded-lg flex gap-1 border border-border-grey shadow-tight">
                                    {[{ id: 'customer', label: 'Client' }, { id: 'instructor', label: 'Instructor' }, { id: 'studio', label: 'Studio' }].map((opt) => (
                                        <button key={opt.id} type="button" role="radio" aria-checked={role === opt.id} onClick={() => setRole(opt.id)}
                                            className={`flex-1 py-3 px-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${role === opt.id ? 'bg-forest text-white shadow-tight' : 'text-slate-600 hover:text-charcoal hover:bg-off-white'}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button type="button" onClick={handleGoogleAuth} disabled={loading}
                                className="w-full flex items-center justify-center gap-3 px-5 h-14 border border-border-grey bg-white rounded-xl text-[13px] font-bold uppercase tracking-widest text-charcoal hover:bg-off-white transition-all shadow-tight disabled:opacity-50 mb-12">
                                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/>
                                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </button>

                            <div className="flex items-center gap-4 mb-12">
                                <div className="flex-1 h-px bg-border-grey" />
                                <span className="text-[10px] font-black text-muted-burgundy uppercase tracking-[0.3em] px-4">or</span>
                                <div className="flex-1 h-px bg-border-grey" />
                            </div>

                            <form onSubmit={handleAuth} className="w-full space-y-4">
                                {isSignUp && (
                                    <div className="space-y-2">
                                        <label htmlFor="full-name" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-5">Full Name</label>
                                        <input id="full-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required={isSignUp}
                                            placeholder="Jane Doe" className="w-full px-5 h-14 border border-border-grey bg-white rounded-lg text-base font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all placeholder:text-slate/30" />
                                    </div>
                                )}
                                {isSignUp && (
                                    <div className="space-y-2">
                                        <label htmlFor="birthday" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-5">Date of Birth</label>
                                        <input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required={isSignUp}
                                            className="w-full px-5 h-14 border border-border-grey bg-white rounded-lg text-base font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest px-5">Email Address</label>
                                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                                        placeholder="jane@studio-vault.ph" className="w-full px-5 h-14 border border-border-grey bg-white rounded-lg text-base font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all placeholder:text-slate/30" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-5">
                                        <label htmlFor="password" className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">Password</label>
                                        {!isSignUp && (
                                            <Link href="/forgot-password" className="text-[10px] text-slate-600 hover:text-burgundy transition-all font-bold uppercase tracking-widest">
                                                Forgot Password
                                            </Link>
                                        )}
                                    </div>
                                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                                        placeholder="••••••••" className="w-full px-5 h-14 border border-border-grey bg-white rounded-lg text-base font-medium text-charcoal focus:ring-1 focus:ring-burgundy outline-none transition-all placeholder:text-slate/30" />
                                </div>

                                {message && (
                                    <div className={`text-[10px] font-bold uppercase tracking-widest p-5 rounded-lg flex items-center justify-center animate-in fade-in slide-in-from-top-2 border shadow-tight ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="btn-forest w-full h-14 rounded-lg text-[11px] font-bold uppercase tracking-[0.3em] shadow-tight disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isSignUp ? 'Create Account' : 'Continue')}
                                </button>

                                <div className="text-center pt-8">
                                    <button type="button"
                                        onClick={() => { setIsSignUp(!isSignUp); setMessage(null); setFullName(''); setEmail(''); setPassword('') }}
                                        className="text-slate-600 hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.3em] transition-all group">
                                        {isSignUp
                                            ? <>Already have an account? <span className="text-burgundy border-b border-burgundy/20 group-hover:border-burgundy transition-all pb-1">Log in.</span></>
                                            : <>Don&apos;t have an account? <span className="text-burgundy border-b border-burgundy/20 group-hover:border-burgundy transition-all pb-1">Sign up.</span></>
                                        }
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    <div className="mt-32 pt-10 border-t border-border-grey text-center pb-10">
                        <p className="text-[9px] font-black text-slate uppercase tracking-[0.4em] leading-relaxed max-w-xs mx-auto">
                            By proceeding, you adhere to our <Link href="/terms-of-service" className="text-slate hover:text-burgundy">Terms</Link> and <Link href="/privacy" className="text-slate hover:text-burgundy">Privacy Policy</Link>.
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
