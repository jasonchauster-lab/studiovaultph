import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sendEmail } from '@/lib/email'
import WelcomeBrandedEmail from '@/components/emails/WelcomeBrandedEmail'
import { getStudioBrandingBySlug } from '@/lib/studio/branding'

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
    const plan = searchParams.get('plan')
    const billing = searchParams.get('billing')
    const host = request.headers.get('host') || ''
    const isStudioPortal = host.includes('studiovault.co') || host.includes('studiovault.local')
    const studioParam = searchParams.get('studio')
    const branchParam = searchParams.get('branch')
    
    // Fallback to breadcrumb cookie if parameters were lost during the redirect chain
    const cookieStore = await cookies()
    const contextCookie = cookieStore.get('sb_auth_context')?.value
    let cookieContext: { studio?: string, branch?: string } = {}
    if (contextCookie) {
        try {
            cookieContext = JSON.parse(decodeURIComponent(contextCookie))
        } catch (e) {
            console.error('Failed to parse auth context cookie:', e)
        }
    }

    const studio = studioParam || cookieContext.studio
    const branch = branchParam || cookieContext.branch

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
            console.error('Auth callback token exchange error:', error.message)
            return buildRedirect(origin, request, `/login?error=${encodeURIComponent(error.message)}`)
        }

        const user = data?.session?.user

        if (user) {
            const provider = user.app_metadata?.provider || (user.identities && user.identities[0]?.provider)
            const isOAuth = (provider && provider !== 'email') || user.app_metadata?.providers?.some((p: string) => p !== 'email')

            // ── OAuth Flow (Google, GitHub, etc.) ────────────────────────────
            if (isOAuth) {
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id, role, origin_portal')
                    .eq('id', user.id)
                    .maybeSingle()

                if (!existingProfile) {
                    // Check for email collision
                    if (user.email) {
                        const { data: emailCollision } = await supabase
                            .from('profiles')
                            .select('id, role')
                            .eq('email', user.email.toLowerCase())
                            .maybeSingle()

                        if (emailCollision && !isStudioPortal) {
                            await supabase.auth.signOut()
                            const msg = encodeURIComponent('An account with this email already exists. Your existing StudioVault account works here — please sign in with your email and password instead!')
                            return buildRedirect(origin, request, `/login?error=${msg}`)
                        }

                        // If it's a studio portal and we have a collision, we allow the link/sign-in
                        // The upsert below will handle updating or ensuring the profile
                    }

                    // Create/Update profile with portal origin
                    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
                    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
                    const role = roleIntent || (isStudioPortal ? 'studio' : 'customer')

                    const { error: upsertError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: user.id,
                            email: user.email,
                            full_name: fullName,
                            avatar_url: avatarUrl,
                            role: role,
                            origin_portal: isStudioPortal ? 'cms' : 'marketplace'
                        }, { onConflict: 'id' })

                    if (upsertError) {
                        console.error('Profile creation error for OAuth user:', upsertError.message)
                        // If it's a "returning" user who already had a profile but we somehow missed it, 
                        // we still want them to get in.
                        if (!upsertError.message.includes('duplicate key')) {
                            return buildRedirect(origin, request, '/welcome')
                        }
                    }

                    // ── Ensure Studio Membership & CRM Link ──
                    if (studio) {
                        const { data: studioData } = await supabase
                            .from('studios')
                            .select('id')
                            .eq('slug', studio)
                            .maybeSingle()
                        
                        if (studioData) {
                            const { ensureStudioMembership } = await import('@/lib/studio/membership-actions')
                            await ensureStudioMembership(user.id, studioData.id)
                        }
                    }

                    // ── Brand Recognition for New User ──
                    if (studio && user.email) {
                        const branding = await getStudioBrandingBySlug(studio);
                        if (branding) {
                            await sendEmail({
                                to: user.email,
                                subject: `Welcome to ${branding.name}!`,
                                fromName: branding.fromName,
                                react: WelcomeBrandedEmail({
                                    recipientName: fullName,
                                    studioName: branding.name,
                                    studioLogo: branding.logoUrl,
                                    primaryColor: branding.primaryColor,
                                    loginUrl: `${origin}/s/${studio}`
                                })
                            });
                        }
                    }

                    // Redirection for NEW user
                    if (role === 'studio') {
                        return buildRedirect(origin, request, '/studio?onboarding=true')
                    }
                    
                    const queryParams = new URLSearchParams()
                    if (plan) queryParams.set('plan', plan)
                    if (billing) queryParams.set('billing', billing)
                    if (studio) queryParams.set('studio', studio)
                    const query = queryParams.toString() ? '?' + queryParams.toString() : ''

                    const onboardingPath = await getOnboardingPath(supabase, user, role, studio) || `/${role}/onboarding`
                    return buildRedirect(origin, request, onboardingPath + query)
                }

                // ── Returning OAuth user ──
                let dashboard: string;
                
                // Admins ALWAYS go to /admin regardless of domain
                if (existingProfile.role === 'admin') {
                    dashboard = '/admin'
                }
                else if (studio && (existingProfile.role === 'customer' || existingProfile.role === 'instructor')) {
                    // If a studio slug is provided, return to that storefront
                    dashboard = branch ? `/s/${studio}/${branch}` : `/s/${studio}`
                }
                else if (isStudioPortal) {
                    // Studio-specific domain without a specific storefront slug goes to studio dashboard
                    dashboard = '/studio'
                } 
                else {
                    dashboard = getDashboard(existingProfile.role)
                }

                const queryParams = new URLSearchParams()
                if (plan) queryParams.set('plan', plan)
                if (billing) queryParams.set('billing', billing)
                if (studio) queryParams.set('studio', studio)
                const query = queryParams.toString() ? '?' + queryParams.toString() : ''

                // ── Ensure Studio Membership ──
                if (studio) {
                    const { data: studioData } = await supabase
                        .from('studios')
                        .select('id')
                        .eq('slug', studio)
                        .maybeSingle()
                    
                    if (studioData) {
                        const { ensureStudioMembership } = await import('@/lib/studio/membership-actions')
                        await ensureStudioMembership(user.id, studioData.id)
                    }
                }

                const onboarding = await getOnboardingPath(supabase, user, existingProfile.role, studio)
                const response = buildRedirect(origin, request, (onboarding || dashboard) + query)
                
                const cookieOptions: any = { 
                    path: '/', 
                    sameSite: 'lax', 
                    secure: process.env.NODE_ENV === 'production', 
                    httpOnly: true, // Secure cookie for middleware
                    maxAge: 14 * 24 * 60 * 60 
                }
                response.cookies.set(`otp_rem_${user.id.toLowerCase()}`, '1', cookieOptions)
                response.cookies.set(`rem_me_${user.id.toLowerCase()}`, '1', cookieOptions)
                
                // Set a non-httpOnly hint cookie for client-side UI checks
                response.cookies.set(`otp_rem_hint_${user.id.toLowerCase()}`, '1', { ...cookieOptions, httpOnly: false })
                return response
            }
        }

        // ── Standard Login Callback Redirects (OTP, etc.) ──
        if (next === '2fa' || next === 'dashboard' || next === 'confirm') {
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                const role = profile?.role || (isStudioPortal ? 'studio' : 'customer')
                
                const queryParams = new URLSearchParams()
                if (plan) queryParams.set('plan', plan)
                if (billing) queryParams.set('billing', billing)
                if (studio) queryParams.set('studio', studio)
                const query = queryParams.toString() ? '?' + queryParams.toString() : ''

                let dashboard;
                if (role === 'admin') {
                    dashboard = '/admin'
                } else if (studio && (role === 'customer' || role === 'instructor')) {
                    // ── Ensure Studio Membership & CRM Link ──
                    const { data: studioData } = await supabase
                        .from('studios')
                        .select('id')
                        .eq('slug', studio)
                        .maybeSingle()
                    
                    if (studioData) {
                        const { ensureStudioMembership } = await import('@/lib/studio/membership-actions')
                        await ensureStudioMembership(user.id, studioData.id)
                    }

                    dashboard = branch ? `/s/${studio}/${branch}` : `/s/${studio}`
                } else if (isStudioPortal) {
                    dashboard = '/studio'
                } else {
                    dashboard = getDashboard(role)
                }
                const onboarding = await getOnboardingPath(supabase, user, role, studio)
                const response = buildRedirect(origin, request, (onboarding || dashboard) + query)
                
                if (remember) {
                    const cookieOptions: any = { 
                        path: '/', 
                        sameSite: 'lax', 
                        secure: process.env.NODE_ENV === 'production', 
                        httpOnly: true, 
                        maxAge: 14 * 24 * 60 * 60 
                    }
                    response.cookies.set(`otp_rem_${user.id.toLowerCase()}`, '1', cookieOptions)
                    response.cookies.set(`rem_me_${user.id.toLowerCase()}`, '1', cookieOptions)
                    response.cookies.set(`otp_rem_hint_${user.id.toLowerCase()}`, '1', { ...cookieOptions, httpOnly: false })
                }
                
                return response
            }
        }

        return buildRedirect(origin, request, next)
    }

    // ── OTP Flow ─────────────────────────────────────────────────────────
    const tokenHash = searchParams.get('token_hash')
    const tokenType = searchParams.get('type') as 'magiclink' | 'email' | 'signup' | 'invite' | null

    if (tokenHash && tokenType) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType as any })

        if (error) {
            console.error('Auth callback OTP verify error:', error.message)
            return buildRedirect(origin, request, `/login?error=${encodeURIComponent(error.message)}`)
        }

        const user = data?.user
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
            
            // ── Brand Recognition for Email Signup ──
            if (tokenType === 'signup' && studio && user.email) {
                const branding = await getStudioBrandingBySlug(studio);
                if (branding) {
                    await sendEmail({
                        to: user.email,
                        subject: `Welcome to ${branding.name}!`,
                        fromName: branding.fromName,
                        react: WelcomeBrandedEmail({
                            recipientName: profile?.full_name || user.user_metadata?.full_name || 'New Member',
                            studioName: branding.name,
                            studioLogo: branding.logoUrl,
                            primaryColor: branding.primaryColor,
                            loginUrl: `${origin}/s/${studio}`
                        })
                    });
                }
            }

            const queryParams = new URLSearchParams()
            if (plan) queryParams.set('plan', plan)
            if (billing) queryParams.set('billing', billing)
            if (studio) queryParams.set('studio', studio)
            const query = queryParams.toString() ? '?' + queryParams.toString() : ''

            const role = profile?.role || (isStudioPortal ? 'studio' : 'customer')
            let dashboard;
            if (role === 'admin') {
                dashboard = '/admin'
            } else if (studio && (role === 'customer' || role === 'instructor')) {
                // ── Ensure Studio Membership & CRM Link ──
                const { data: studioData } = await supabase
                    .from('studios')
                    .select('id')
                    .eq('slug', studio)
                    .maybeSingle()
                
                if (studioData) {
                    const { ensureStudioMembership } = await import('@/lib/studio/membership-actions')
                    await ensureStudioMembership(user.id, studioData.id)
                }

                dashboard = branch ? `/s/${studio}/${branch}` : `/s/${studio}`
            } else if (isStudioPortal) {
                dashboard = '/studio'
            } else {
                dashboard = getDashboard(role)
            }
            const onboarding = await getOnboardingPath(supabase, user, role, studio)
            return buildRedirect(origin, request, (onboarding || dashboard) + query)
        }

        return buildRedirect(origin, request, next)
    }

    return buildRedirect(origin, request, '/login')
}

async function getOnboardingPath(supabase: any, user: any, role: string, studioSlug?: string) {
    const { data: profile } = await supabase.from('profiles').select('first_name, contact_number').eq('id', user.id).single()
    
    const isProfileIncomplete = !profile?.first_name || !profile?.contact_number
    
    if (isProfileIncomplete && (role === 'customer' || role === 'instructor')) {
        return studioSlug ? `/s/${studioSlug}/onboarding` : `/${role}/onboarding`
    }
    
    if (studioSlug && (role === 'customer' || role === 'instructor')) {
        // Check for waiver
        const { data: studio } = await supabase.from('studios').select('id').eq('slug', studioSlug).maybeSingle()
        if (studio) {
             const { data: waiver } = await supabase.from('waiver_consents').select('id').eq('user_id', user.id).eq('studio_id', studio.id).maybeSingle()
             if (!waiver) {
                 return `/s/${studioSlug}/onboarding/waiver`
             }
        }
    }
    
    return null
}

function getDashboard(role: string): string {
    const map: Record<string, string> = {
        admin: '/admin',
        instructor: '/instructor',
        studio: '/studio',
        customer: '/customer',
    }
    return map[role] ?? '/studio'
}

function buildRedirect(origin: string, request: Request, path: string): NextResponse {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = request.headers.get('host') || ''
    const isLocalEnv = process.env.NODE_ENV === 'development'

    // Use current request host to maintain domain-awareness (especially for .co vs .com)
    const protocol = (host.includes('localhost') || host.includes('.local')) ? 'http' : 'https'
    const currentOrigin = `${protocol}://${host}`

    const response = isLocalEnv 
        ? NextResponse.redirect(`${currentOrigin}${path}`)
        : forwardedHost 
            ? NextResponse.redirect(`https://${forwardedHost}${path}`)
            : NextResponse.redirect(`${currentOrigin}${path}`)

    // Clear the breadcrumb cookie if it exists
    response.cookies.delete('sb_auth_context')
    
    return response
}

