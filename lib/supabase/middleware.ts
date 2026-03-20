import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    let userId: string | undefined

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })

                    // We need to decide whether to extend the session lifetime.
                    // If we have a userId, we check for a user-specific cookie.
                    // If we don't have it yet (e.g. initial login), we fall back to a generic one.
                    const genericRememberMe = request.cookies.get('remember_me')?.value === '1'
                    
                    cookiesToSet.forEach(({ name, value, options }) => {
                        let shouldExtend = genericRememberMe
                        
                        if (userId) {
                            const userRemMe = request.cookies.get(`rem_me_${userId.toLowerCase()}`)?.value
                            if (userRemMe !== undefined) shouldExtend = userRemMe === '1'
                        }

                        const finalOptions = (shouldExtend && name.includes('auth-token'))
                            ? { ...options, maxAge: 14 * 24 * 60 * 60 }
                            : options
                        response.cookies.set(name, value, finalOptions)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id

    // ── Diagnostic Logging (Server-side) ──────────────────────────────
    const path = request.nextUrl.pathname
    const otpCookie = userId ? request.cookies.get(`otp_rem_${userId.toLowerCase()}`)?.value : null
    const isOAuth = user?.app_metadata?.provider && user.app_metadata.provider !== 'email'
    
    const isVerified = user && (isOAuth || otpCookie === '1' || otpCookie?.toLowerCase() === userId?.toLowerCase())

    if (user && !path.startsWith('/_next') && !path.startsWith('/favicon.ico')) {
        console.log(`[Middleware] Path: ${path} | User: ${userId} | OTP Cookie: ${otpCookie || 'MISSING'} | Verified: ${isVerified}`)
    }

    // Protected Routes Logic
    if (
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/register') &&
        !request.nextUrl.pathname.startsWith('/verified') && // Allow verification success page
        !request.nextUrl.pathname.startsWith('/_next') && // Next.js internals
        !request.nextUrl.pathname.startsWith('/favicon.ico') && // Static asset
        request.nextUrl.pathname !== '/' // Landing page
    ) {
        // ── 2FA Enforcement ──────────────────────────────────────────────
        // If they have a session but aren't remembered on this device/browser,
        // force them to /login (where they will land on the OTP step).
        if (user && !request.nextUrl.pathname.startsWith('/login')) {
            if (!isVerified) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return mergeResponseCookies(response, NextResponse.redirect(url))
            }
        }

        // 1. If user IS logged in but hitting /login, redirect to dashboard
        if (user && request.nextUrl.pathname.startsWith('/login')) {
            // Skip redirect if they still need 2FA
            if (isVerified) {
                let role = user.user_metadata?.role;
                if (!role) {
                    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    role = profile?.role;
                }
                const url = request.nextUrl.clone()
                url.pathname = getDashboard(role);
                return mergeResponseCookies(response, NextResponse.redirect(url))
            }
        }

        // 2. Enforce Login for protected areas
        if (!user) {
            const protectedPrefixes = ['/instructor', '/studio', '/admin', '/customer', '/welcome', '/instructors', '/studios'];
            if (protectedPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix))) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return mergeResponseCookies(response, NextResponse.redirect(url))
            }
        } else {
            // 2. Enforce Role Locking (User is logged in)

            let role = user.user_metadata?.role;
            if (!role) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                role = profile?.role;
            }

            // A. No Role -> Force Welcome/Onboarding
            if (!role) {
                if (!path.startsWith('/welcome') && !path.startsWith('/api')) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/welcome'
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }
            }
            // B. Check Restrictions based on Role
            else {
                if (path.startsWith('/welcome')) {
                    const url = request.nextUrl.clone()
                    url.pathname = getDashboard(role);
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }

                if (role === 'customer') {
                    if (path.startsWith('/instructor/') || path === '/instructor' || path.startsWith('/studio/') || path === '/studio' || path.startsWith('/admin')) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/customer'
                        return mergeResponseCookies(response, NextResponse.redirect(url))
                    }
                }
                else if (role === 'instructor') {
                    if (path.startsWith('/studio/') || path === '/studio' || path.startsWith('/admin')) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/instructor'
                        return mergeResponseCookies(response, NextResponse.redirect(url))
                    }
                }
                else if (role === 'studio') {
                    if (path.startsWith('/instructor/') || path === '/instructor' || path.startsWith('/admin')) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/studio'
                        return mergeResponseCookies(response, NextResponse.redirect(url))
                    }
                }
            }
        }
    }

    return response
}

/**
 * Merges cookies from a source response into a destination response (e.g. a redirect).
 * This ensures that Supabase session refreshes are not lost during redirects.
 */
function mergeResponseCookies(source: NextResponse, dest: NextResponse) {
    source.cookies.getAll().forEach(cookie => {
        const { name, value, ...options } = cookie
        // @ts-ignore - options matches the expected shape but TS is strict about the exact interface
        dest.cookies.set(name, value, options)
    })
    return dest
}

function getDashboard(role: string | undefined | null): string {
    const map: Record<string, string> = { admin: '/admin', instructor: '/instructor', studio: '/studio', customer: '/customer' }
    return map[role ?? ''] ?? '/welcome'
}
