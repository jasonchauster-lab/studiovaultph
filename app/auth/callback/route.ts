import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // `next` is used for email-based auth redirects (e.g. confirmation link → /verified)
    const next = searchParams.get('next') ?? '/verified'

    // `role_intent` is optionally passed from the login page when the user has
    // already selected a role on the sign-up tab before clicking "Continue with Google".
    // e.g.  /auth/callback?role_intent=instructor
    const roleIntent = searchParams.get('role_intent') as 'customer' | 'instructor' | 'studio' | null

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
            const provider = user.app_metadata?.provider
            const isOAuth = provider && provider !== 'email'

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

                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: fullName,
                            avatar_url: avatarUrl,
                            // Pre-set role when the user had one selected on the sign-up tab
                            ...(roleIntent ? { role: roleIntent } : {}),
                        })

                    if (insertError) {
                        console.error('Profile creation error for OAuth user:', insertError.message)
                        // Redirect to /welcome so the user can complete setup manually
                        return buildRedirect(origin, request, '/welcome')
                    }

                    // Role was pre-selected → skip the welcome screen
                    if (roleIntent) {
                        return buildRedirect(origin, request, getDashboard(roleIntent))
                    }

                    // No role yet → welcome page for role selection
                    return buildRedirect(origin, request, '/welcome')
                }

                // ── Returning OAuth user: route to their dashboard ────────────
                if (existingProfile.role) {
                    return buildRedirect(origin, request, getDashboard(existingProfile.role))
                }

                // Profile exists but role was never set (edge case)
                return buildRedirect(origin, request, '/welcome')
            }
        }

        // ── Email-based auth (confirmation link, password reset, magic link) ──
        // Honor the `next` query param that was embedded in the email link.
        return buildRedirect(origin, request, next)
    }

    // No code present — fall back to login
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
