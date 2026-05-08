import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import AnalyticsClient from './AnalyticsClient'
import { getAdvancedAnalyticsAction } from './actions'
import { getCachedStudio } from '@/lib/studio/data'
import { verifyStudioAccess } from '@/lib/studio/auth'

interface AnalyticsPageProps {
    searchParams: Promise<{ outletId?: string }>
}

/**
 * Advanced Analytics Page
 * 
 * Optimized via Triple-Parallel Hydration to eliminate the sequential data waterfall.
 */
export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
    const params = await searchParams
    const outletId = params.outletId
    
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    // FIX PERF: Parallelize everything (Studio + Outlets + Analytics Data)
    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    const [outletsRes, analyticsData, { isOwner, permissions }] = await Promise.all([
        supabase
            .from('outlets')
            .select('*')
            .eq('studio_id', studio.id)
            .order('created_at', { ascending: true }),
        getAdvancedAnalyticsAction(studio.id, outletId),
        verifyStudioAccess(studio.id)
    ])

    // Security Check: Authorized staff or owner
    if (!isOwner && !permissions.view_analytics) {
        return (
            <StudioDashboardShell 
                title="Advanced Analytics"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/studio' },
                    { label: 'Analytics' }
                ]}
            >
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-sm">
                        <BarChart3 className="w-8 h-8 text-zinc-300" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Access Denied</h2>
                        <p className="text-sm text-zinc-400 font-medium">You do not have permission to view studio analytics.</p>
                    </div>
                </div>
            </StudioDashboardShell>
        )
    }

    const outlets = outletsRes.data || []

    return (
        <StudioDashboardShell 
            title="Advanced Analytics"
            breadcrumbs={[
                { label: 'Dashboard', href: '/studio' },
                { label: 'Analytics' }
            ]}
        >
            <AnalyticsClient 
                initialData={analyticsData} 
                outlets={outlets}
                currentOutletId={outletId}
                studioId={studio.id}
            />
        </StudioDashboardShell>
    )
}

import { BarChart3 } from 'lucide-react'
