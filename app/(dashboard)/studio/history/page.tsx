import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, CalendarX2, PlusCircle, MapPin, Box } from 'lucide-react'
import Link from 'next/link'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import clsx from 'clsx'

export default async function StudioHistoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 1. Get Studio ID
    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!studio) {
        return <div className="p-8">Studio not found.</div>
    }

    // 2. Get all slot IDs for this studio
    const { data: studioSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studio.id)

    const slotIds = studioSlots?.map(s => s.id) ?? []

    // 3. Fetch bookings with instructor details (including avatar)
    const { data: bookings } = slotIds.length === 0
        ? { data: [] }
        : await supabase
            .from('bookings')
            .select(`
                *,
                slots (
                    date,
                    start_time,
                    end_time,
                    equipment,
                    studios (
                        id,
                        name,
                        location,
                        address,
                        owner_id,
                        logo_url
                    )
                ),
                instructor:profiles!instructor_id (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-cream-50 p-6 sm:p-10">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-charcoal-900 mb-1">Rental History</h1>
                        <p className="text-charcoal-600 text-sm">Past sessions and earnings for your studio.</p>
                    </div>
                    <Link
                        href="/studio"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-gold text-white text-sm font-semibold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Availability Slot
                    </Link>
                </div>

                {/* Card List */}
                <div className="space-y-4">
                    {!bookings || bookings.length === 0 ? (
                        /* ── Empty State ── */
                        <div className="bg-white border border-cream-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 px-8 text-center">
                            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-5">
                                <CalendarX2 className="w-8 h-8 text-charcoal-300" />
                            </div>
                            <h3 className="text-lg font-serif text-charcoal-900 mb-2">Your history is empty.</h3>
                            <p className="text-charcoal-500 text-sm max-w-sm mb-6">
                                Start monetizing your idle reformers by adding availability slots — instructors can book them instantly.
                            </p>
                            <Link
                                href="/studio"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-gold text-white font-semibold rounded-lg shadow hover:brightness-110 active:scale-95 transition-all"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Your First Slot
                            </Link>
                        </div>
                    ) : (
                        bookings.map((booking: any) => {
                            const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
                            const slot = getFirst(booking.slots)
                            const studioData = getFirst(slot?.studios)
                            const instructor = getFirst(booking.instructor)

                            const start = new Date(`${slot?.date}T${slot?.start_time}+08:00`)
                            const end = new Date(`${slot?.date}T${slot?.end_time}+08:00`)

                            const studioFee = booking.price_breakdown?.studio_fee ?? 0
                            const instructorFee = (booking.price_breakdown as any)?.instructor_fee ?? 0
                            const serviceFee = (booking.price_breakdown as any)?.service_fee ?? 0
                            const fullTotal = booking.total_price ?? ((studioFee + instructorFee + serviceFee) || 0)

                            return (
                                <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0">
                                                        <img
                                                            src={instructor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.full_name || 'I')}&background=F5F2EB&color=2C3230`}
                                                            alt={instructor?.full_name || "Instructor"}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex flex-col gap-1 items-start min-w-0">
                                                                <span className="text-sm font-bold text-charcoal-900 truncate w-full">
                                                                    {instructor?.full_name || "Instructor"}
                                                                </span>
                                                                <span className={clsx(
                                                                    'px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0',
                                                                    booking.status === 'completed'
                                                                        ? (booking.funds_unlocked ? 'bg-green-100/50 text-green-700 border-green-200' : 'bg-amber-100/50 text-amber-700 border-amber-200') :
                                                                        booking.status === 'approved' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                                                            booking.status === 'rejected' ? 'bg-red-100/50 text-red-700 border-red-200' :
                                                                                'bg-charcoal-100/50 text-charcoal-600 border-cream-200'
                                                                )}>
                                                                    {booking.status === 'completed'
                                                                        ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held (24h)') :
                                                                        booking.status === 'approved' ? 'Awaiting Completion' :
                                                                            booking.status === 'pending' ? 'Pending' :
                                                                                booking.status}
                                                                </span>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-[13px] font-bold text-charcoal-900 leading-none">
                                                                    {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                    {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                                <span className="font-semibold text-charcoal-700 leading-tight">
                                                    {studioData?.location || "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                                <span className="font-semibold text-charcoal-700">
                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                        ? slot.equipment[0]
                                                        : (booking.price_breakdown?.equipment || booking.equipment || 'Standard Space')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="font-bold text-[13px] text-charcoal-900 border border-green-200 bg-green-50 px-2 py-0.5 rounded text-green-700">Earnings: ₱{Number(fullTotal).toLocaleString()}</span>
                                                {studioFee > 0 && studioFee !== fullTotal && (
                                                    <span className="text-[11px] text-charcoal-500">
                                                        (Studio Cut: ₱{Number(studioFee).toLocaleString()})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {instructor && instructor.id !== user.id && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={user.id} partnerId={instructor.id} partnerName={instructor.full_name || 'Instructor'} label="Message Instructor" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div >
        </div >
    )
}
