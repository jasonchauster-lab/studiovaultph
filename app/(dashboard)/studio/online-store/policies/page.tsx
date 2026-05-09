import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import PoliciesSettingsClient from './PoliciesSettingsClient'
import { getCachedStudio } from '@/lib/studio/data'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'

interface PolicyRecord {
    id: string
    title: string
    content: string
    type: string | null
    status: string | null
    updated_at: string | null
}

export default async function PoliciesSettingsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const studio = await getCachedStudio() as any
    if (!studio) notFound()

    // Fetch existing policies
    let policies: PolicyRecord[] = []
    try {
        const { data, error } = await supabase
            .from('studio_policies')
            .select('*')
            .eq('studio_id', studio.id)
            .order('created_at', { ascending: false })

        if (!error && data) {
            policies = data
        }
    } catch (err) {
        // Table may not exist yet
        console.warn('studio_policies query failed:', err)
    }

    return (
        <StudioDashboardShell 
            title="Store Policies"
            description="Define customer-facing booking, refund, and cancellation rules for your storefront."
            breadcrumbs={[
                { label: 'Online Store', href: '/studio/online-store' }, 
                { label: 'Store Policies' }
            ]}
        >
            <div className="space-y-8">
                <OnlineStorePageIntro
                    eyebrow="Compliance"
                    title="Set the storefront rules customers agree to when they book."
                    description="Policies define what happens around booking, refunds, cancellations, and no-shows. Keep these rules visible, consistent, and aligned with your waiver and legal documents."
                    primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    secondaryAction={{ label: 'View Live Site', href: `/s/${studio.slug}` }}
                    metrics={[
                        { label: 'Policies', value: String(policies.length) },
                        { label: 'Late Cancel Window', value: `${studio.late_cancel_hours ?? 12}h` },
                    ]}
                />

                <PoliciesSettingsClient 
                    policies={policies} 
                    studio={{ 
                        id: studio.id, 
                        slug: studio.slug,
                        late_cancel_hours: studio.late_cancel_hours ?? 12,
                        no_show_penalty: studio.no_show_penalty ?? true,
                        website_config: studio.website_config || {}
                    }} 
                />
            </div>
        </StudioDashboardShell>
    )
}
