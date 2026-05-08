import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import AddCustomerClient from './AddCustomerClient'

export default async function AddCustomerPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    // Fetch pricing groups for the dropdown in step 2
    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    const { data: pricingGroups } = await supabase
        .from('pricing_groups')
        .select('id, name')
        .eq('studio_id', studio?.id)

    return (
        <StudioDashboardShell 
            title="Add new customer"
            breadcrumbs={[
                { label: 'Directory', href: '/studio/customers' },
                { label: 'Customers', href: '/studio/customers' },
                { label: 'Add new customer' }
            ]}
        >
            <AddCustomerClient 
                pricingGroups={pricingGroups || []} 
                studioId={studio?.id}
            />
        </StudioDashboardShell>
    )
}
