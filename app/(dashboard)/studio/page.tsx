import { createClient } from '@/lib/supabase/server'
import { createStudio } from './actions'
import { Calendar, DollarSign, Clock, User, Users, MapPin, TrendingUp, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import StudioScheduleCalendar from '@/components/dashboard/StudioScheduleCalendar'
import { startOfWeek, endOfWeek } from 'date-fns'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import StudioApplicationForm from '@/components/studio/StudioApplicationForm'
import clsx from 'clsx'
import Image from 'next/image'
import StudioStatCards from '@/components/dashboard/StudioStatCards'

import StudioUpcomingBookings from '@/components/dashboard/StudioUpcomingBookings'
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

    // Use getManilaTodayStr() — toLocaleDateString with a timeZone option is unreliable
    // on Vercel/Docker runtimes that lack full ICU data (see lib/timezone.ts note).
    const todayStr = getManilaTodayStr()
    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : todayStr

    // Create local Date object for reliable calendar math without UTC offset shifting the day
    const [year, month, day] = dateParam.split('-').map(Number)
    const currentDate = new Date(year, month - 1, day)

    if (myStudio) {
        // STEP 1: Fetch slot IDs for this studio (reliable, same approach as admin's getPartnerBookings)
        const { data: studioSlots } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', myStudio.id)

        const studioSlotIds = studioSlots?.map((s: any) => s.id) ?? []

        if (studioSlotIds.length > 0) {
            // STEP 2a: Fetch Upcoming Bookings using studio ID
            const nowTimeStr = toManilaTimeString(new Date());
            const { data: studioBookings } = await supabase
                .from('bookings')
                .select(`
                    *,
                    client:profiles!client_id(full_name, avatar_url),
                    instructor:profiles!instructor_id(full_name, avatar_url),
                    slots!inner(*)
                `)
                .eq('studio_id', myStudio.id)
                .in('status', ['approved'])
                .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' })
                .order('date', { foreignTable: 'slots', ascending: true })
                .order('start_time', { foreignTable: 'slots', ascending: true })
                .limit(10)

            if (studioBookings) {
                upcomingBookings = studioBookings
            }

            // STEP 2b: Stats Bookings (Last 30 Days) - Based on SESSION date
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const thirtyDaysAgoStr = format(thirtyDaysAgo, 'yyyy-MM-dd')

            const { data: statsBookings } = await supabase
                .from('bookings')
                .select(`
                    *,
                    instructor:profiles!instructor_id(full_name, avatar_url),
                    slots(*)
                `)
                .eq('studio_id', myStudio.id)
                .in('status', ['approved', 'completed', 'cancelled_charged'])
                .gte('slots.date', thirtyDaysAgoStr)

            if (statsBookings && statsBookings.length > 0) {
                // Calc Revenue
                monthlyRevenue = statsBookings.reduce((sum, b) => {
                    const breakdown = b.price_breakdown as any;
                    const studioFee = Number(breakdown?.studio_fee || 0);

                    if (studioFee > 0) return sum + studioFee;

                    // Fallback for legacy bookings without breakdown
                    const fallbackFee = b.total_price ? Math.max(0, b.total_price - 100) : 0;
                    return sum + fallbackFee;
                }, 0)

                // Calc Top Instructor
                const instructorCounts: Record<string, number> = {}
                statsBookings.forEach(b => {
                    const name = b.instructor?.full_name || 'Unknown'
                    instructorCounts[name] = (instructorCounts[name] || 0) + 1
                })
                topInstructorName = Object.entries(instructorCounts).sort((a, b) => b[1] - a[1])[0][0]
            }
        }

        // STEP 2c: Fetch Weekly Slots for the calendar (always, regardless of bookings)
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })

        // Generate the 7 day strings for this week locally
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + i)
            dayStrings.push(format(d, 'yyyy-MM-dd'))
        }

        const { data: slots } = await supabase
            .from('slots')
            .select(`
                *,
                bookings (
                    id,
                    status,
                    created_at,
                    updated_at,
                    price_breakdown,
                    client:profiles!client_id(
                        full_name, 
                        avatar_url,
                        bio,
                        email,
                        medical_conditions,
                        other_medical_condition,
                        date_of_birth
                    ),
                    instructor:profiles!instructor_id(
                        full_name, 
                        avatar_url,
                        bio,
                        email,
                        medical_conditions,
                        other_medical_condition,
                        date_of_birth
                    )
                )
            `)
            .eq('studio_id', myStudio.id)
            .gte('date', dayStrings[0])
            .lte('date', dayStrings[6])

        if (slots) {
            weeklySlots = slots
        }

        // Calc Occupancy and Total Spots for currently viewed week
        if (weeklySlots.length > 0) {
            const totalSpots = weeklySlots.reduce((sum, s) => sum + (s.quantity || 1), 0)
            const bookedSpotsCount = weeklySlots.reduce((sum, s) => {
                const activeBookings = s.bookings?.filter((b: any) =>
                    ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase())
                ).length || 0
                return sum + activeBookings
            }, 0)

            occupancyRate = Math.round((bookedSpotsCount / totalSpots) * 100)
                // Use total spots for "Active Listings"
                ; (weeklySlots as any).totalSpots = totalSpots
        }
    }

    return (
        <div className="space-y-12 pb-20">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight mb-2">Studio Dashboard</h1>
                        {myStudio && (
                            <div className="flex items-center gap-4 mt-4">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white shadow-cloud scale-105">
                                    <Image
                                        src={myStudio.logo_url || myStudio.space_photos_urls?.[0] || "/logo.png"}
                                        alt={myStudio.name}
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-lg font-bold text-charcoal tracking-tight">Welcome, {myStudio.name}</p>
                                    <p className="text-[10px] text-slate flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                        <MapPin className="w-3 h-3 text-forest" />
                                        {myStudio.location}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5 bg-white px-5 py-2.5 rounded-full border border-border-grey shadow-tight">
                        <Sparkles className="w-3.5 h-3.5 text-forest animate-pulse" />
                        <span className="text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Verified Partner</span>
                    </div>
                </div>

                {!myStudio ? (
                    <div className="fixed inset-0 bg-white flex flex-col md:flex-row z-[60]">
                        <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                            <Image src="/studio-application-bg.png" alt="Studio Application" fill className="object-cover" priority />
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent" />
                            <div className="relative p-16 text-white z-10">
                                <h2 className="text-4xl lg:text-5xl font-serif font-bold mb-6 leading-tight tracking-tight">Elevate Your Studio Management</h2>
                                <p className="text-lg text-white/90 font-medium max-w-sm leading-relaxed">
                                    Experience the art of seamless booking and client care with Studio Vault's premium platform.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-alabaster p-8 md:p-12 lg:p-20">
                            <div className="max-w-xl mx-auto">
                                <div className="mb-12">
                                    <Link href="/" className="flex items-center justify-start gap-0 group mb-8">
                                        <Image src="/logo.png" alt="Studio Vault Logo" width={60} height={60} className="w-15 h-15 object-contain" />
                                        <span className="text-2xl font-serif font-bold text-charcoal tracking-tight -ml-3 whitespace-nowrap">StudioVaultPH</span>
                                    </Link>
                                    <h2 className="text-sage text-[10px] font-bold uppercase tracking-[0.3em] mb-3">Onboarding</h2>
                                    <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight mb-4">Setup Your Studio</h1>
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

                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
                            <div className="xl:col-span-3">
                                <StudioScheduleCalendar
                                    studioId={myStudio.id}
                                    slots={weeklySlots}
                                    currentDate={currentDate}
                                    dayStrings={dayStrings}
                                    availableEquipment={myStudio.equipment || []}
                                />
                            </div>

                            <div className="space-y-8">
                                <div className="earth-card overflow-hidden">
                                    <div className="bg-forest p-5 flex items-center justify-between">
                                        <h2 className="text-[11px] font-bold !text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Upcoming Bookings
                                        </h2>
                                        <span className="text-[9px] font-bold text-white/50 border border-white/20 px-3 py-1 rounded-full uppercase tracking-tighter">Next 7 Days</span>
                                    </div>
                                    <div className="p-6">
                                        <StudioUpcomingBookings
                                            bookings={upcomingBookings}
                                            currentUserId={user.id}
                                        />
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
