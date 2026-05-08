import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import CustomerDetailClient from './CustomerDetailClient'

interface CustomerPageProps {
    params: { id: string }
}

export default async function CustomerDetailPage({ params }: CustomerPageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Use Admin Client to bypass RLS for CRM data
    const supabaseAdmin = await createAdminClient()

    // Fetch the studio context (handle both Owner and Staff)
    let { data: studio } = await supabaseAdmin
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .maybeSingle()

    if (!studio) {
        const { data: membership } = await supabaseAdmin
            .from('studio_members')
            .select('studio_id, studios(id, name)')
            .eq('user_id', user.id)
            .maybeSingle()
        
        if (membership?.studios) {
            studio = membership.studios as any
        }
    }

    // Fetch profile
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

    if (!profile) notFound()

    // Fetch related data (bookings, packages, memberships, transactions, etc.)
    const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select(`
            *,
            slots:slots!inner(
                *,
                instructor:profiles!instructor_id(full_name)
            )
        `)
        .eq('client_id', id)
        .eq('studio_id', studio?.id)
        .order('created_at', { ascending: false })

    // Fetch transactions from bookings
    const { data: bookingTransactions } = await supabaseAdmin
        .from('bookings')
        .select('price_breakdown, created_at, status')
        .eq('client_id', id)
        .eq('studio_id', studio?.id)
    
    const bookingsSpending = bookingTransactions?.reduce((sum, b) => sum + Number(b.price_breakdown?.studio_fee || 0), 0) || 0

    // Fetch transactions from plans (packages & memberships)
    const { data: allPlans } = await supabaseAdmin
        .from('customer_plans')
        .select('*, packages(name), memberships(name)')
        .eq('user_id', id)
        .eq('studio_id', studio?.id)

    const plansSpending = allPlans
        ?.filter(p => p.status === 'active' || p.status === 'completed' || p.status === 'expired')
        .reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0

    const totalSpending = bookingsSpending + plansSpending

    // Map plans for the client components
    const mappedPackages = allPlans
        ?.filter(p => p.plan_type === 'package')
        .map(p => ({
            ...p,
            package_name: p.packages?.name || 'Class Package'
        })) || []

    const mappedMemberships = allPlans
        ?.filter(p => p.plan_type === 'membership')
        .map(p => ({
            ...p,
            membership_name: p.memberships?.name || 'Studio Membership'
        })) || []

    // Fetch the customer's active wallet/membership status for the studio
    const { data: customerMemberships } = await supabaseAdmin
        .from('customer_memberships')
        .select('*')
        .eq('user_id', id)
        .eq('studio_id', studio?.id)
    const walletMembership = customerMemberships?.[0] || null

    // Fetch studio wallet transactions
    const { data: walletTransactions } = await supabaseAdmin
        .from('studio_wallet_transactions')
        .select('*')
        .eq('user_id', id)
        .eq('studio_id', studio?.id)
        .order('created_at', { ascending: false })

    return (
        <StudioDashboardShell 
            title={profile.full_name}
            breadcrumbs={[
                { label: 'Directory', href: '/studio/customers' },
                { label: 'Customers', href: '/studio/customers' },
                { label: profile.full_name }
            ]}
        >
            <CustomerDetailClient 
                profile={{
                    ...profile,
                    phone: profile.contact_number // Map database contact_number to expected phone prop
                }} 
                bookings={bookings || []}
                totalSpending={totalSpending}
                studio={studio}
                membership={walletMembership}
                packages={mappedPackages}
                memberships={mappedMemberships}
                walletTransactions={walletTransactions || []}
            />
        </StudioDashboardShell>
    )
}
