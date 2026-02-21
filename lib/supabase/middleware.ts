import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

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
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Protected Routes Logic
    if (
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/register') &&
        !request.nextUrl.pathname.startsWith('/_next') && // Next.js internals
        !request.nextUrl.pathname.startsWith('/favicon.ico') && // Static asset
        request.nextUrl.pathname !== '/' // Landing page
    ) {
        // 1. Enforce Login for protected areas
        if (!user) {
            const protectedPrefixes = ['/instructor', '/studio', '/admin', '/customer', '/welcome', '/instructors', '/studios'];
            if (protectedPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix))) {
                const url = request.nextUrl.clone()
                url.pathname = '/login'
                return NextResponse.redirect(url)
            }
        } else {
            // 2. Enforce Role Locking (User is logged in)

            // Optimization: We could store role in metadata to avoid DB call, but for now we fetch.
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const role = profile?.role;
            const path = request.nextUrl.pathname;

            // A. No Role -> Force Welcome/Onboarding
            if (!role) {
                if (!path.startsWith('/welcome') && !path.startsWith('/api')) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/welcome'
                    return NextResponse.redirect(url)
                }
                // Allow /welcome
            }
            // B. Check Restrictions based on Role
            else {
                // Prevent access to /welcome if role is already set
                if (path.startsWith('/welcome')) {
                    const url = request.nextUrl.clone()
                    // Redirect to their default dashboard
                    if (role === 'admin') url.pathname = '/admin'
                    else if (role === 'instructor') url.pathname = '/instructor'
                    else if (role === 'studio') url.pathname = '/studio'
                    else url.pathname = '/customer'
                    return NextResponse.redirect(url)
                }

                // Customer: Cannot access /instructor (dashboard), /studio (dashboard), /admin
                // But CAN access /instructors/[id] and /studios/[id] (public profile pages)
                if (role === 'customer') {
                    if (path.startsWith('/instructor/') || path === '/instructor' || path.startsWith('/studio/') || path === '/studio' || path.startsWith('/admin')) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/customer'
                        return NextResponse.redirect(url)
                    }
                }
                // Instructor: Cannot access /studio (dashboard) or /admin
                // But CAN access /instructors/[id], /studios/[id], /customer
                else if (role === 'instructor') {
                    if (path.startsWith('/studio/') || path === '/studio' || path.startsWith('/admin')) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/instructor'
                        return NextResponse.redirect(url)
                    }
                }
                // Studio: Cannot access /instructor (dashboard) or /admin
                // But CAN access /instructors/[id], /studios/[id], /customer
                else if (role === 'studio') {
                    if (path.startsWith('/instructor/') || path === '/instructor' || path.startsWith('/admin')) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/studio'
                        return NextResponse.redirect(url)
                    }
                }
                // Admin: (Usually allows all, or restrict purely strictly)
            }
        }
    }

    return response
}
