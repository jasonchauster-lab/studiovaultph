import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import WaiverFormSettingsClient from '@/app/(dashboard)/studio/settings/waiver-form/WaiverFormSettingsClient'
import { getWaiversAction } from '@/lib/actions/waiver'
import { getCachedStudio } from '@/lib/studio/data'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'

export default async function OnlineStoreWaiverFormPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const studio = await getCachedStudio()
    if (!studio) notFound()

    return (
        <StudioDashboardShell
            title="Waiver Form"
            description="Manage the waiver templates customers accept before participating in services."
            breadcrumbs={[
                { label: 'Online Store', href: '/studio/online-store' },
                { label: 'Waiver Form' },
            ]}
        >
            <Suspense fallback={<div className="p-20 text-center text-zinc-400 animate-pulse">Loading waiver templates...</div>}>
                <WaiverDataWrapper slug={studio.slug} />
            </Suspense>
        </StudioDashboardShell>
    )
}

async function WaiverDataWrapper({ slug }: { slug: string }) {
    const waivers = await getWaiversAction()
    return (
        <div className="space-y-8">
            <OnlineStorePageIntro
                eyebrow="Compliance"
                title="Keep waiver templates clear, current, and easy to manage."
                description="Waivers protect the business and set expectations before a customer participates. Keep them aligned with your legal documents and cancellation rules."
                primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                secondaryAction={{ label: 'Preview Waiver Layout', href: `/s/${slug}/onboarding/waiver?preview=true` }}
                metrics={[
                    { label: 'Templates', value: String(waivers.length) },
                    { label: 'Active', value: String(waivers.filter((waiver) => waiver.status === 'Active').length) },
                ]}
            />

            <WaiverFormSettingsClient waivers={waivers} />
        </div>
    )
}
