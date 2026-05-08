import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import ApprovalsClient from './ApprovalsClient'

export default async function ManualApprovalsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (!studio) notFound()

    // 1. Fetch plans via RPC (bypasses RLS issues for the dashboard)
    const { data: plans, error: rpcError } = await supabase
        .rpc('get_pending_approvals_v1', {
            p_studio_id: studio.id
        });

    if (rpcError) {
        console.error('[ManualApprovalsPage] RPC error:', rpcError);
    }

    return (
        <StudioDashboardShell 
            title="Manual Approvals"
            description="Verify and approve manual payments (GCash, Bank Transfer)"
            breadcrumbs={[{ label: 'Sales', href: '/studio/sales' }, { label: 'Manual Approvals' }]}
        >
            <ApprovalsClient initialPlans={plans || []} />
        </StudioDashboardShell>
    )
}
