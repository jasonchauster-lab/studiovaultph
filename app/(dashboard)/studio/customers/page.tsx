import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import CustomersClient from './CustomersClient'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getCachedStudio } from '@/lib/studio/data'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { LeadStatus, ClientProfile } from '@/types/agency'

/**
 * Customer Directory Page (Hardened & Optimized)
 * 
 * Performance: Uses the `customer_stats_view` to fetch pre-aggregated data.
 * Scalability: Prevents O(N) memory leaks by delegating aggregation to the DB.
 */
export default async function CustomersPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    const { isOwner, permissions } = await verifyStudioAccess(studio.id)

    if (!isOwner && !permissions.view_crm) {
        return (
            <StudioDashboardShell 
                title="Customers"
                breadcrumbs={[{ label: 'Directory' }, { label: 'Customers' }]}
            >
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-sm">
                        <Plus className="w-8 h-8 text-zinc-300 rotate-45" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Access Denied</h2>
                        <p className="text-sm text-zinc-400 font-medium">You do not have permission to view the customer directory.</p>
                    </div>
                </div>
            </StudioDashboardShell>
        )
    }

    const adminSupabase = createAdminClient()

    // NEW: Use the high-performance view for pre-aggregated stats
    const { data: customersData, error } = await adminSupabase
        .from('customer_stats_view')
        .select('*')
        .eq('studio_id', studio.id)
        .order('joined_date', { ascending: false })

    if (error) {
        console.error('[CustomersPage] View Fetch Error:', error)
    }

    const customers: ClientProfile[] = (customersData || []).map(c => ({
        id: c.profile_id,
        studio_id: studio.id,
        status: 'active' as LeadStatus,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        email: c.email,
        phone: c.contact_number,
        joined_date: c.joined_date,
        total_bookings: c.total_bookings,
        referral_count: c.referral_count,
        last_visit: c.last_visit_date
    }))

    const actions = (
        <div className="flex items-center gap-4">
            <Link 
                href="/studio/customers/new"
                className="flex items-center gap-2.5 px-8 py-4 bg-zinc-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-950/20 hover:bg-indigo-600 transition-all active:scale-95 group"
            >
                <Plus className="w-4 h-4 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
                Add Customer
            </Link>
        </div>
    )

    return (
        <StudioDashboardShell 
            title="Customer Directory"
            breadcrumbs={[{ label: 'Directory' }, { label: 'Customers' }]}
            actions={actions}
        >
            <CustomersClient customers={customers} />
        </StudioDashboardShell>
    )
}
