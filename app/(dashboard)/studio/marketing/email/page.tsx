import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedStudio } from '@/lib/studio/data'
import { verifyStudioAccess } from '@/lib/studio/auth'
import EmailMarketingPageClient from './EmailMarketingPageClient'

export default async function EmailMarketingPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) redirect('/login')

    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    const { isOwner, permissions } = await verifyStudioAccess(studio.id)
    if (!isOwner && !permissions?.manage_marketing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-500">You do not have permission to manage marketing campaigns.</p>
            </div>
        )
    }

    // Fetch campaigns
    const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: false })

    // Determine limit
    const tier = studio.subscription_tier || 'starter'
    const limits: Record<string, number> = {
        'starter': 0,
        'team': 2000,
        'pro': 2000,
        'premium': 5000,
        'business': 5000
    }

    const usage = {
        sent: studio.monthly_marketing_sent || 0,
        limit: limits[tier] || 0,
        resetAt: studio.marketing_limit_reset_at || new Date().toISOString()
    }

    return (
        <EmailMarketingPageClient 
            studio={studio}
            campaigns={campaigns || []}
            usage={usage}
        />
    )
}
