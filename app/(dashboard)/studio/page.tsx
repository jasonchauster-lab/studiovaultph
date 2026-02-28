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

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : todayStr
    const currentDate = new Date(dateParam + "T00:00:00+08:00")

    if (myStudio) {
        // Fetch Upcoming Bookings
        const { data: allBookings } = await supabase
            .from('bookings')
            .select(`
                *,
                client:profiles!client_id(full_name, avatar_url),
                instructor:profiles!instructor_id(full_name, avatar_url),
                slots(*)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (allBookings) {
            upcomingBookings = allBookings.filter(b => {
                const sId = b.slots?.studio_id;
                const status = b.status?.toLowerCase();
                return sId === myStudio.id && ['approved', 'pending'].includes(status);
            }).slice(0, 10);
        }

        // Fetch Weekly Slots
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        weekEnd.setHours(23, 59, 59, 999)

        const { data: slots } = await supabase
            .from('slots')
            .select(`
                *,
                bookings (
                    id,
                    status,
                    client:profiles!client_id(full_name, avatar_url),
                    instructor:profiles!instructor_id(full_name, avatar_url)
                )
            `)
            .eq('studio_id', myStudio.id)
            .gte('start_time', weekStart.toISOString())
            .lte('start_time', weekEnd.toISOString())

        if (slots) {
            weeklySlots = slots
        }

        // 4. Calculate Stats (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: statsBookings } = await supabase
            .from('bookings')
            .select(`
                *,
                instructor:profiles!instructor_id(full_name, avatar_url),
                slots!inner(studio_id)
            `)
            .eq('slots.studio_id', myStudio.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .eq('status', 'approved');

        if (statsBookings && statsBookings.length > 0) {
            // Calc Revenue
            monthlyRevenue = statsBookings.reduce((sum, b) => {
                const fee = b.price_breakdown?.studio_fee || (b.total_price ? Math.max(0, b.total_price - 100) : 0);
                return sum + fee;
            }, 0);

            // Calc Top Instructor
            const instructorCounts: Record<string, number> = {};
            statsBookings.forEach(b => {
                const name = b.instructor?.full_name || 'Unknown';
                instructorCounts[name] = (instructorCounts[name] || 0) + 1;
            });
            topInstructorName = Object.entries(instructorCounts).sort((a, b) => b[1] - a[1])[0][0];
        }

        // Calc Occupancy for currently viewed week
        if (weeklySlots.length > 0) {
            const bookedSlotsCount = weeklySlots.filter(s => !s.is_available).length;
            occupancyRate = Math.round((bookedSlotsCount / weeklySlots.length) * 100);
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
                                        {upcomingBookings.length === 0 ? (
                                            <div className="text-center py-12 px-4">
                                                <div className="w-16 h-16 bg-cream-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-cream-200">
                                                    <Sparkles className="w-8 h-8 text-rose-gold opacity-30" />
                                                </div>
                                                <p className="text-charcoal-900 font-serif text-lg mb-2">Your vault is ready.</p>
                                                <p className="text-charcoal-500 text-sm leading-relaxed max-w-[200px] mx-auto">
                                                    Add a slot to start monetizing your idle reformers.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {upcomingBookings.map((booking: any) => {
                                                    const start = new Date(booking.slots.start_time)
                                                    const payout = booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0);
                                                    const equipment = booking.price_breakdown?.equipment || booking.equipment || 'Session';
                                                    const qty = booking.price_breakdown?.quantity || 1;

                                                    return (
                                                        <div key={booking.id} className="border border-cream-100 rounded-xl p-4 bg-cream-50/30 hover:bg-cream-50 transition-colors shadow-sm mb-4 last:mb-0">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                                                        <Image
                                                                            src={booking.instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.instructor?.full_name}`}
                                                                            alt="Instructor"
                                                                            width={40}
                                                                            height={40}
                                                                            className="object-cover w-full h-full"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-charcoal-900 leading-none mb-1">{booking.instructor?.full_name || 'N/A'}</p>
                                                                        <p className="text-[10px] text-charcoal-500 uppercase font-bold tracking-tighter">Instructor</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-charcoal-900 leading-none">₱{payout.toLocaleString()}</p>
                                                                    <p className="text-[8px] text-charcoal-400 uppercase font-bold tracking-widest mt-1">Earnings</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2 p-3 bg-white/50 rounded-lg border border-cream-100 mb-4">
                                                                <div className="flex items-center gap-2 text-charcoal-600 text-[11px]">
                                                                    <div className="w-4 h-4 rounded-full overflow-hidden border border-cream-200">
                                                                        <Image
                                                                            src={booking.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.client?.full_name}`}
                                                                            alt="Client"
                                                                            width={16}
                                                                            height={16}
                                                                            className="object-cover w-full h-full"
                                                                        />
                                                                    </div>
                                                                    <span>Client: {booking.client?.full_name || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-charcoal-900 text-[11px] font-medium">
                                                                    <Calendar className="w-3 h-3 text-rose-gold" />
                                                                    <span>{start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-charcoal-900 text-[11px] font-medium">
                                                                    <Clock className="w-3 h-3 text-rose-gold" />
                                                                    <span>{qty} x {equipment}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between">
                                                                <div className={clsx(
                                                                    "text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md border",
                                                                    booking.status?.toLowerCase() === 'approved'
                                                                        ? "bg-green-50 text-green-700 border-green-200"
                                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                                )}>
                                                                    {booking.status?.toLowerCase() === 'approved' ? 'Confirmed' : 'Pending'}
                                                                </div>
                                                                <StudioChatButton booking={booking} currentUserId={user.id} />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
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
