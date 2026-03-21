import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    const next = searchParams.get('next') ?? '/verified'
    const remember = searchParams.get('remember') === '1'

    // `role_intent` is optionally passed from the login page when the user has
    // already selected a role on the sign-up tab before clicking "Continue with Google".
    // e.g.  /auth/callback?role_intent=instructor
    const roleIntent = searchParams.get('role_intent') as 'customer' | 'instructor' | 'studio' | null
    const ref = searchParams.get('ref') ?? ''

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Auth callback token exchange error:', error.message)
            // Even on error the email may already be confirmed server-side;
            // redirect gracefully rather than showing a blank page.
            return buildRedirect(origin, request, `/login?error=${encodeURIComponent(error.message)}`)
        }

        const user = data?.session?.user

        if (user) {
            const provider = user.app_metadata?.provider || (user.identities && user.identities[0]?.provider)
            const isOAuth = (provider && provider !== 'email') || user.app_metadata?.providers?.some((p: string) => p !== 'email')

            // ── OAuth Flow (Google, GitHub, etc.) ────────────────────────────
            if (isOAuth) {
                // Check whether a profile row already exists for this user.
                // There is no automatic DB trigger to create profiles on sign-up,
                // so we handle it here for every new OAuth user.
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id, role')
                    .eq('id', user.id)
                    .maybeSingle()

                if (!existingProfile) {
                    // ── Check for email collision with an existing email/password account ──
                    // This happens when Supabase auto-linking is disabled and a user who
                    // signed up with email/password tries to sign in with Google using the
                    // same email. Without linking, Supabase creates a new auth user with a
                    // different UUID, causing a duplicate profile.
                    if (user.email) {
                        const { data: emailCollision } = await supabase
                            .from('profiles')
                            .select('id, role')
                            .eq('email', user.email.toLowerCase())
                            .maybeSingle()

                        if (emailCollision) {
                            // An account already exists with this email — block the duplicate.
                            // Sign the OAuth user out to avoid a dangling session, then send
                            // them to login with a clear error message.
                            await supabase.auth.signOut()
                            const msg = encodeURIComponent(
                                'An account with this email already exists. Please sign in with your email and password instead.'
                            )
                            return buildRedirect(origin, request, `/login?error=${msg}`)
                        }
                    }

                    // ── New OAuth user: create their profile ─────────────────
                    const fullName =
                        user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] || 'User'

                    const avatarUrl =
                        user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ||
                        null

                    // Resolve referral code → referrer's user ID
                    let referredById: string | null = null
                    if (ref) {
                        const { data: referrer } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('referral_code', ref.toUpperCase())
                            .maybeSingle()
                        if (referrer && referrer.id !== user.id) {
                            referredById = referrer.id
                        }
                    }

                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: fullName,
                            avatar_url: avatarUrl,
                            ...(roleIntent ? { role: roleIntent } : {}),
                            ...(referredById ? { referred_by: referredById } : {}),
                        })

                    if (insertError) {
                        console.error('Profile creation error for OAuth user:', insertError.message)
                        // Redirect to /welcome so the user can complete setup manually
                        return buildRedirect(origin, request, '/welcome')
                    }

                    // Send new user to onboarding to collect phone, DOB, etc.
                    // If no roleIntent, go to /welcome to pick one.
                    const onboardingPath = roleIntent ? `/${roleIntent}/onboarding` : '/welcome'
                    return buildRedirect(origin, request, onboardingPath)
                }

                // ── Returning OAuth user: route to their dashboard ────────────
                if (existingProfile.role) {
                    const dashboard = getDashboard(existingProfile.role)
                    const response = buildRedirect(origin, request, dashboard)

                    // Mark device as verified since they used OAuth
                    const cookieOptions: any = { 
                        path: '/', 
                        sameSite: 'lax', 
                        secure: process.env.NODE_ENV === 'production', 
                        httpOnly: false,
                        maxAge: 14 * 24 * 60 * 60 // Remember for 14 days by default for OAuth
                    }
                    response.cookies.set(`otp_rem_${user.id.toLowerCase()}`, '1', cookieOptions)
                    response.cookies.set(`rem_me_${user.id.toLowerCase()}`, '1', cookieOptions)

                    return response
                }

                // Profile exists but role was never set (edge case) — pick a role
                return buildRedirect(origin, request, '/welcome')
            }
        }

        // ── 2FA magic-link completion ─────────────────────────────────────────
        // `next=2fa` is set by the login page when sending a post-password OTP link.
        if (next === '2fa' && user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const dashboard = getDashboard(profile?.role || '')
            const response = buildRedirect(origin, request, dashboard)

            const cookieOptions: any = { 
                path: '/', 
                sameSite: 'lax', 
                secure: process.env.NODE_ENV === 'production', 
                httpOnly: false 
            }
            if (remember) {
                cookieOptions.maxAge = 14 * 24 * 60 * 60
            }

            response.cookies.set(`otp_rem_${user.id.toLowerCase()}`, '1', cookieOptions)
            response.cookies.set(`rem_me_${user.id.toLowerCase()}`, '1', cookieOptions)

            return response
        }

        // ── Explicit Dashboard Redirect ─────────────────────────────────────
        // If next=dashboard is passed, resolve the specific dashboard for this user
        // (Bypasses the generic /verified success page)
        if (next === 'dashboard' && user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const dashboard = getDashboard(profile?.role || '')
            return buildRedirect(origin, request, dashboard)
        }

        // ── Security: Never redirect to /2fa ────────────────────────────────
        if (next === '2fa') {
            return buildRedirect(origin, request, '/login')
        }

        // ── Sign-up email confirmation → route to onboarding/dashboard ─────
        // `next=confirm` is set by the sign-up form so new users land in the
        // right place instead of the generic /verified page.
        if (next === 'confirm' && user) {
            // Apply referral code if present
            if (ref) {
                const { data: referrer } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('referral_code', ref.toUpperCase())
                    .maybeSingle()
                if (referrer && referrer.id !== user.id) {
                    await supabase
                        .from('profiles')
                        .update({ referred_by: referrer.id })
                        .eq('id', user.id)
                        .is('referred_by', null)
                }
            }
            // Route by the role they selected on sign-up (stored in user_metadata)
            const role = user.user_metadata?.role as string | undefined
            const onboardingPath = role ? `/${role}/onboarding` : '/welcome'
            return buildRedirect(origin, request, onboardingPath)
        }

        // ── Email-based auth (confirmation link, password reset, magic link) ──
        // If a referral code was embedded in the confirmation link, apply it now
        // — but only if the profile doesn't already have a referrer set.
        if (ref && user) {
            const { data: referrer } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', ref.toUpperCase())
                .maybeSingle()

            if (referrer && referrer.id !== user.id) {
                // Only update if referred_by is currently null (never overwrite)
                await supabase
                    .from('profiles')
                    .update({ referred_by: referrer.id })
                    .eq('id', user.id)
                    .is('referred_by', null)
            }
        }

        // Honor the `next` query param that was embedded in the email link.
        return buildRedirect(origin, request, next)
    }

    // ── Magic-link / OTP flow (token_hash + type params) ─────────────────
    // signInWithOtp sends the callback URL with ?token_hash=XXX&type=magiclink
    // instead of ?code=XXX, so the PKCE block above is never entered.
    const tokenHash = searchParams.get('token_hash')
    const tokenType = searchParams.get('type') as 'magiclink' | 'email' | null

    if (tokenHash && tokenType) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tokenType,
        })

        if (error) {
            console.error('Auth callback OTP verify error:', error.message)
            return buildRedirect(origin, request, `/login?error=${encodeURIComponent(error.message)}`)
        }

        const user = data?.user

        if (next === '2fa' && user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const dashboard = getDashboard(profile?.role || '')
            const response = buildRedirect(origin, request, dashboard)

            const cookieOptions: any = { 
                path: '/', 
                sameSite: 'lax', 
                secure: process.env.NODE_ENV === 'production', 
                httpOnly: false 
            }
            if (remember) {
                cookieOptions.maxAge = 14 * 24 * 60 * 60
            }

            response.cookies.set(`otp_rem_${user.id.toLowerCase()}`, '1', cookieOptions)
            response.cookies.set(`rem_me_${user.id.toLowerCase()}`, '1', cookieOptions)

            return response
        }

        // ── Security: Never redirect to /2fa ────────────────────────────────
        if (next === '2fa') {
            return buildRedirect(origin, request, '/login')
        }

        return buildRedirect(origin, request, next)
    }

    // No code or token_hash present — fall back to login
    return buildRedirect(origin, request, '/login')
}

/** Maps a user role string to its primary dashboard path. */
function getDashboard(role: string): string {
    const map: Record<string, string> = {
        admin: '/admin',
        instructor: '/instructor',
        studio: '/studio',
        customer: '/customer',
    }
    return map[role] ?? '/welcome'
}

/**
 * Builds a safe NextResponse redirect, respecting the x-forwarded-host
 * header that Vercel / reverse-proxies inject in production.
 */
function buildRedirect(origin: string, request: Request, path: string): NextResponse {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${path}`)
    } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${path}`)
    } else {
        return NextResponse.redirect(`${origin}${path}`)
    }
}
