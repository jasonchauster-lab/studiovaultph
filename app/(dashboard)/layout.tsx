import { createClient } from '@/lib/supabase/server'
import { redirect, unstable_rethrow } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { Playfair_Display, Inter, Lexend } from 'next/font/google'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'
import { getCachedUser, getCachedProfile, getCachedStudio, getCachedOutlets } from '@/lib/studio/data'
import clsx from "clsx";
import { SUBSCRIPTION_STATUS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: 'swap',
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    try {
        const user = await getCachedUser()
        
        const headersList = await headers()
        const host = headersList.get('host') || ''
        const isStudioPortal = host.includes('studiovault.co') || host.includes('studiovault.local')

        if (!user) {
            redirect('/login')
        }

        // 1. Fetch Profile and Studio in parallel
        const [profile, studioDataRaw] = await Promise.all([
            getCachedProfile(),
            getCachedStudio()
        ])
        let studioData: any = studioDataRaw
        
        // If no studio found via owner/staff relation, try to resolve by host or cookie (for customers)
        if (!studioData && isStudioPortal) {
            const subdomain = host.split('.')[0]
            const isMainDomain = subdomain === 'www' || subdomain === 'studiovault' || host === 'studiovault.co' || host === 'studiovault.local'
            
            if (!isMainDomain) {
                const { getStudioBySlug } = await import('@/lib/studio/website')
                studioData = await getStudioBySlug(subdomain)
            }
            
            if (!studioData) {
                const cookieStore = await cookies()
                const lastSlug = cookieStore.get('last_studio_slug')?.value
                if (lastSlug) {
                    const { getStudioBySlug } = await import('@/lib/studio/website')
                    studioData = await getStudioBySlug(lastSlug)
                }
            }
        }

        // 3. Fetch Outlets, Referral Config, and Membership in Parallel if studio resolved
        let outlets: any[] = []
        let referralConfig = null
        let studioMembership = null

        if (studioData) {
            try {
                const supabase = await createClient()
                const { getStudioReferralConfig } = await import('@/lib/actions/referral')
                const [outletsData, refData, memData] = await Promise.all([
                    getCachedOutlets(studioData.id, studioData.owner_id === user.id),
                    getStudioReferralConfig(studioData.id).catch(e => {
                        console.error('[Layout] Referral config error:', e)
                        return null
                    }),
                    supabase.from('customer_memberships').select('*').eq('user_id', user.id).eq('studio_id', studioData.id).maybeSingle()
                ])
                
                outlets = outletsData
                referralConfig = refData
                studioMembership = memData?.data || null
            } catch (err) {
                console.error('[Layout] Error in secondary data fetch:', err)
                // Fallback to minimal data
                outlets = []
                referralConfig = null
                studioMembership = null
            }
        }

        const avatarUrl = studioData?.logo_url 
            ? studioData.logo_url 
            : (profile?.avatar_url || "/default-avatar.svg");

        // 4. Plan Gating (Strict firewall for Studios)
        if (isStudioPortal && user && studioData && profile?.role !== 'admin') {
            const path = headersList.get('x-pathname') || ''
            const isFreeTier = !studioData.subscription_tier || studioData.subscription_tier === 'free'
            
            // Defensive check: only redirect if we are NOT already on an onboarding/register path
            const isWhitelistedPath = path.includes('/onboarding') || 
                                     path.includes('/register') || 
                                     path.includes('/logout') ||
                                     path.includes('identity-conflict') ||
                                     path.includes('/welcome')

            if (isFreeTier && !isWhitelistedPath) {
                console.log('[DashboardLayout] Redirecting to onboarding/plan (Free Tier & Non-Whitelisted Path)', { path, tier: studioData.subscription_tier })
                redirect('/studio/onboarding/plan')
            }
        }

        return (
            <DashboardLayoutClient 
                user={user ? { id: user.id, email: user.email } : null}
                profile={profile}
                studioData={studioData}
                outlets={outlets}
                avatarUrl={avatarUrl}
                isStudioPortal={isStudioPortal}
                referralConfig={referralConfig}
                studioMembership={studioMembership}
            >
                {children}
            </DashboardLayoutClient>
        )
    } catch (err: any) {
        unstable_rethrow(err)
        
        const digest = String(err?.digest || '')
        const message = String(err?.message || '')

        console.error('[DashboardLayout] CRITICAL layout crash:', message || err)
        
        // Final fallback: attempt a safe redirect
        try {
            redirect('/login')
        } catch (redirErr: any) {
            // Re-throw the redirect error to let Next.js handle it
            throw redirErr
        }
    }
}
