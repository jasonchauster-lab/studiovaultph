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
import { toManilaTimeString, toManilaDateStr } from '@/lib/timezone'
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

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : todayStr
    const currentDate = new Date(dateParam + "T00:00:00+08:00")

    if (myStudio) {
        // STEP 1: Fetch slot IDs for this studio (reliable, same approach as admin's getPartnerBookings)
        const { data: studioSlots } = await supabase
            .from('slots')
            .select('id')
            .eq('studio_id', myStudio.id)

        const studioSlotIds = studioSlots?.map((s: any) => s.id) ?? []

        if (studioSlotIds.length > 0) {
            // STEP 2a: Fetch Upcoming Bookings using slot IDs
            const nowTimeStr = toManilaTimeString(new Date());
            const { data: studioBookings } = await supabase
                .from('bookings')
                .select(`
                    *,
                    client:profiles!client_id(full_name, avatar_url),
                    instructor:profiles!instructor_id(full_name, avatar_url),
                    slots!inner(*)
                `)
                .in('slot_id', studioSlotIds)
                .in('status', ['approved', 'pending'])
                .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`)
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
                    slots!inner(*)
                `)
                .in('slot_id', studioSlotIds)
                .in('status', ['approved', 'completed', 'cancelled_charged'])
                .gte('slots.date', thirtyDaysAgoStr)

            if (statsBookings && statsBookings.length > 0) {
                // Calc Revenue
                monthlyRevenue = statsBookings.reduce((sum, b) => {
                    const fee = b.price_breakdown?.studio_fee || (b.total_price ? Math.max(0, b.total_price - 100) : 0)
                    return sum + fee
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

        // Generate the 7 day strings for this week in Manila time
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + i)
            dayStrings.push(toManilaDateStr(d))
        }

        const { data: slots } = await supabase
            .from('slots')
            .select(`
                *,
                bookings (
                    id,
                    status,
                    equipment:price_breakdown->>'equipment',
                    client:profiles!client_id(full_name, avatar_url),
                    instructor:profiles!instructor_id(full_name, avatar_url)
                )
            `)
            .eq('studio_id', myStudio.id)
            .gte('date', dayStrings[0])
            .lte('date', dayStrings[6])

        if (slots) {
            weeklySlots = slots
        }

        // Calc Occupancy for currently viewed week
        if (weeklySlots.length > 0) {
            const bookedSlotsCount = weeklySlots.filter(s => !s.is_available).length
            occupancyRate = Math.round((bookedSlotsCount / weeklySlots.length) * 100)
        }
    }

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-serif text-charcoal-900 mb-2">Studio Partner Dashboard</h1>
                        {myStudio && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-cream-200 shadow-inner">
                                    <Image
                                        src={myStudio.logo_url || myStudio.space_photos_urls?.[0] || "/logo.png"}
                                        alt={myStudio.name}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div className="text-sm">
                                    <p className="font-semibold text-charcoal-900">{myStudio.name}</p>
                                    <p className="text-charcoal-500 flex items-center gap-1 font-medium">
                                        <MapPin className="w-3 h-3 text-rose-gold" />
                                        {myStudio.location}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="hidden lg:flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-cream-200 shadow-sm">
                        <Sparkles className="w-4 h-4 text-rose-gold animate-pulse" />
                        <span className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider">Premium Partner Access</span>
                    </div>
                </div>

                {!myStudio ? (
                    <div className="fixed inset-0 bg-white flex flex-col md:flex-row z-[60]">
                        <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                            <Image src="/studio-application-bg.png" alt="Studio Application" fill className="object-cover" priority />
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
                            <div className="relative p-16 text-white z-10">
                                <h2 className="text-4xl lg:text-5xl font-serif mb-6 leading-tight">Elevate Your Studio Management</h2>
                                <p className="text-lg text-white/90 font-light max-w-sm leading-relaxed">
                                    Experience the art of seamless booking and client care with StudioVault's premium platform.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white p-8 md:p-12 lg:p-20">
                            <div className="max-w-xl mx-auto">
                                <div className="mb-12">
                                    <Link href="/" className="flex items-center justify-center gap-0 group">
                                        <Image src="/logo.png" alt="StudioVault Logo" width={80} height={80} className="w-20 h-20 object-contain" />
                                        <span className="text-3xl font-serif font-bold text-charcoal-900 tracking-tight -ml-5 whitespace-nowrap">StudioVaultPH</span>
                                    </Link>
                                    <h2 className="text-charcoal-800 text-sm font-bold uppercase tracking-[0.2em] mb-3">Get Started</h2>
                                    <h1 className="text-4xl font-serif text-charcoal-900 mb-4">Setup Your Studio</h1>
                                    <p className="text-charcoal-600 text-base">
                                        Create your studio profile to start accepting bookings and monetizing your reformers.
                                    </p>
                                </div>
                                <StudioApplicationForm />
                            </div>
                        </div>
                    </div>
                ) : !myStudio.verified ? (
                    <div className="max-w-md mx-auto bg-white border border-cream-200 rounded-xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h2 className="text-xl font-serif text-charcoal-900 mb-4">Studio Under Review</h2>
                        <p className="text-charcoal-600 mb-6 text-sm">
                            Thanks for registering <strong>{myStudio.name}</strong>! <br />
                            Our team is verifying your studio details. You will be able to manage slots and bookings once approved.
                        </p>
                        <div className="bg-cream-50 rounded-lg p-3 text-xs text-charcoal-500">
                            Status: <span className="font-semibold text-yellow-700">Pending Verification</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <StudioStatCards
                            stats={{
                                revenue: monthlyRevenue,
                                activeListings: weeklySlots.length,
                                occupancy: occupancyRate,
                                topInstructor: topInstructorName
                            }}
                        />

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            <div className="xl:col-span-2">
                                <StudioScheduleCalendar
                                    studioId={myStudio.id}
                                    slots={weeklySlots}
                                    currentDate={currentDate}
                                    dayStrings={dayStrings}
                                    availableEquipment={myStudio.equipment || []}
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="bg-charcoal-900 p-4 flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-rose-gold" />
                                            Upcoming Bookings
                                        </h2>
                                        <span className="text-[10px] font-bold text-white/40 border border-white/10 px-2 py-0.5 rounded-full uppercase">Next 7 Days</span>
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
