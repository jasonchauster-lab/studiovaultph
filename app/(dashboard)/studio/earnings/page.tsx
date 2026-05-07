import { getEarningsData } from './actions'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import { getManilaTodayStr } from '@/lib/timezone'
import { redirect } from 'next/navigation'
import EarningsOverview from '@/components/dashboard/EarningsOverview'
import TransactionHistory from '@/components/dashboard/TransactionHistory'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { getCachedStudio } from '@/lib/studio/data'

export default async function EarningsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { range, outletId } = await searchParams
    
    // Hardened Security check
    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    const { isOwner, permissions } = await verifyStudioAccess(studio.id)
    if (!isOwner && !permissions.view_sales) {
        return (
            <StudioDashboardShell title="Earnings & Payouts">
                <div className="flex items-center justify-center min-h-[400px]">
                    <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">Access Denied</p>
                </div>
            </StudioDashboardShell>
        )
    }

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

    const { summary, transactions, error } = await getEarningsData(studio.id, startDate, endDate, outletId as string)

    if (error) {
        return (
            <StudioDashboardShell title="Earnings & Payouts">
                <div className="p-8 text-rose-600 font-black uppercase tracking-widest text-xs">Error: {error}</div>
            </StudioDashboardShell>
        )
    }

    return (
        <StudioDashboardShell 
            title="Earnings & Payouts"
            breadcrumbs={[
                { label: 'Dashboard', href: '/studio' },
                { label: 'Earnings' }
            ]}
        >
            <div className="space-y-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-zinc-900 tracking-tight uppercase tracking-[0.2em]">Financial Insights</h1>
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                            Monitor studio liquidity, payouts, and revenue streams.
                        </p>
                    </div>
                    {transactions && (
                        <ExportCsvButton data={transactions} filename="studio-earnings" />
                    )}
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm inline-block">
                    <DateRangeFilters />
                </div>

                {summary && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
                        <EarningsOverview
                            studioId={studio.id}
                            summary={summary}
                            userEmail={(studio as any).business_contact_email || (studio as any).owner?.[0]?.email || ''}
                            transactions={transactions || []}
                        />
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Transaction History</h2>
                        <div className="h-px flex-1 bg-zinc-100" />
                    </div>
                    <TransactionHistory
                        transactions={transactions || []}
                    />
                </div>
            </div>
        </StudioDashboardShell>
    )
}
