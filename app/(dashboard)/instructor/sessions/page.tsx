import { createClient } from '@/lib/supabase/server'
import { autoCompleteBookings, unlockMaturedFunds, expireAbandonedBookings } from '@/lib/wallet'
import { redirect } from 'next/navigation'
import { Calendar, ArrowLeft, MapPin, Box } from 'lucide-react'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import InstructorLeaveReviewButton from '@/components/reviews/InstructorLeaveReviewButton'
import Link from 'next/link'

export default async function InstructorSessionsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Run financial jobs lazily when page is loaded
    await Promise.allSettled([
        autoCompleteBookings(),
        unlockMaturedFunds(),
        expireAbandonedBookings(),
    ])

    // Fetch instructor's bookings (where they booked a studio slot for themselves)
    const { data: bookings } = await supabase
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
            client:profiles!client_id (
                id,
                full_name,
                avatar_url
            ),
            instructor:profiles!instructor_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
    const now = new Date()

    const ACTIVE_STATUSES = ['approved']
    const upcomingBookings = bookings?.filter(b => ACTIVE_STATUSES.includes(b.status) && new Date(getFirst(b.slots)?.start_time) > now) || []
    const pastBookings = bookings?.filter(b => !ACTIVE_STATUSES.includes(b.status) || new Date(getFirst(b.slots)?.start_time) <= now) || []

    return (
        <div className="min-h-screen bg-cream-50 p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Sessions</h1>
                    <p className="text-charcoal-600">Track studio slots you've booked and leave reviews after sessions.</p>
                </div>

                {/* Upcoming */}
                <section>
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-charcoal-500" />
                        Upcoming Sessions
                    </h2>
                    {upcomingBookings.length === 0 ? (
                        <p className="text-charcoal-400 text-sm">No upcoming sessions.</p>
                    ) : (
                        <div className="space-y-3">
                            {upcomingBookings.map((booking: any) => {
                                const slot = getFirst(booking.slots)
                                const studio = getFirst(slot?.studios)
                                const client = getFirst(booking.client)
                                return (
                                    <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <Link href={`/studios/${studio?.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                            <img
                                                                src={studio?.logo_url || "/logo.png"}
                                                                alt={studio?.name || "Studio"}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </Link>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex flex-col gap-1 items-start min-w-0">
                                                                    <Link href={`/studios/${studio?.id}`} className="text-sm font-bold text-charcoal-900 truncate w-full hover:text-rose-gold transition-colors">
                                                                        {studio?.name || "Studio"}
                                                                    </Link>
                                                                    <span className={clsx(
                                                                        "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0",
                                                                        booking.status === 'approved' ? "bg-green-100/50 text-green-700 border-green-200" :
                                                                            booking.status === 'rejected' || booking.status === 'cancelled' ? "bg-red-100/50 text-red-700 border-red-200" :
                                                                                "bg-amber-100/50 text-amber-700 border-amber-200"
                                                                    )}>
                                                                        {booking.status === 'approved' ? 'Confirmed' : booking.status}
                                                                    </span>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-[13px] font-bold text-charcoal-900 leading-none">
                                                                        {new Date(slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </p>
                                                                    <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                        {new Date(slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {client && client.id !== user.id && (
                                            <div className="pt-3 border-t border-cream-200/50 space-y-2">
                                                <div className="flex items-center gap-2 group/inst">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 hover:border-rose-gold transition-colors">
                                                        <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="text-xs text-charcoal-600 truncate flex-1 group-hover/inst:text-charcoal-900 transition-colors">
                                                        Client: <span className="font-semibold text-charcoal-900">{client.full_name || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                                    <span className="font-semibold text-charcoal-700 leading-tight">
                                                        {studio?.location || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                                    <span className="font-semibold text-charcoal-700">
                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                            ? slot.equipment[0]
                                                            : (booking.price_breakdown?.equipment || booking.equipment || 'Standard Session')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                {client && client.id !== user.id && (
                                                    <StudioChatButton bookingId={booking.id} currentUserId={user.id} partnerId={client.id} partnerName={client.full_name || 'Client'} label="Message Client" />
                                                )}
                                                {studio && studio.owner_id && (
                                                    <StudioChatButton bookingId={booking.id} currentUserId={user.id} partnerId={studio.owner_id} partnerName={studio.name || 'Studio'} label="Message Studio" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Past Sessions */}
                {pastBookings.length > 0 && (
                    <section>
                        <h2 className="text-xl font-serif text-charcoal-900 mb-6">Past Sessions</h2>
                        <div className="space-y-4">
                            {pastBookings.map((booking: any) => {
                                const slot = getFirst(booking.slots)
                                const studio = getFirst(slot?.studios)
                                const client = getFirst(booking.client)
                                return (
                                    <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-1 w-full">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <Link href={`/studios/${studio?.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                            <img
                                                                src={studio?.logo_url || "/logo.png"}
                                                                alt={studio?.name || "Studio"}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </Link>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex flex-col gap-1 items-start min-w-0">
                                                                    <Link href={`/studios/${studio?.id}`} className="text-sm font-bold text-charcoal-900 truncate w-full hover:text-rose-gold transition-colors">
                                                                        {studio?.name || "Studio"}
                                                                    </Link>
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
                                                                        {new Date(slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </p>
                                                                    <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                        {new Date(slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {client && client.id !== user.id && (
                                            <div className="pt-3 border-t border-cream-200/50 space-y-2">
                                                <div className="flex items-center gap-2 group/inst">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 hover:border-rose-gold transition-colors">
                                                        <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="text-xs text-charcoal-600 truncate flex-1 group-hover/inst:text-charcoal-900 transition-colors">
                                                        Client: <span className="font-semibold text-charcoal-900">{client.full_name || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                                    <span className="font-semibold text-charcoal-700 leading-tight">
                                                        {studio?.location || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                                    <span className="font-semibold text-charcoal-700">
                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                            ? slot.equipment[0]
                                                            : (booking.price_breakdown?.equipment || booking.equipment || 'Standard Session')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                {client && client.id !== user.id && (
                                                    <StudioChatButton bookingId={booking.id} currentUserId={user.id} partnerId={client.id} partnerName={client.full_name || 'Client'} label="Message Client" />
                                                )}
                                                {studio && studio.owner_id && (
                                                    <StudioChatButton bookingId={booking.id} currentUserId={user.id} partnerId={studio.owner_id} partnerName={studio.name || 'Studio'} label="Message Studio" />
                                                )}
                                                {booking.status === 'completed' && (
                                                    <InstructorLeaveReviewButton
                                                        booking={booking}
                                                        currentUserId={user.id}
                                                        studioOwnerId={studio?.owner_id ?? null}
                                                        studioName={studio?.name ?? 'Studio'}
                                                        clientId={client?.id ?? null}
                                                        clientName={client?.full_name ?? 'Client'}
                                                        hideClientReview={client?.id === user.id}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
