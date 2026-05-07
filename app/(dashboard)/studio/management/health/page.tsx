import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { verifyStudioAccess } from '@/lib/studio/auth'
import HealthClient from './HealthClient'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { getCachedStudio } from '@/lib/studio/data'

export default async function SystemHealthPage() {
    const supabase = await createClient()
    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    const { isOwner, permissions } = await verifyStudioAccess(studio.id)
    if (!isOwner && !permissions.manage_settings) {
        redirect('/studio')
    }

    // Fetch initial logs
    const { data: logs } = await supabase
        .from('payment_webhook_logs')
        .select('*')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <StudioDashboardShell 
            title="System Health"
            breadcrumbs={[
                { label: 'Management', href: '/studio/management' },
                { label: 'System Health' }
            ]}
        >
            <HealthClient 
                studioId={studio.id} 
                initialLogs={logs || []} 
            />
        </StudioDashboardShell>
    )
}
