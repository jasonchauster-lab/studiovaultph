import { createClient } from '@/lib/supabase/server'
import { getCachedStudio, getCachedUser } from '@/lib/studio/data'
import { redirect } from 'next/navigation'
import { Globe, CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'
import AnnouncementFeed from '@/components/dashboard/AnnouncementFeed'
import { getStudioDashboardStatsAction } from './studio-actions'
import { getStudioOnboardingStatusAction } from './onboarding-actions'
import { Metadata } from 'next'

import { 
    StudioStatCards, 
    RevenueTrendChart, 
    StudioAgenda, 
    LiveActivityFeed,
    LocationSwitcher,
    OnboardingChecklist
} from '@/components/dashboard/DashboardClientComponents'
import { StatsErrorBoundary } from '@/components/dashboard/StatsErrorBoundary'

interface StudioPageProps {
    searchParams: Promise<{ outletId?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
    const studio = await getCachedStudio()
    return {
        title: studio ? `Dashboard | ${studio.name}` : 'Studio Dashboard',
        description: 'Manage your studio operations, bookings, and website.'
    }
}

export default async function StudioRoot({ searchParams }: StudioPageProps) {
    const params = await searchParams
    const outletId = params.outletId
    
    const user = await getCachedUser()
    if (!user) return null

    const supabase = await createClient()
    const studio = await getCachedStudio()

    if (!studio) {
        console.error('[StudioRoot] Studio not found for user:', user.id)
        redirect('/studio/register')
    }

    let outlets: any[] = []
    try {
        const { data: outletsRes, error: outletsError } = await supabase
            .from('outlets')
            .select('id, name, studio_id, inventory, status, is_active')
            .eq('studio_id', studio.id)
            .order('created_at', { ascending: true })
        
        if (outletsError) {
            console.error('[StudioRoot] Outlets fetch error:', outletsError)
        } else {
            outlets = outletsRes || []
        }
    } catch (err) {
        console.error('[StudioRoot] Unexpected error fetching outlets:', err)
    }

    const activeOutlet = outletId ? outlets?.find(o => o.id === outletId) : null
    const todayStr = getManilaTodayStr()
    const currentTime = toManilaTimeString(new Date())

    const fetchSlotsTask = async () => {
        try {
            let slotsQuery = supabase
                .from('slots')
                .select(`
                    id, date, start_time, end_time, session_type, pax_capacity,
                    instructor:profiles!instructor_id(full_name),
                    outlet:outlets(name),
                    bookings(id, status, quantity)
                `)
                .eq('studio_id', studio.id)
                .eq('date', todayStr)
                .eq('is_deleted', false)
                .order('start_time', { ascending: true })

            if (outletId) slotsQuery = slotsQuery.eq('outlet_id', outletId)

            const { data: slotsRes, error } = await slotsQuery
            if (error) throw error
            
            return (slotsRes || []).filter(slot => slot.end_time > currentTime)
        } catch (err) {
            console.error('[StudioRoot] fetchSlotsTask error:', err)
            return []
        }
    }

    const [upcomingSlotsToday, statsRes, onboardingStatusRes] = await Promise.all([
        fetchSlotsTask(),
        getStudioDashboardStatsAction(studio.id, outletId).catch(err => {
            console.error('[StudioRoot] Stats error:', err)
            return { data: null }
        }),
        getStudioOnboardingStatusAction(studio.id).catch(err => {
            console.error('[StudioRoot] Onboarding status error:', err)
            return { progress: 100, isPublic: true } as any
        })
    ])

    const statsData = {
        revenue: statsRes?.data?.revenue || 0,
        activeListings: statsRes?.data?.activeListings || 0,
        occupancy: statsRes?.data?.occupancy || 0,
        topInstructor: statsRes?.data?.topInstructor || 'N/A',
        revenueTrends: statsRes?.data?.revenueTrends || []
    }

    const onboardingStatus = (onboardingStatusRes && 'progress' in onboardingStatusRes) 
        ? onboardingStatusRes 
        : { progress: 100, isPublic: true }

    return (
        <div className="pt-8 pb-20 px-4 md:px-10 max-w-[1600px] mx-auto space-y-12 bg-zinc-50/30 min-h-screen">
            
            {/* Onboarding Checklist */}
            {(onboardingStatus.progress < 100 || !studio.is_public) && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
                    <OnboardingChecklist status={onboardingStatus} />
                </div>
            )}

            {/* 1. Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tightest leading-none">
                            Studio Dashboard
                        </h1>
                        {studio.verified && (
                            <div className="px-4 py-1.5 rounded-full bg-primary text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-primary/20 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified Partner
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        <p className="text-xl font-black text-zinc-900/60 tracking-tightest">
                            Welcome back, <span className="text-primary">{studio.name}</span>
                        </p>
                        
                        {(outlets?.length || 0) > 1 && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
                                <LocationSwitcher 
                                    outlets={outlets || []} 
                                    currentOutletId={outletId} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Marketplace Status */}
                <div className={clsx(
                    "flex items-center gap-4 p-5 rounded-[2rem] border transition-all duration-500 min-w-[280px] bg-white",
                    studio.is_public ? "border-emerald-500/20 shadow-sm" : "border-zinc-200"
                )}>
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        studio.is_public ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-zinc-200 text-zinc-400"
                    )}>
                        <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Marketplace</span>
                            <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                studio.is_public ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-100 border-zinc-200 text-zinc-400"
                            )}>
                                {studio.is_public ? 'Active' : 'Maintenance'}
                            </span>
                        </div>
                        <span className={clsx(
                            "text-lg font-black uppercase tracking-widest",
                            studio.is_public ? "text-emerald-600" : "text-zinc-600"
                        )}>
                            {studio.is_public ? 'Online' : 'Private'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                <StatsErrorBoundary fallback={
                    <div className="bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center gap-4">
                        <Loader2 className="w-6 h-6 text-zinc-300 animate-spin" />
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                            Stats temporarily unavailable
                        </p>
                    </div>
                }>
                    <StudioStatCards stats={statsData} />
                </StatsErrorBoundary>
            </div>

            {/* 3. Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <StatsErrorBoundary>
                            <RevenueTrendChart data={statsData.revenueTrends} title="Revenue Growth" type="revenue" />
                        </StatsErrorBoundary>
                        <StatsErrorBoundary>
                            <RevenueTrendChart data={statsData.revenueTrends} title="Booking Volume" type="bookings" />
                        </StatsErrorBoundary>
                    </div>

                    <AnnouncementFeed role="studio" position="main" />

                    <StudioAgenda 
                        slots={upcomingSlotsToday} 
                        outletId={outletId} 
                        activeOutletName={activeOutlet?.name}
                    />
                </div>

                {/* Sidebar */}
                <div className="xl:col-span-4 space-y-10 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                    <LiveActivityFeed studioId={studio.id} userId={user.id} />
                    
                    <div className="relative group overflow-hidden rounded-[2.5rem] bg-zinc-900 p-10 text-white shadow-xl ring-1 ring-white/10 transition-all duration-500 hover:shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-50" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Studio Tip</span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight leading-tight text-white uppercase tracking-tightest">
                                Maximize visibility.
                            </h3>
                            <p className="text-[13px] leading-relaxed text-zinc-400 font-medium">
                                Ensure your listings are marked as <span className="text-white font-black">Public</span> to appear in search results across the Marketplace.
                            </p>
                        </div>
                    </div>
                    <AnnouncementFeed role="studio" position="sidebar" />
                </div>
            </div>
        </div>
    )
}
