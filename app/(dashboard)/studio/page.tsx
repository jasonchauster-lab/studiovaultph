import { createClient } from '@/lib/supabase/server'
import { createStudio } from './studio-actions'
import { Calendar, DollarSign, Clock, User, Users, MapPin, TrendingUp, Sparkles, Plus, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import StudioScheduleCalendar from '@/components/dashboard/StudioScheduleCalendar'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import StudioApplicationForm from '@/components/studio/StudioApplicationForm'
import clsx from 'clsx'
import Image from 'next/image'
import StudioStatCards from '@/components/dashboard/StudioStatCards'

import RevenueTrendChart from '@/components/dashboard/RevenueTrendChart'
import { toManilaTimeString, toManilaDateStr, getManilaTodayStr } from '@/lib/timezone'
import { format } from 'date-fns'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StudioDashboard(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()

    // 1. Get Current User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // 2. Fetch User's Studio(s)
    const { data: studios } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)

    const myStudio = studios?.[0] // Assuming single studio for MVP

    // 3. Fetch Variables for Stats
    let upcomingBookings: any[] = []
    let weeklySlots: any[] = []
    let monthlyRevenue = 0
    let occupancyRate = 0
    let topInstructorName = 'N/A'
    let dayStrings: string[] = []
    let dashboardStats: any = null

    // Use getManilaTodayStr() — toLocaleDateString with a timeZone option is unreliable
    // on Vercel/Docker runtimes that lack full ICU data (see lib/timezone.ts note).
    const todayStr = getManilaTodayStr()
    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : todayStr

    // Create local Date object for reliable calendar math without UTC offset shifting the day
    const [year, month, day] = dateParam.split('-').map(Number)
    const currentDate = new Date(year, month - 1, day)

    if (myStudio) {
        const nowTimeStr = toManilaTimeString(new Date());
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd')

        // Compute date strings (sync) before the parallel fetch
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + i)
            dayStrings.push(format(d, 'yyyy-MM-dd'))
        }
        const monthGridStart = format(startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const monthGridEnd = format(endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 'yyyy-MM-dd')

        // Fetch bookings + calendar slots in one parallel round (eliminates 2 sequential round trips)
        const [
            { data: studioBookings },
            { data: slots },
            { data: fetchedStats }
        ] = await Promise.all([
            // Upcoming Bookings
            supabase
                .from('bookings')
                .select(`
                    id, 
                    status, 
                    price_breakdown, 
                    total_price,
                    created_at,
                    client:profiles!client_id(full_name, avatar_url, email, phone, medical_conditions, date_of_birth),
                    instructor:profiles!instructor_id(full_name, avatar_url),
                    slots!inner(date, start_time, end_time, quantity, session_type)
                `)
                .eq('studio_id', myStudio.id)
                .in('status', ['pending', 'approved'])
                .gte('slots.date', todayStr)
                .order('slots(date)', { ascending: true }),

            // Weekly Slots
            supabase
                .from('slots')
                .select('*, bookings(id, status)')
                .eq('studio_id', myStudio.id)
                .gte('date', dayStrings[0])
                .lte('date', dayStrings[6]),

            // Dashboard Stats RPC
            supabase.rpc('get_studio_dashboard_stats', {
                p_studio_id: myStudio.id,
                p_last_30_days_date: thirtyDaysAgoStr,
                p_week_start: dayStrings[0],
                p_week_end: dayStrings[6]
            })
        ]);

        if (studioBookings) upcomingBookings = studioBookings
        if (slots) weeklySlots = slots
        if (fetchedStats) dashboardStats = fetchedStats

        // Apply Stats from RPC
        if (dashboardStats) {
            monthlyRevenue = (dashboardStats as any).revenue || 0;
            topInstructorName = (dashboardStats as any).top_instructor || 'N/A';
            occupancyRate = (dashboardStats as any).occupancy_rate || 0;
            
            // Still set totalSpots for the UI if needed
            ;(weeklySlots as any).totalSpots = (dashboardStats as any).total_spots || 0;
        }
    }

    return (
        <div className="pt-20 md:pt-12 space-y-12 pb-20">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10">
                    <div className="w-full flex flex-col sm:block">
                        <h1 className="text-xl sm:text-6xl font-serif font-black text-charcoal tracking-tightest mb-4 sm:mb-6 leading-none order-2 sm:order-1">Studio Dashboard</h1>
                        {myStudio && (
                            <div className="flex items-center gap-4 sm:gap-6 mt-6 sm:mt-8">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] overflow-hidden border-2 border-white shadow-cloud scale-100 sm:scale-110 ring-1 ring-border-grey/10 shrink-0">
                                    <Image
                                        src={myStudio.logo_url || myStudio.space_photos_urls?.[0] || "/logo2.jpg"}
                                        alt={myStudio.name}
                                        width={64}
                                        height={64}
                                        className="object-cover w-full h-full mix-blend-multiply"
                                    />
                                </div>
                                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                                    <p className="text-lg sm:text-xl font-black text-charcoal tracking-tight truncate">Welcome, {myStudio.name}</p>
                                    <p className="text-[11px] text-slate/60 flex items-center gap-2 font-black uppercase tracking-[0.3em]">
                                        <MapPin className="w-3.5 h-3.5 text-forest" />
                                        {myStudio.location}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/60 backdrop-blur-md px-3.5 sm:px-6 py-2 sm:py-3 rounded-full border border-border-grey/30 shadow-tight ring-1 ring-white/20 w-fit order-1 sm:order-2 mb-4 sm:mb-0">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <Sparkles className="w-3 h-3 sm:w-4 h-4 text-forest" />
                        <span className="text-[8px] sm:text-[11px] font-black text-charcoal uppercase tracking-[0.2em] sm:tracking-[0.3em]">Verified Partner</span>
                    </div>
                </div>

                {!myStudio ? (
                    <div className="fixed inset-0 bg-white flex flex-col md:flex-row z-[60]">
                        <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                            <Image src="/studio-application-bg.png" alt="Studio Application" fill className="object-cover" priority />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <div className="relative p-16 text-white z-10 drop-shadow-md">
                                <h2 className="text-4xl lg:text-5xl font-serif font-bold mb-6 leading-tight tracking-tight text-white">Elevate Your Studio Management</h2>
                                <p className="text-lg text-white/90 font-medium max-w-sm leading-relaxed">
                                    Experience the art of seamless booking and client care with Studio Vault's premium platform.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-alabaster p-8 md:p-12 lg:p-20">
                            <div className="max-w-xl mx-auto">
                                <div className="mb-12">
                                    <Link href="/" className="flex items-center justify-start gap-0 group mb-8">
                                        <Image src="/logo4.png" alt="Studio Vault Logo" width={60} height={60} className="w-15 h-15 object-contain" />
                                        <span className="text-2xl font-serif font-bold text-charcoal tracking-tight -ml-3 whitespace-nowrap">StudioVaultPH</span>
                                    </Link>
                                    <h2 className="text-sage text-[10px] font-bold uppercase tracking-[0.3em] mb-3">Onboarding</h2>
                                    <h1 className="text-2xl sm:text-4xl font-serif font-bold text-charcoal tracking-tight mb-4">Setup Your Studio</h1>
                                    <p className="text-charcoal/60 text-base leading-relaxed">
                                        Create your studio profile to start accepting bookings and monetizing your reformers in style.
                                    </p>
                                </div>
                                <StudioApplicationForm />
                            </div>
                        </div>
                    </div>
                ) : !myStudio.verified ? (
                    <div className="max-w-md mx-auto earth-card p-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400/30"></div>
                        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-yellow-100">
                            <Clock className="w-10 h-10 text-yellow-600" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-charcoal tracking-tight mb-4">Studio Under Review</h2>
                        <p className="text-slate mb-8 text-sm leading-relaxed">
                            Thanks for registering <strong>{myStudio.name}</strong>. Our team is verifying your studio details. You'll be able to manage slots and bookings once approved.
                        </p>
                        <div className="status-pill-earth status-pill-yellow inline-block">
                            Status: <span className="font-black">Pending Verification</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <StudioStatCards
                            stats={{
                                revenue: monthlyRevenue,
                                activeListings: (weeklySlots as any).totalSpots || weeklySlots.length,
                                occupancy: occupancyRate,
                                topInstructor: topInstructorName
                            }}
                        />

                        {/* Revenue Trends Visualization */}
                        {dashboardStats && (dashboardStats as any).revenue_trends && (dashboardStats as any).revenue_trends.length > 0 && (
                            <div className="max-w-7xl mx-auto mb-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <RevenueTrendChart 
                                        data={(dashboardStats as any).revenue_trends} 
                                        title="Revenue Growth" 
                                        type="revenue"
                                    />
                                    <RevenueTrendChart 
                                        data={(dashboardStats as any).revenue_trends} 
                                        title="Booking Volume" 
                                        type="bookings"
                                    />
                                </div>
                            </div>
                        )}                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                            <div className="xl:col-span-12 space-y-12">
                                {/* Today's Agenda */}
                                <div className="mx-auto max-w-5xl w-full">
                                    <div className="atelier-card p-8 sm:p-12 bg-white border border-burgundy/5 shadow-ambient relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-80 h-80 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                                        
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 relative z-10 gap-6">
                                            <div>
                                                <h2 className="text-3xl sm:text-4xl font-serif text-burgundy tracking-tight">Today's Agenda</h2>
                                                <p className="text-[10px] sm:text-xs font-black text-burgundy/40 uppercase tracking-[0.3em] mt-1.5">{format(new Date(), 'EEEE, MMMM do')}</p>
                                            </div>
                                            <Link 
                                                href="/studio/schedule"
                                                className="px-6 py-3 bg-forest text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-card flex items-center gap-2"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Open Full Calendar
                                            </Link>
                                        </div>

                                        <div className="space-y-6 relative z-10">
                                            {upcomingBookings.filter(b => b.slots?.date === todayStr).length > 0 ? (
                                                upcomingBookings
                                                    .filter(b => b.slots?.date === todayStr)
                                                    .sort((a, b) => (a.slots?.start_time || '').localeCompare(b.slots?.start_time || ''))
                                                    .map((booking) => (
                                                        <div key={booking.id} className="flex items-center gap-8 p-8 bg-off-white/40 border border-border-grey/30 rounded-3xl hover:bg-white hover:shadow-ambient transition-all duration-500 group/item">
                                                            <div className="w-24 flex flex-col items-center justify-center py-4 bg-burgundy/5 rounded-2xl border border-burgundy/10 group-hover/item:bg-burgundy group-hover/item:text-white transition-colors duration-500">
                                                                <span className="text-sm font-black uppercase tracking-tighter leading-none">{booking.slots?.start_time.slice(0, 5)}</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{parseInt(booking.slots?.start_time.split(':')[0]) >= 12 ? 'PM' : 'AM'}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-4 mb-2">
                                                                    <span className="text-[11px] font-black text-forest uppercase tracking-widest bg-forest/5 px-2.5 py-1 rounded-lg">{booking.slots?.session_type || 'Private Session'}</span>
                                                                    <span className="w-1 h-1 bg-border-grey rounded-full" />
                                                                    <span className="text-[11px] font-bold text-slate uppercase tracking-widest flex items-center gap-1.5">
                                                                        <MapPin className="w-3.5 h-3.5 opacity-40" />
                                                                        {booking.instructor?.full_name || 'Unassigned'}
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-xl sm:text-2xl font-serif text-charcoal truncate tracking-tight">{booking.client?.full_name}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <Link 
                                                                    href="/studio/history"
                                                                    className="w-12 h-12 flex items-center justify-center bg-white border border-border-grey/40 text-charcoal/40 hover:text-forest hover:border-forest/20 rounded-full transition-all shadow-tight hover:shadow-card"
                                                                >
                                                                    <ArrowUpRight className="w-6 h-6" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="py-24 flex flex-col items-center justify-center bg-off-white/20 rounded-[3rem] border border-dashed border-border-grey/60">
                                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-tight mb-8">
                                                        <Calendar className="w-8 h-8 text-charcoal/20" />
                                                    </div>
                                                    <h3 className="text-xl font-serif text-charcoal/40 tracking-tight mb-2">Clear Afternoon</h3>
                                                    <p className="text-[11px] font-black text-charcoal/30 uppercase tracking-[0.4em] italic mb-8">No sessions scheduled for today</p>
                                                    <Link 
                                                        href="/studio/schedule"
                                                        className="px-8 py-3.5 border-2 border-forest/20 text-forest rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-forest hover:text-white hover:border-forest transition-all shadow-tight"
                                                    >
                                                        Manage Slots
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Access */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
                                        <Link 
                                            href="/studio/schedule"
                                            className="atelier-card p-10 bg-white border border-burgundy/5 shadow-tight hover:shadow-ambient hover:-translate-y-1 transition-all duration-500 group/card"
                                        >
                                            <div className="w-14 h-14 bg-forest/5 rounded-2xl flex items-center justify-center mb-8 group-hover/card:bg-forest group-hover/card:text-white transition-colors">
                                                <Plus className="w-7 h-7 text-forest group-hover/card:text-white" />
                                            </div>
                                            <h3 className="text-2xl font-serif text-burgundy tracking-tight mb-3">Generate Slots</h3>
                                            <p className="text-[11px] font-bold text-slate/60 uppercase tracking-widest leading-relaxed">Add new recurring or single slots to your calendar.</p>
                                        </Link>
                                        <Link 
                                            href="/studio/earnings"
                                            className="atelier-card p-10 bg-white border border-burgundy/5 shadow-tight hover:shadow-ambient hover:-translate-y-1 transition-all duration-500 group/card"
                                        >
                                            <div className="w-14 h-14 bg-burgundy/5 rounded-2xl flex items-center justify-center mb-8 group-hover/card:bg-burgundy group-hover/card:text-white transition-colors">
                                                <DollarSign className="w-7 h-7 text-burgundy group-hover/card:text-white" />
                                            </div>
                                            <h3 className="text-2xl font-serif text-burgundy tracking-tight mb-3">Studio Payouts</h3>
                                            <p className="text-[11px] font-bold text-slate/60 uppercase tracking-widest leading-relaxed">Manage your revenue, request payouts, and view statements.</p>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </>
                )}
            </div>
        </div>
    )
}
