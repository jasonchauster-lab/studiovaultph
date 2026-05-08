import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import PricingGroupsClient from './PricingGroupsClient'

export default async function PricingGroupsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    const { data: pricingGroups } = await supabase
        .from('pricing_groups')
        .select('*')
        .eq('studio_id', studio?.id)
        .order('created_at', { ascending: false })

    return (
        <StudioDashboardShell 
            title="Pricing Groups"
            breadcrumbs={[{ label: 'Directory' }, { label: 'Pricing Groups' }]}
        >
            <PricingGroupsClient studioId={studio?.id} initialGroups={pricingGroups || []} />
        </StudioDashboardShell>
    )
}
