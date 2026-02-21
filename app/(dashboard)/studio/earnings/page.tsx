import { getEarningsData } from './actions'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EarningsOverview from '@/components/dashboard/EarningsOverview'
import TransactionHistory from '@/components/dashboard/TransactionHistory'

export default async function EarningsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { range } = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Get Studio ID
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (!studio) {
        return <div className="p-8">Studio not found. Please create a studio first.</div>
    }

    // specific server action logic is abstracted into getEarningsData 
    // but since we are in a server component we can just call the shared logic or call it directly.
    // I'll re-use the function from actions.ts which is technically a server action but can be called here 
    // OR just inline the logic if preferred. Calling the action is fine.

    // However, server actions are primarily for mutations or client-side fetches. 
    // For initial page load in a RSC, it's often better to just run the query directly or use a shared data-fetching function (not 'use server').
    // But for simplicity/DRY I'll use the one I made, just ensuring I await it properly.

    // --- DATE FILTER LOGIC ---
    let startDate: string | undefined
    let endDate: string | undefined = new Date().toISOString()
    const now = new Date()

    if (range === '7d') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        startDate = d.toISOString()
    } else if (range === '30d') {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        startDate = d.toISOString()
    } else if (range === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    } else if (range === 'this-quarter') {
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString()
    } else if (range === 'this-year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString()
    }
    // --- END DATE FILTER LOGIC ---

    const { bookings, payouts, summary, transactions, error } = await getEarningsData(studio.id, startDate, endDate)

    if (error) {
        return <div className="p-8 text-red-600">Error: {error}</div>
    }

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Earnings & Payouts</h1>
                        <p className="text-charcoal-600">Manage your studio income and withdrawals.</p>
                    </div>
                    {transactions && <ExportCsvButton data={transactions} filename="studio-earnings" />}
                </div>

                <DateRangeFilters />

                {summary && (
                    <EarningsOverview
                        studioId={studio.id}
                        summary={summary}
                    />
                )}

                <div>
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4">Transaction History</h2>
                    <TransactionHistory
                        bookings={bookings || []}
                        payouts={payouts || []}
                    />
                </div>
            </div>
        </div>
    )
}
