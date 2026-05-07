import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import BrandedConfirmationEmail from '@/components/emails/BrandedConfirmationEmail'
import ResetPasswordEmail from '@/components/emails/ResetPasswordEmail'

/**
 * Supabase Auth Hook — Custom Email Sender
 * 
 * This endpoint is called by Supabase's Auth system instead of its built-in
 * email sender. It allows us to send studio-branded confirmation emails
 * based on the user's signup context (which studio storefront they signed up from).
 * 
 * Configure in Supabase Dashboard:
 *   Authentication → Hooks → Send Email → Enable → HTTP
 *   URL: https://your-domain.com/api/auth/send-email
 *   Secret: CRON_SECRET from .env.local
 */
export async function POST(request: NextRequest) {
    try {
        // Verify the request using a query parameter key (bypassing strict Svix header requirements)
        const { searchParams } = new URL(request.url)
        const providedKey = searchParams.get('key')
        const expectedSecret = process.env.CRON_SECRET
        
        if (!providedKey || providedKey !== expectedSecret) {
            console.error('[Auth Hook] Unauthorized: Invalid or missing key')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload = await request.json()
        
        // Supabase Auth Hook payload structure:
        // { user, email_data: { token, token_hash, redirect_to, email_action_type } }
        const { user, email_data } = payload

        if (!user?.email || !email_data) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        const { token_hash, redirect_to, email_action_type } = email_data
        const userEmail = user.email
        const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0]

        // Build the confirmation URL using the token_hash
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to || '')}`

        // Determine studio branding from user metadata or redirect URL
        let studioSlug: string | null = null

        // 1. Check user metadata first (set by AuthForm during signup)
        if (user.user_metadata?.studio_slug) {
            studioSlug = user.user_metadata.studio_slug
        }

        // 2. Fallback: extract from the redirect URL
        if (!studioSlug && redirect_to) {
            try {
                const redirectUrl = new URL(redirect_to)
                studioSlug = redirectUrl.searchParams.get('studio')
            } catch {
                // Invalid URL, skip
            }
        }

        // Fetch studio branding if we have a slug
        let branding: { name: string; logoUrl?: string; primaryColor?: string; fromName: string } | null = null
        if (studioSlug) {
            const supabase = await createAdminClient()
            const { data: studio } = await supabase
                .from('studios')
                .select('id, name, logo_url, website_config')
                .eq('slug', studioSlug)
                .single()

            if (studio) {
                const config = studio.website_config as any
                branding = {
                    name: studio.name,
                    logoUrl: studio.logo_url || undefined,
                    primaryColor: config?.theme?.primaryColor || '#1a1f2c',
                    fromName: `${studio.name} via StudioVault`
                }
            }
        }

        // Route to the correct email type
        switch (email_action_type) {
            case 'signup': {
                await sendEmail({
                    to: userEmail,
                    subject: branding 
                        ? `Confirm your email for ${branding.name}`
                        : 'Confirm Your Signup',
                    fromName: branding?.fromName || 'StudioVault PH',
                    react: BrandedConfirmationEmail({
                        confirmationUrl,
                        recipientName: userName,
                        studioName: branding?.name,
                        studioLogo: branding?.logoUrl,
                        primaryColor: branding?.primaryColor,
                    })
                })
                break
            }

            case 'recovery': {
                await sendEmail({
                    to: userEmail,
                    subject: 'Reset Your Password',
                    fromName: branding?.fromName || 'StudioVault PH',
                    react: ResetPasswordEmail({
                        resetUrl: confirmationUrl,
                    })
                })
                break
            }

            case 'magic_link':
            case 'email_change': {
                // For other types, send a generic branded confirmation
                await sendEmail({
                    to: userEmail,
                    subject: branding 
                        ? `Verify your email for ${branding.name}`
                        : 'Verify Your Email',
                    fromName: branding?.fromName || 'StudioVault PH',
                    react: BrandedConfirmationEmail({
                        confirmationUrl,
                        recipientName: userName,
                        studioName: branding?.name,
                        studioLogo: branding?.logoUrl,
                        primaryColor: branding?.primaryColor,
                    })
                })
                break
            }

            default:
                console.warn(`[Auth Hook] Unhandled email type: ${email_action_type}`)
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[Auth Hook] Send email failed:', error)
        // Return 200 even on failure — Supabase will retry on non-200 responses,
        // and we don't want to block auth flows if email sending fails.
        return NextResponse.json({ success: false, error: 'Email send failed' })
    }
}
