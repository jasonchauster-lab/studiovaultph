import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { Calendar, Clock, MapPin, ChevronRight, User as UserIcon, Globe, CheckCircle2, TrendingUp, Zap, Star } from 'lucide-react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, parse, format } from 'date-fns'
import clsx from 'clsx'
import Image from 'next/image'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'
import AnnouncementFeed from '@/components/dashboard/AnnouncementFeed'
import { getStudioDashboardStatsAction } from '../studio-actions'
import { StudioStatCards, RevenueTrendChart } from '@/components/dashboard/DashboardClientComponents'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { getCachedStudio } from '@/lib/studio/data'

type Params = Promise<{ outletId: string }>

export default async function OutletDashboard(props: {
    params: Params
}) {
    const params = await props.params
    const outletId = params.outletId
    const supabase = await createClient()

    // 1. Get Current User
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) {
        return null // Should be handled by layout redirect
    }

    // 2. Verify studio access first
    const cachedStudio = await getCachedStudio()
    if (!cachedStudio) {
        return (
            <div className="pt-20 text-center">
                <h2 className="text-xl font-black text-zinc-900">Access denied</h2>
                <p className="text-zinc-500">You don't have access to any studio.</p>
            </div>
        )
    }
    await verifyStudioAccess(cachedStudio.id)

    // 3. Fetch specific Outlet data (scoped to the verified studio)
    const { data: outlet } = await supabase
        .from('outlets')
        .select(`
            id, name, address, slug, studio_id,
            studio:studios(id, name, verified, is_public, logo_url)
        `)
        .eq('id', outletId)
        .eq('studio_id', cachedStudio.id)
        .single()

    if (!outlet) {
        return (
            <div className="pt-20 text-center">
                <h2 className="text-xl font-black text-zinc-900">Location not found</h2>
                <p className="text-zinc-500">The requested outlet doesn't exist or you don't have access.</p>
            </div>
        )
    }

    const myStudio: any = Array.isArray(outlet.studio) ? outlet.studio[0] : outlet.studio
    const todayStr = getManilaTodayStr()
    const currentTime = toManilaTimeString(new Date())

    // 3. Fetch slots FOR THIS OUTLET ONLY (Agenda)
    const { data: slotsRes } = await supabase
        .from('slots')
        .select(`
            *,
            instructor:profiles!instructor_id(full_name),
            bookings(id, status, quantity)
        `)
        .eq('outlet_id', outletId)
        .eq('date', todayStr)
        .order('start_time', { ascending: true })

    const upcomingSlotsToday = (slotsRes || []).filter(slot => slot.end_time > currentTime)

    // 5. Fetch Stats for the Studio (scoped to outlet)
    const statsRes = await getStudioDashboardStatsAction(myStudio.id, outletId)
    const statsData = statsRes.data || {
        revenue: 0,
        activeListings: 0,
        occupancy: 0,
        topInstructor: 'N/A',
        revenueTrends: []
    }

    return (
        <div className="pt-8 pb-20 px-4 md:px-10 max-w-[1600px] mx-auto space-y-12">
            
            {/* 1. Dashboard Hero / Title Area */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tightest leading-none">
                            Studio Dashboard
                        </h1>
                        {myStudio.verified && (
                            <div className="px-4 py-1.5 rounded-full bg-[#2D3282] text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified Partner
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <p className="text-xl font-black text-zinc-900/60 tracking-tight">
                            Welcome, <span className="text-[#2D3282]">{myStudio.name}</span>
                        </p>
                        <div className="hidden sm:block w-px h-4 bg-zinc-200" />
                        <p className="text-sm text-zinc-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <MapPin className="w-4 h-4 text-[#2D3282]/40" />
                            {outlet.name}
                        </p>
                    </div>
                </div>

                {/* Live Status Indicator (Centralized in Sidebar & Dashboard Hero) */}
                <div className={clsx(
                    "flex items-center gap-4 p-5 rounded-[2rem] border transition-all duration-500 min-w-[280px]",
                    myStudio.is_public 
                        ? "bg-emerald-50/50 border-emerald-500/20 shadow-sm" 
                        : "bg-zinc-50 border-zinc-200"
                )}>
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        myStudio.is_public ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-zinc-200 text-zinc-400"
                    )}>
                        <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Status</span>
                            <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                myStudio.is_public ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-100 border-zinc-200 text-zinc-400"
                            )}>
                                {myStudio.is_public ? 'Discovery Active' : 'Maintenance'}
                            </span>
                        </div>
                        <span className={clsx(
                            "text-lg font-black uppercase tracking-widest",
                            myStudio.is_public ? "text-emerald-600" : "text-zinc-600"
                        )}>
                            {myStudio.is_public ? 'Listed Online' : 'Storefront Private'}
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Stats Cards Grid */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                <StudioStatCards 
                    stats={{
                        revenue: statsData.revenue,
                        activeListings: statsData.activeListings,
                        occupancy: statsData.occupancy,
                        topInstructor: statsData.topInstructor
                    }} 
                />
            </div>

            {/* 3. Main Dashboard Layout (Charts + Agenda) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Analytics Column */}
                <div className="xl:col-span-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <RevenueTrendChart 
                            data={statsData.revenueTrends} 
                            title="Revenue Growth" 
                            type="revenue"
                        />
                        <RevenueTrendChart 
                            data={statsData.revenueTrends} 
                            title="Booking Volume" 
                            type="bookings"
                        />
                    </div>

                    <AnnouncementFeed role="studio" position="main" />

                    {/* Upcoming Today Agenda (Now in Main Column) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-[#2D3282]" />
                                Upcoming today
                            </h2>
                        </div>

                        <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-zinc-50">
                            {upcomingSlotsToday.length > 0 ? (
                                upcomingSlotsToday.map((slot) => {
                                    const activeBookings = slot.bookings?.filter((b: any) => 
                                        ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')
                                    ) || []
                                    const attendeeCount = activeBookings.reduce((sum: number, b: any) => sum + (b.quantity || 1), 0)
                                    const capacity = slot.pax_capacity || 1

                                    // Dynamic duration calculation
                                    let durationText = "1 hr";
                                    if (slot.start_time && slot.end_time) {
                                        const start = parse(slot.start_time, 'HH:mm:ss', new Date());
                                        const end = parse(slot.end_time, 'HH:mm:ss', new Date());
                                        const diff = differenceInMinutes(end, start);
                                        if (diff < 60) durationText = `${diff} min`;
                                        else if (diff % 60 === 0) durationText = `${diff / 60} hr`;
                                        else durationText = `${Math.floor(diff / 60)}h ${diff % 60}m`;
                                    }

                                    return (
                                        <div key={slot.id} className="px-8 py-7 flex items-center justify-between group hover:bg-zinc-50/50 transition-all cursor-pointer">
                                            <div className="flex items-start gap-8 flex-1">
                                                {/* Time Section */}
                                                <div className="min-w-[80px] pt-1">
                                                    <p className="text-base font-black text-zinc-900 tracking-tight">{slot.start_time.slice(0, 5)}</p>
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{durationText}</p>
                                                </div>
                                                
                                                {/* Vertical Bar */}
                                                <div className="w-1.5 self-stretch rounded-full bg-indigo-100 group-hover:bg-[#2D3282] transition-colors" />

                                                {/* Details Section */}
                                                <div className="flex-1 py-1">
                                                    <h4 className="text-base font-black text-zinc-900 group-hover:text-[#2D3282] transition-colors line-clamp-1">{slot.session_type}</h4>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                                            <MapPin className="w-3.5 h-3.5 opacity-60" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{outlet.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-zinc-400">
                                                            <UserIcon className="w-3.5 h-3.5 opacity-60" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{slot.instructor?.full_name || 'No Instructor'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Ratio Section */}
                                                <div className={clsx(
                                                    "min-w-[60px] h-10 flex items-center justify-center rounded-xl border font-black tracking-tighter text-sm",
                                                    attendeeCount >= capacity ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                                )}>
                                                    {attendeeCount}/{capacity}
                                                </div>
                                            </div>
                                            <div className="ml-6 text-zinc-200 group-hover:text-[#2D3282] transition-colors">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="p-24 text-center flex flex-col items-center justify-center space-y-6">
                                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center shadow-inner">
                                        <Calendar className="w-10 h-10 text-zinc-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em]">No classes scheduled</h3>
                                        <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">Everything looks clear for today.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="xl:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
                    <div className="bg-zinc-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Studio Tip</span>
                            </div>
                            <h3 className="text-2xl font-black tracking-tight leading-tight">Maximize your visibility.</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Ensure your listings are marked as 'Public' to appear in search results across the Marketplace.
                            </p>
                            <button className="w-full py-4 bg-white text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-90 transition-all">
                                Update Listings
                            </button>
                        </div>
                    </div>

                    <AnnouncementFeed role="studio" position="sidebar" />
                </div>
            </div>
        </div>
    )
}

function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}
