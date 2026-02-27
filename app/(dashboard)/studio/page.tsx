import { createClient } from '@/lib/supabase/server'
import { createStudio } from './actions'
import { Calendar, DollarSign, Clock, User, Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import StudioScheduleCalendar from '@/components/dashboard/StudioScheduleCalendar'
import { startOfWeek, endOfWeek } from 'date-fns'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import StudioApplicationForm from '@/components/studio/StudioApplicationForm'
import clsx from 'clsx'

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

    // 3. Fetch Upcoming Bookings for this Studio (including Pending)
    let upcomingBookings: any[] = []
    if (myStudio) {
        console.log('DEBUG: Fetching ALL bookings to filter in JS for Studio ID:', myStudio.id);
        const { data: allBookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                client:profiles!client_id(full_name),
                instructor:profiles!instructor_id(full_name),
                slots(*)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('DEBUG ERROR:', error);
        }

        if (allBookings) {
            console.log('DEBUG: Total potential bookings fetched:', allBookings.length);
            upcomingBookings = allBookings.filter(b => {
                const sId = b.slots?.studio_id;
                const status = b.status?.toLowerCase();
                const isMatch = sId === myStudio.id && ['approved', 'confirmed', 'pending', 'paid'].includes(status);

                if (sId === myStudio.id) {
                    console.log(`DEBUG Check: Booking ${b.id}, Status=${b.status}, Match=${isMatch}`);
                }
                return isMatch;
            }).slice(0, 10);
        }
    }

    // 4. Fetch Slots for Calendar View
    let weeklySlots: any[] = []
    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : new Date().toISOString().split('T')[0]
    const currentDate = new Date(dateParam)

    if (myStudio) {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }) // end of week

        // Adjust weekEnd to include the whole day
        weekEnd.setHours(23, 59, 59, 999)

        const { data: slots, error: slotsError } = await supabase
            .from('slots')
            .select('*')
            .eq('studio_id', myStudio.id)
            .gte('start_time', weekStart.toISOString())
            .lte('start_time', weekEnd.toISOString()) // Filter by start time within range

        if (!slotsError && slots) {
            weeklySlots = slots
        }
    }

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-serif text-charcoal-900">Studio Partner Dashboard</h1>
                </div>

                {!myStudio ? (
                    <div className="max-w-md mx-auto bg-white border border-cream-200 rounded-xl p-8 shadow-sm">
                        <h2 className="text-xl font-serif text-charcoal-900 mb-4 text-center">Setup Your Studio</h2>
                        <p className="text-charcoal-600 mb-6 text-center text-sm">Create your studio profile to start accepting bookings.</p>

                        <StudioApplicationForm />
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
                        <p className="text-charcoal-600 mb-8">
                            Managing: <span className="font-semibold">{myStudio.name}</span> ({myStudio.location})
                            {myStudio.address && <span className="block text-sm text-charcoal-500 mt-1">{myStudio.address}</span>}
                        </p>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            {/* Main Schedule Area */}
                            <div className="xl:col-span-2">
                                <StudioScheduleCalendar
                                    studioId={myStudio.id}
                                    slots={weeklySlots}
                                    currentDate={currentDate}
                                    availableEquipment={myStudio.equipment || []}
                                />
                            </div>

                            {/* Sidebar: Recent Activity / Financials */}
                            <div className="space-y-6">
                                <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
                                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-charcoal-500" />
                                        Upcoming Bookings
                                    </h2>

                                    {upcomingBookings.length === 0 ? (
                                        <p className="text-charcoal-500 text-sm">No upcoming bookings.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {upcomingBookings.map((booking: any) => {
                                                const start = new Date(booking.slots.start_time)
                                                const payout = booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0);
                                                const equipment = booking.price_breakdown?.equipment || booking.equipment || 'Session';
                                                const qty = booking.price_breakdown?.quantity || 1;

                                                return (
                                                    <div key={booking.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="w-4 h-4 text-charcoal-400" />
                                                                    <p className="text-sm font-semibold text-charcoal-900">
                                                                        <span className="text-charcoal-500 font-normal">Client:</span> {booking.client?.full_name || 'N/A'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Users className="w-4 h-4 text-charcoal-400" />
                                                                    <p className="text-sm font-semibold text-charcoal-900">
                                                                        <span className="text-charcoal-500 font-normal">Instructor:</span> {booking.instructor?.full_name || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-charcoal-900">₱{payout.toLocaleString()}</p>
                                                                    <p className="text-[10px] text-charcoal-500 uppercase tracking-wider">Studio Fee</p>
                                                                </div>
                                                                <StudioChatButton booking={booking} currentUserId={user.id} />
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-1 text-xs text-charcoal-600 mb-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3 h-3" />
                                                                <span>{start.toLocaleDateString()} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{qty} x {equipment}</span>
                                                            </div>
                                                        </div>

                                                        {/* Status Tag */}
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                                                booking.status?.toLowerCase() === 'approved' || booking.status?.toLowerCase() === 'confirmed'
                                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                            )}>
                                                                {booking.status?.toLowerCase() === 'approved' || booking.status?.toLowerCase() === 'confirmed' ? 'Confirmed' : 'Pending Approval'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
