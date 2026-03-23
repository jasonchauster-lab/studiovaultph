import { getEarningsData } from './actions'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import Link from 'next/link'
import { getManilaTodayStr } from '@/lib/timezone'

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
        .maybeSingle()

    if (!studio) {
        return (
            <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl border border-cream-200 shadow-sm text-center max-w-md">
                    <h2 className="text-2xl font-serif text-charcoal-900 mb-4">Studio Not Found</h2>
                    <p className="text-charcoal-600 mb-6">
                        We couldn't find a studio associated with your account. Please make sure you have created a studio first.
                    </p>
                    <Link href="/studio" className="inline-block px-6 py-2 bg-forest text-white rounded-lg hover:brightness-110 transition-colors">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        )
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
    let endDate: string | undefined

    if (range && range !== 'all') {
        const todayStr = getManilaTodayStr()
        const now = new Date(todayStr)

        if (range === '7d') {
            const d = new Date(now)
            d.setDate(d.getDate() - 7)
            startDate = d.toISOString().split('T')[0]
            endDate = todayStr
        } else if (range === '30d') {
            const d = new Date(now)
            d.setDate(d.getDate() - 30)
            startDate = d.toISOString().split('T')[0]
            endDate = todayStr
        } else if (range === 'this-month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
            endDate = lastDay
        } else if (range === 'this-quarter') {
            const quarter = Math.floor(now.getMonth() / 3)
            startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
            const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0]
            endDate = lastDay
        } else if (range === 'this-year') {
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
            endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        }
    }
    // --- END DATE FILTER LOGIC ---

    const { bookings, payouts, summary, transactions, error } = await getEarningsData(studio.id, startDate, endDate)

    if (error) {
        return <div className="p-8 text-red-600">Error: {error}</div>
    }

    return (
        <div className="min-h-screen bg-cream-50/30 px-4 py-6 sm:p-8 selection:bg-forest/10 selection:text-forest">
            <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10">
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-700 ease-out">
                    <div>
                        <h1 className="text-[2.25rem] sm:text-4xl font-serif text-charcoal-900 mb-2 tracking-tight leading-tight">Earnings &amp; Payouts</h1>
                        <p className="text-charcoal-600/80 font-medium text-sm sm:text-base max-w-2xl leading-relaxed">
                            Manage your studio income, track withdrawals, and monitor your wallet balance.
                        </p>
                    </div>
                    {transactions && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-700 delay-150 fill-mode-both">
                            <ExportCsvButton data={transactions} filename="studio-earnings" />
                        </div>
                    )}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                    <DateRangeFilters />
                </div>

                {summary && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                        <EarningsOverview
                            studioId={studio.id}
                            summary={summary}
                            userEmail={user.email}
                            transactions={transactions || []}
                        />
                    </div>
                )}

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-2xl font-serif text-charcoal-900 tracking-tight">Transaction History</h2>
                        <div className="h-px flex-1 bg-cream-200/60" />
                    </div>
                    <TransactionHistory
                        transactions={transactions || []}
                    />
                </div>
            </div>
        </div>
    )
}
