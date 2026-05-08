import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChartBar } from 'lucide-react'
import BranchPageSelector from '@/components/dashboard/BranchPageSelector'
import { getStudioDashboardStatsAction } from '../studio-actions'
import { StudioStatCards, RevenueTrendChart } from '@/components/dashboard/DashboardClientComponents'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StudioReportsPage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const outletId = typeof searchParams.outletId === 'string' ? searchParams.outletId : undefined
    
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    // 1. Fetch Studio
    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (!studio) redirect('/studio')

    // 2. Fetch all outlets
    const { data: outlets = [] } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: true })

    // 3. Fetch Stats for the current context
    const statsRes = await getStudioDashboardStatsAction(studio.id, outletId)
    const statsData = {
        revenue: statsRes.data?.revenue || 0,
        activeListings: statsRes.data?.activeListings || 0,
        occupancy: statsRes.data?.occupancy || 0,
        topInstructor: statsRes.data?.topInstructor || 'N/A',
        revenueTrends: statsRes.data?.revenueTrends || []
    }

    return (
        <div className="min-h-screen p-8 lg:p-12 bg-cream-50/30">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href={outletId ? `/studio?outletId=${outletId}` : '/studio'}
                        className="inline-flex items-center gap-3 text-[10px] font-black text-zinc-400 hover:text-[#2D3282] uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-zinc-100 shadow-sm mb-6">
                            <ChartBar className="w-4 h-4 text-[#2D3282]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Advanced Analytics</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-tight">
                            Business <span className="text-zinc-300">Reports</span>
                        </h1>
                        
                        {/* Centered Branch Selector */}
                        <BranchPageSelector 
                            outlets={outlets || []} 
                            currentOutletId={outletId}
                            isGlobalAllowed={true}
                        />
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <StudioStatCards 
                        stats={{
                            revenue: statsData.revenue,
                            activeListings: statsData.activeListings,
                            occupancy: statsData.occupancy,
                            topInstructor: statsData.topInstructor
                        }} 
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <RevenueTrendChart 
                        data={statsData.revenueTrends} 
                        title="Revenue Performance" 
                        type="revenue"
                    />
                    <RevenueTrendChart 
                        data={statsData.revenueTrends} 
                        title="Booking Trends" 
                        type="bookings"
                    />
                </div>

                {/* Summary Table or further reports could go here */}
            </div>
        </div>
    )
}
