'use client'

import { useState, useEffect, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck, Mail, User } from 'lucide-react'
import { isValidEmail } from '@/lib/validation'
import clsx from 'clsx'

type Step = 'credentials' | 'otp'

interface AuthFormProps {
    initialMode?: boolean // true for signup, false for login
    initialRole?: string
    isRoleLocked?: boolean
    onSuccess?: (user: any) => void
    view?: 'page' | 'modal'
    studioSlug?: string
}

function AuthForm({ 
    initialMode = false, 
    initialRole = 'customer', 
    isRoleLocked = false,
    onSuccess,
    view = 'page',
    studioSlug: propStudioSlug
}: AuthFormProps) {
    const searchParams = useSearchParams()
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    
    const slug = propStudioSlug || (params?.slug as string) || searchParams.get('studio')
    const branchSlug = (params?.branchSlug as string) || searchParams.get('branch')
    const plan = searchParams.get('plan')
    const billing = searchParams.get('billing')
    
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
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(
        oauthError ? { type: 'error', text: decodeURIComponent(oauthError) } : null
    )

    // 0. Auto-redirect if already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user && !isRedirecting) {
                const isOAuth = (session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email') ||
                                (session.user.app_metadata?.providers?.some((p: string) => p !== 'email'))
                
                // Check if they were already remembered (2FA verified)
                const isVerified = isOAuth || isOtpRemembered(session.user.id)

                if (isVerified) {
                   setIsRedirecting(true)
                   await handleRedirection(session.user.id)
                } else {
                    setStep('otp')
                    if (session.user.email) setEmail(session.user.email)
                    const rememberMePref = document.cookie.split('; ').find(row => row.startsWith('remember_me_pref='))?.split('=')[1]
                    if (rememberMePref === '1') setRememberDevice(true)
                }
            }
        }
        checkSession()
    }, [])

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (isRedirecting) return
                const isVerificationEvent = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED'
                
                if (isVerificationEvent && session?.user) {
                    if (!otpSent) {
                        const isOAuth = (session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email') ||
                                        (session.user.app_metadata?.providers?.some((p: string) => p !== 'email'))
                        if (!(isOAuth || isOtpRemembered(session.user.id))) return
                    }
                    const isTooFresh = lastOtpSentAt && (Date.now() - lastOtpSentAt < 2000)
                    if (isTooFresh) return

                    setIsRedirecting(true)
                    const rememberMePref = document.cookie.split('; ').find(row => row.startsWith('remember_me_pref='))?.split('=')[1]
                    const shouldRemember = rememberDevice || (rememberMePref === '1')
                    const cookieOptions = `; max-age=${14 * 24 * 60 * 60}; path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
                    
                    if (shouldRemember) {
                        // We set these as "hints" so the UI knows the device is remembered.
                        // The actual secure bypass is handled by httpOnly cookies set by the server.
                        document.cookie = `otp_rem_hint_${session.user.id.toLowerCase()}=1${cookieOptions}`
                    }

                    await handleRedirection(session.user.id)
                }
            }
        )
        return () => subscription.unsubscribe()
    }, [otpSent, lastOtpSentAt, rememberDevice])

    const isOtpRemembered = (userId: string) => {
        if (typeof document === 'undefined' || !userId) return false
        const cookies = document.cookie.split(';').map(c => c.trim())
        const cookieName = `otp_rem_hint_${userId.toLowerCase()}`
        return cookies.some(c => c.split('=')[0] === cookieName && c.split('=')[1] === '1')
    }

    const handleRedirection = async (userId: string) => {
        try {
            const { data: profile } = await supabase.from('profiles').select('role, first_name, last_name, contact_number, date_of_birth').eq('id', userId).single()
            
            const host = window.location.hostname
            const isStudioPortal = host.includes('studiovault.co') || host.includes('studiovault.local') || !!slug

            if (onSuccess) {
                onSuccess({ id: userId, ...profile })
                return
            }

            // 1. Profile Onboarding check
            const isIncomplete = !profile?.first_name || !profile?.contact_number
            if (isIncomplete && (profile?.role === 'customer' || profile?.role === 'instructor')) {
                const onboardingPath = slug ? `/s/${slug}/onboarding` : `/${profile.role}/onboarding`
                router.push(onboardingPath)
                router.refresh()
                return
            }

            // 2. Waiver check for studio portals
            if (slug && (profile?.role === 'customer' || profile?.role === 'instructor')) {
                const { data: studio } = await supabase.from('studios').select('id').eq('slug', slug).maybeSingle()
                if (studio) {
                    const { data: waiver } = await supabase.from('waiver_consents').select('id').eq('user_id', userId).eq('studio_id', studio.id).maybeSingle()
                    if (!waiver) {
                        router.push(`/s/${slug}/onboarding/waiver`)
                        router.refresh()
                        return
                    }
                }
            }

            if (isStudioPortal && slug) {
                // ── Ensure Studio Membership & CRM Link ──
                const { data: studioData } = await supabase.from('studios').select('id').eq('slug', slug).maybeSingle()
                if (studioData) {
                    const { ensureStudioMembership } = await import('@/lib/studio/membership-actions')
                    await ensureStudioMembership(userId, studioData.id)
                }

                router.push(`/s/${slug}/dashboard`)
                router.refresh()
                return
            }

            const roleMap: Record<string, string> = { admin: '/admin', instructor: '/instructor', studio: '/studio', customer: '/customer' }
            const dest = profile?.role ? (roleMap[profile.role] ?? '/studio') : '/studio'
            router.push(dest)
            router.refresh()
        } catch (err) {
            console.error('[AuthForm] Redirect failed:', err)
            setLoading(false)
            setIsRedirecting(false)
        }
    }

    const handleGoogleAuth = async () => {
        setLoading(true)
        setMessage(null)
        const oauthParams = new URLSearchParams()
        if (isSignUp && role) oauthParams.set('role_intent', role)
        const ref = searchParams.get('ref')
        if (ref) oauthParams.set('ref', ref)
        if (plan) oauthParams.set('plan', plan)
        if (billing) oauthParams.set('billing', billing)
        if (slug) oauthParams.set('studio', slug)
        if (branchSlug) oauthParams.set('branch', branchSlug)

        // Set a fallback "breadcrumb" cookie in case Supabase defaults to the Site URL 
        // and strips these parameters. Expires in 10 minutes.
        if (typeof document !== 'undefined') {
            const context = JSON.stringify({ studio: slug, branch: branchSlug })
            document.cookie = `sb_auth_context=${encodeURIComponent(context)}; path=/; max-age=600; SameSite=Lax`
        }

        const callbackUrl = `${window.location.origin}/auth/callback?next=dashboard${oauthParams.toString() ? '&' + oauthParams.toString() : ''}`
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: callbackUrl },
        })
        if (error) { setMessage({ type: 'error', text: error.message }); setLoading(false) }
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isValidEmail(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' })
            return
        }
        setLoading(true)
        setMessage(null)

        const host = window.location.hostname
        const isStudioPortal = host.includes('studiovault.co') || host.includes('studiovault.local') || !!slug

        if (isSignUp) {
            const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle()
            
            // If user exists globally but trying to sign up at a studio, allow them to proceed to membership creation
            if (existingProfile && !isStudioPortal) {
                setMessage({ type: 'error', text: 'An account with this email already exists. Sign in instead!' })
                setLoading(false)
                return
            }
            
            // If they exist globally and are on a studio portal, we transition them to Sign In mode 
            // but keep the context so the callback can link the studio membership.
            if (existingProfile && isStudioPortal) {
                setMessage({ type: 'success', text: 'We found your StudioVault account! Sign in with your password to join this studio.' })
                setIsSignUp(false)
                setLoading(false)
                return
            }
            const refCode = searchParams.get('ref')
            const { error } = await supabase.auth.signUp({
                email, password,
                options: {
                    data: { 
                        full_name: fullName, 
                        email: email.toLowerCase(), 
                        role: isStudioPortal ? (role || 'customer') : role, 
                        date_of_birth: birthday, 
                        origin_portal: isStudioPortal ? 'cms' : 'marketplace',
                        ...(slug ? { studio_slug: slug } : {}),
                        ...(plan ? { plan_preference: plan } : {}),
                        ...(billing ? { billing_preference: billing } : {}),
                        ...(refCode ? { referred_by_code: refCode } : {}) 
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=confirm${refCode ? '&ref=' + refCode : ''}${plan ? '&plan=' + plan : ''}${billing ? '&billing=' + billing : ''}${slug ? '&studio=' + slug : ''}${branchSlug ? '&branch=' + branchSlug : ''}`
                }
            })
            if (error) {
                console.error('[AuthForm] SignUp Error:', error)
                if (error.message.includes('Database error saving new user')) {
                    setMessage({ 
                        type: 'error', 
                        text: 'We encountered a database error while creating your profile. Our team has been notified. Please try again in a few minutes.' 
                    })
                } else {
                    setMessage({ type: 'error', text: error.message })
                }
            } else {
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' })
            }
            setLoading(false)
            return
        }

        try {
            const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                setMessage({ type: 'error', text: error.message })
                setLoading(false)
                return
            }
            if (!user) { 
                setLoading(false)
                router.push('/welcome')
                router.refresh()
                return 
            }
            // Skip 2FA if this device is already remembered
            if (isOtpRemembered(user.id)) {
                await handleRedirection(user.id)
                return
            }
            setStep('otp')
            setLoading(false)
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' })
            setLoading(false)
        }
    }

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
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
        if (error) setMessage({ type: 'error', text: error.message })
        else { setOtpSent(true); setLastOtpSentAt(Date.now()) }
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
        if (error) setMessage({ type: 'error', text: error.message })
        else { setOtpSent(true); setLastOtpSentAt(Date.now()); setMessage({ type: 'success', text: 'A new verification link was sent.' }) }
        setLoading(false)
    }

    if (step === 'otp') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="text-center mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-forest/10 flex items-center justify-center mx-auto mb-4">
                        {otpSent ? <Mail className="w-7 h-7 text-forest" /> : <ShieldCheck className="w-7 h-7 text-forest" />}
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-charcoal tracking-tight mb-2">
                        {otpSent ? 'Check Your Email' : 'Verify It\'s You'}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium whitespace-pre-line">
                        {otpSent
                            ? `We sent a sign-in link to \n${email}`
                            : 'We\'ll send a verification link to your email as a second step.'
                        }
                    </p>
                </div>

                {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <label className="flex items-center gap-3 px-5 cursor-pointer group p-4 rounded-xl border border-border-grey bg-white hover:border-forest/30 transition-all">
                            <input
                                type="checkbox"
                                checked={rememberDevice}
                                onChange={(e) => {
                                    const checked = e.target.checked
                                    setRememberDevice(checked)
                                    document.cookie = `remember_me_pref=${checked ? '1' : '0'}; max-age=600; path=/; SameSite=Lax`
                                }}
                                className="w-4 h-4 rounded border-border-grey cursor-pointer accent-forest"
                            />
                            <div>
                                <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest">Remember this device</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Skip this for 14 days</p>
                            </div>
                        </label>
                        {message && (
                            <div className={clsx("text-[10px] font-bold uppercase tracking-widest p-4 rounded-lg text-center border", message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100')}>
                                {message.text}
                            </div>
                        )}
                        <button type="submit" disabled={loading} className="btn-forest w-full h-14 rounded-lg text-[11px] font-bold uppercase tracking-[0.3em] disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Send Verification Link'}
                        </button>
                        <button type="button" onClick={() => setStep('credentials')} className="w-full text-[10px] text-slate-500 hover:text-charcoal font-bold uppercase tracking-widest">← Back</button>
                    </form>
                ) : (
                    <div className="space-y-5">
                        {isRedirecting ? (
                            <div className="p-8 rounded-xl border border-forest/20 bg-forest/5 text-center space-y-4">
                                <Loader2 className="animate-spin w-8 h-8 text-forest mx-auto" />
                                <p className="text-[11px] font-bold text-forest uppercase tracking-widest">Redirecting...</p>
                            </div>
                        ) : (
                            <div className="p-5 rounded-xl border border-forest/20 bg-forest/5 text-center space-y-1">
                                <p className="text-[10px] font-bold text-forest uppercase tracking-widest">Link expires in 10 minutes</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between px-1">
                            <button type="button" onClick={() => setOtpSent(false)} className="text-[10px] text-slate-500 hover:text-charcoal font-bold uppercase tracking-widest">← Back</button>
                            <button type="button" disabled={loading} onClick={handleResendOtp} className="text-[10px] text-slate-500 hover:text-burgundy font-bold uppercase tracking-widest disabled:opacity-50">Resend Link</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className={clsx("text-center mb-10", view === 'modal' ? 'hidden' : 'block')}>
                <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight">
                    {isSignUp ? 'Begin Your Journey' : 'Secure Access'}
                </h1>
            </div>

            {isSignUp && !isRoleLocked && (
                <div className="mb-8 p-1 bg-white rounded-xl flex gap-1 border border-border-grey shadow-tight">
                    {[{ id: 'customer', label: 'Client' }, { id: 'instructor', label: 'Instructor' }].map((opt) => (
                        <button key={opt.id} type="button" onClick={() => setRole(opt.id)}
                            className={clsx("flex-1 py-3 px-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all", role === opt.id ? 'bg-forest text-white shadow-md' : 'text-slate-600 hover:bg-off-white')}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            <button type="button" onClick={handleGoogleAuth} disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-14 border border-charcoal/20 bg-white rounded-xl text-[12px] font-bold uppercase tracking-widest text-charcoal hover:bg-off-white transition-all mb-8 shadow-tight active:scale-[0.98]">
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Continue with Google
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-border-grey" />
                <span className="text-[10px] font-black text-muted-burgundy uppercase tracking-[0.3em]">or</span>
                <div className="flex-1 h-px bg-border-grey" />
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                    <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Doe" className="w-full px-5 h-12 border border-border-grey bg-white rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-burgundy transition-all" />
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Email Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@studio-vault.ph" className="w-full px-5 h-12 border border-border-grey bg-white rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-burgundy transition-all" />
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest">Password</label>
                        {!isSignUp && <Link href="/forgot-password" size="sm" className="text-[9px] text-slate-500 hover:text-burgundy font-bold uppercase tracking-widest">Forgot?</Link>}
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-5 h-12 border border-border-grey bg-white rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-burgundy transition-all" />
                </div>

                {message && (
                    <div className={clsx("text-[9px] font-bold uppercase tracking-widest p-4 rounded-lg text-center border animate-in fade-in", message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100')}>
                        {message.text}
                    </div>
                )}

                <button type="submit" disabled={loading} className="btn-forest w-full h-12 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] shadow-tight disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : (isSignUp ? 'Create Account' : 'Continue')}
                </button>

                <div className="text-center pt-6">
                    <button type="button" onClick={() => { setIsSignUp(!isSignUp); setMessage(null); setFullName(''); setEmail(''); setPassword('') }}
                        className="text-slate-600 hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.2em] transition-all">
                        {isSignUp ? 'Already have an account? Log in' : 'Don\'t have an account? Sign up'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default memo(AuthForm)
