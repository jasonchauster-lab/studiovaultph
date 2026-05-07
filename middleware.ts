import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
 
// --- CONSTANTS ---
const MAIN_DOMAINS = [
    'studiovaultph.com',
    'studiovaultph.local',
    'localhost',
].filter(Boolean)

const STUDIO_DOMAINS = [
    'studiovault.co',
    'studiovault.local',
].filter(Boolean)

const RESERVED_PATHS = [
    's', 'cms-home', 'studio', 'login', 'register', 'pricing', 'dashboard', 
    'auth', 'support', 'privacy', 'terms-of-service', 'admin', 'instructor', 
    'customer', 'welcome', 'identity-conflict', 'debug', 'debug-support'
]

// Simple in-memory cache for custom domains
// Note: In serverless environments, this is per-instance and volatile
const domainCache = new Map<string, { slug: string, tier: string, expiry: number }>()
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

export async function middleware(request: NextRequest) {
    const url = request.nextUrl
    const hostname = request.headers.get('host') || ''
    const path = url.pathname
    
    // Skip middleware for static assets and internal Next.js paths early
    if (path.startsWith('/_next') || path.startsWith('/api') || path.includes('.')) {
        return NextResponse.next()
    }

    // Set x-pathname header to be able to read it in server components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', path)
    
    const isMainDomain = MAIN_DOMAINS.some(domain => hostname.includes(domain))
    const isStudioDomain = STUDIO_DOMAINS.some(domain => hostname.includes(domain))

    // 1. Handle Studio Domain (studiovault.co)
    if (isStudioDomain) {
        const pathSegments = path.split('/').filter(Boolean)
        const slug = pathSegments[0]
        const isReserved = RESERVED_PATHS.some(reserved => path.startsWith(`/${reserved}`))

        // If it's just the root domain (studiovault.co/), show the CMS landing page
        if (path === '/' || path === '') {
            return NextResponse.rewrite(new URL(`/cms-home${url.search}`, request.url), {
                request: { headers: requestHeaders },
            })
        }

        // If it's an official system route, it NEEDS session management
        if (isReserved) {
            return await updateSession(request, requestHeaders)
        }

        // Otherwise, it's a slug (studiovault.co/my-studio), rewrite to storefront
        // OPTIMIZATION: Most storefront pages are public. We only need updateSession for specific paths like /checkout or /profile.
        // For now, we'll let it pass without updateSession unless they are in a reserved path.
        // This makes storefront browsing O(0) DB hits for auth.
        const remainingPath = path.replace(`/${slug}`, '')
        return NextResponse.rewrite(
            new URL(`/s/${slug}${remainingPath}${url.search}`, request.url),
            {
                request: { headers: requestHeaders },
            }
        )
    }

    // 2. Handle Marketplace Domain (studiovaultph.com)
    // Only run updateSession for the main domain if they are hitting a path that might need auth.
    // Landing page is fine without it.
    if (isMainDomain && path === '/') {
        // If it's just the landing page, we can skip updateSession unless we want to show "Dashboard" button.
        // For maximum performance, we can skip it. But let's keep it for now for DX.
        return await updateSession(request, requestHeaders)
    }

    // 3. Handle Custom Domain Routing
    if (!isMainDomain && !isStudioDomain) {
        // Check cache first (Operational Hardening: Sub-1ms edge lookups)
        const cached = domainCache.get(hostname)
        if (cached && cached.expiry > Date.now()) {
            if (cached.slug && cached.tier === 'pro') {
                return NextResponse.rewrite(new URL(`/s/${cached.slug}${path}`, request.url), {
                    request: { headers: requestHeaders }
                })
            }
            // If it's a negative cache (no studio found), let it fall through
            if (!cached.slug) return NextResponse.next()
        }

        try {
            const supabase = await createClient()
            const { data: studio, error } = await supabase
                .from('studios')
                .select('slug, subscription_tier')
                .eq('custom_domain', hostname)
                .single()

            if (error && error.code !== 'PGRST116') {
                // DB Error (Operational Resilience: Fallback to stale cache if available)
                if (cached?.slug) {
                    return NextResponse.rewrite(new URL(`/s/${cached.slug}${path}`, request.url), {
                        request: { headers: requestHeaders }
                    })
                }
                throw error
            }

            // Cache the result (5-minute TTL)
            domainCache.set(hostname, { 
                slug: studio?.slug || '', 
                tier: studio?.subscription_tier || '', 
                expiry: Date.now() + CACHE_TTL 
            });

            if (studio?.slug && studio.subscription_tier === 'pro') {
                return NextResponse.rewrite(new URL(`/s/${studio.slug}${path}`, request.url), {
                    request: {
                        headers: requestHeaders
                    }
                })
            }
        } catch (err) {
            console.error(`[Middleware] Custom domain lookup failed for ${hostname}:`, err)
            // Safety fallback: If we can't verify the domain, don't crash, just proceed
            return NextResponse.next()
        }
    }

    // Default: Protected areas or fallback
    const protectedPrefixes = ['/instructor', '/studio', '/admin', '/customer', '/welcome', '/auth', '/login', '/register'];
    if (protectedPrefixes.some(prefix => path.startsWith(prefix))) {
        return await updateSession(request, requestHeaders)
    }

    return NextResponse.next({
        request: { headers: requestHeaders }
    })
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images (public images)
         * - api/cron (background tasks secured by secret)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|mp4|webm)$|api/cron).*)',
    ],
}
