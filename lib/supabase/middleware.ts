import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLES, canAccessStudioPortal, isCustomer, isInstructor, isStudio, isAdmin } from '@/lib/auth/roles'

export async function updateSession(request: NextRequest, customHeaders?: Headers) {
    let response = NextResponse.next({
        request: {
            headers: customHeaders || request.headers,
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
                    const newResponse = NextResponse.next({
                        request: {
                            headers: customHeaders || request.headers,
                        },
                    })
                    // Copy existing cookies from old response
                    response.cookies.getAll().forEach(c => newResponse.cookies.set(c.name, c.value, c))
                    response = newResponse

                    // We need to decide whether to extend the session lifetime.
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

    // ── Role & Identity Fetching ──────────────────────────────────
    let role = user?.user_metadata?.role;
    let originPortal = user?.user_metadata?.origin_portal;

    if (user && (!role || !originPortal)) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, origin_portal')
            .eq('id', user.id)
            .single()
        
        if (profile) {
            role = profile.role;
            originPortal = profile.origin_portal;
        }
    }

    const path = request.nextUrl.pathname
    const otpCookie = userId ? request.cookies.get(`otp_rem_${userId.toLowerCase()}`)?.value : null
    const isOAuth = (user?.app_metadata?.provider && user.app_metadata.provider !== 'email') ||
                    (user?.app_metadata?.providers?.some((p: string) => p !== 'email'))
    
    const isVerified = user && (isOAuth || otpCookie === '1')

    if (user && !path.startsWith('/_next') && !path.startsWith('/favicon.ico')) {
        const hostname = request.headers.get('host') || ''
        console.log(`[Middleware] Path: ${path} | Host: ${hostname} | User: ${userId} | Verified: ${isVerified} | Role: ${role} | Origin: ${originPortal}`)
    }

    // Protected Routes Logic
    if (
        !path.startsWith('/auth') &&
        !path.startsWith('/register') &&
        !path.startsWith('/verified') &&
        !path.startsWith('/_next') &&
        !path.startsWith('/favicon.ico') &&
        path !== '/'
    ) {
        // ── 2FA Enforcement ──────────────────────────────────────────────
        if (user && !path.startsWith('/login')) {
            if (!isVerified) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return mergeResponseCookies(response, NextResponse.redirect(url))
            }
        }

        // 1. If user IS logged in but hitting /login, redirect to dashboard
        if (user && path.startsWith('/login')) {
            if (isVerified) {
                const hostname = request.headers.get('host') || ''
                const isStudioDomain = ['studiovault.co', 'studiovault.local'].some(d => hostname.includes(d))
                const targetPath = getDashboard(role, isStudioDomain);
                if (path !== targetPath) {
                    const url = request.nextUrl.clone()
                    url.pathname = targetPath;
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }
            }
        }

        // 2. Enforce Login for protected areas
        if (!user) {
            const protectedPrefixes = ['/instructor', '/studio', '/admin', '/customer', '/welcome', '/instructors', '/studios'];
            if (protectedPrefixes.some(prefix => path.startsWith(prefix))) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return mergeResponseCookies(response, NextResponse.redirect(url))
            }
        } else {
            const hostname = request.headers.get('host') || ''
            const isStudioDomain = ['studiovault.co', 'studiovault.local'].some(d => hostname.includes(d))

            // ── IDENTITY FIREWALL ──
            const isStorefrontPath = path.startsWith('/s/')
            if (isStudioDomain && !isStorefrontPath && originPortal === 'marketplace' && (isCustomer(role) || isInstructor(role))) {
                const { data: fullProfile } = await supabase
                    .from('profiles')
                    .select('first_name, contact_number, waiver_signed_at')
                    .eq('id', user.id)
                    .maybeSingle()

                const isIncomplete = !fullProfile?.first_name || !fullProfile?.contact_number
                const hasNoWaiver = !fullProfile?.waiver_signed_at
                const isOnboardingPath = path.includes('/onboarding') || path === '/identity-conflict'

                if ((isIncomplete || hasNoWaiver) && !isOnboardingPath) {
                    const lastStudioSlug = request.cookies.get('last_studio_slug')?.value || 'clubpilatesph'
                    const target = isIncomplete 
                        ? `/customer/onboarding?slug=${lastStudioSlug}`
                        : `/s/${lastStudioSlug}/onboarding/waiver`

                    const url = request.nextUrl.clone()
                    url.pathname = target.split('?')[0]
                    if (target.includes('?')) {
                        const params = new URLSearchParams(target.split('?')[1])
                        params.forEach((v, k) => url.searchParams.set(k, v))
                    }
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }

                if (originPortal === 'marketplace' && !path.startsWith('/customer')) {
                    if (path !== '/identity-conflict') {
                        const url = request.nextUrl.clone()
                        url.pathname = '/identity-conflict'
                        return mergeResponseCookies(response, NextResponse.redirect(url))
                    }
                }
            }

            if (!role || (isStudioDomain && isStudio(role))) {
                let hasStudio = false;
                if (isStudio(role) && isStudioDomain) {
                    const { data: studio } = await supabase
                        .from('studios')
                        .select('id')
                        .eq('owner_id', user.id)
                        .maybeSingle()
                    hasStudio = !!studio;
                }

                if (!role || (isStudioDomain && isStudio(role) && !hasStudio)) {
                    const systemPrefixes = ['/welcome', '/studio', '/admin', '/customer', '/instructor', '/api', '/auth', '/login']
                    if (!systemPrefixes.some(prefix => path.startsWith(prefix))) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/welcome'
                        return mergeResponseCookies(response, NextResponse.redirect(url))
                    }
                }
            }

            if (path.startsWith('/welcome')) {
                if (isStudioDomain && role && !isAdmin(role)) {
                    const { data: studio } = await supabase.from('studios').select('id').eq('owner_id', user.id).maybeSingle()
                    if (!studio) return response
                }

                const targetDashboard = getDashboard(role, isStudioDomain)
                if (path !== targetDashboard) {
                    const url = request.nextUrl.clone()
                    url.pathname = targetDashboard
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }
            }

            if (isStudioDomain) {
                const isPublicStorefrontPath = path.startsWith('/s/')
                const isStudioLandingPath = path === '/cms-home'
                const isAuthPath = path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/identity-conflict')

                if (isStudio(role) && !path.startsWith('/studio') && !isPublicStorefrontPath && !isStudioLandingPath) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/studio/website'
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }

                // Strictly block Instructors and Customers from CMS management area
                if (!isPublicStorefrontPath && !isStudioLandingPath && !isAuthPath && !canAccessStudioPortal(role)) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/identity-conflict'
                    return mergeResponseCookies(response, NextResponse.redirect(url))
                }
            } else {
                if (isCustomer(role)) {
                    if (path.startsWith('/studio/') || path === '/studio' || path.startsWith('/admin')) {
                        // Only block marketplace-originated customers
                        if (originPortal === 'marketplace') {
                            const url = request.nextUrl.clone()
                            url.pathname = '/identity-conflict'
                            return mergeResponseCookies(response, NextResponse.redirect(url))
                        }
                        // Otherwise allow (they might be a staff member with customer role? unlikely but safer)
                    }
                    if (path.startsWith('/instructor/') || path === '/instructor') {
                        const url = request.nextUrl.clone()
                        url.pathname = '/customer'
                        return mergeResponseCookies(response, NextResponse.redirect(url))
                    }
                } else if (isInstructor(role)) {
                    if (path.startsWith('/studio/') || path === '/studio' || path.startsWith('/admin')) {
                        // Only block marketplace-originated instructors
                        if (originPortal === 'marketplace') {
                            const url = request.nextUrl.clone()
                            url.pathname = '/identity-conflict'
                            return mergeResponseCookies(response, NextResponse.redirect(url))
                        }
                    }
                } else if (isStudio(role)) {
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

function mergeResponseCookies(source: NextResponse, dest: NextResponse) {
    source.cookies.getAll().forEach(cookie => {
        const { name, value, ...options } = cookie
        // @ts-ignore
        dest.cookies.set(name, value, options)
    })
    return dest
}

function getDashboard(role: string | undefined | null, isStudioDomain: boolean = false): string {
    if (isStudioDomain) {
        // If they are a studio owner or admin, they can go to their dashboard.
        // Otherwise, they are likely a customer/instructor from the marketplace and should see the identity conflict page.
        if (canAccessStudioPortal(role)) {
            return isAdmin(role) ? '/admin' : '/studio'
        }
        return '/identity-conflict'
    }

    if (isStudio(role)) return '/studio'
    if (isInstructor(role)) return '/instructor'
    if (isCustomer(role)) return '/customer'
    if (isAdmin(role)) return '/admin'
    
    return '/welcome'
}
