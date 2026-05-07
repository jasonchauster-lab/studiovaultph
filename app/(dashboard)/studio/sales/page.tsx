import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getEarningsData } from '../earnings/actions'
import SalesPageClient from './SalesPageClient'

export default async function SalesPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { range } = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (!studio) notFound()

    // 1. Fetch pending customer plans for approval
    const { data: pendingPlans } = await supabase
        .from('customer_plans')
        .select(`
            *,
            packages(name),
            memberships(name),
            profiles!user_id(full_name, email)
        `)
        .eq('studio_id', studio.id)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false });

    // 2. Fetch Earnings Data (using the updated RPC)
    const { transactions, error } = await getEarningsData(studio.id)

    // 3. Fetch Packages and Memberships for the Add Transaction Modal
    const { data: packages } = await supabase
        .from('packages')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('status', 'active')
    
    const { data: memberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('status', 'active')

    if (error) return <div className="p-8 text-red-600">Error: {error}</div>

    return (
        <SalesPageClient 
            studio={studio}
            pendingPlans={pendingPlans || []}
            transactions={transactions || []}
            packages={packages || []}
            memberships={memberships || []}
        />
    )
}
