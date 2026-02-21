import { createClient } from '@/lib/supabase/server'
import { autoCompleteBookings, unlockMaturedFunds } from '@/lib/wallet'
import { redirect } from 'next/navigation'
import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import InstructorLeaveReviewButton from '@/components/reviews/InstructorLeaveReviewButton'


export default async function InstructorSessionsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Run financial jobs lazily when page is loaded
    await Promise.allSettled([
        autoCompleteBookings(),
        unlockMaturedFunds()
    ])

    // Fetch instructor's bookings (where they booked a studio slot for themselves)
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            *,
            slots (
                start_time,
                end_time,
                studios (
                    id,
                    name,
                    location,
                    owner_id
                )
            ),
            client:profiles!client_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
    const now = new Date()

    const upcomingBookings = bookings?.filter(b => new Date(getFirst(b.slots)?.start_time) > now) || []
    const pastBookings = bookings?.filter(b => new Date(getFirst(b.slots)?.start_time) <= now) || []

    return (
        <div className="min-h-screen bg-cream-50 p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                <div>
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
                                return (
                                    <div key={booking.id} className="bg-white p-4 rounded-xl border border-cream-200 flex justify-between items-center">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                            <div className="text-charcoal-500 text-sm font-medium">
                                                {new Date(slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="font-bold text-charcoal-700">{studio?.name}</div>
                                                <div className="text-xs text-charcoal-500 flex items-center gap-1.5">
                                                    <span>{new Date(slot?.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot?.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="w-1 h-1 rounded-full bg-cream-300" />
                                                    <span className="font-medium text-charcoal-600">{booking.price_breakdown?.equipment || booking.equipment || 'Session'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            'text-xs px-2 py-1 rounded',
                                            booking.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-charcoal-100 text-charcoal-600'
                                        )}>
                                            {booking.status}
                                        </span>
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
                                    <div key={booking.id} className="bg-white p-4 rounded-xl border border-cream-200 flex justify-between items-center flex-wrap gap-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                            <div className="text-charcoal-500 text-sm font-medium">
                                                {new Date(slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="font-bold text-charcoal-700">{studio?.name}</div>
                                                <div className="text-xs text-charcoal-500 flex items-center gap-1.5">
                                                    <span>{new Date(slot?.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="w-1 h-1 rounded-full bg-cream-300" />
                                                    <span className="font-medium text-charcoal-600">{booking.price_breakdown?.equipment || booking.equipment || 'Session'}</span>
                                                    {client && client.id !== user.id && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-cream-300" />
                                                            <span>w/ {client.full_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
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
                                            <span className={clsx(
                                                'text-xs px-2 py-1 rounded font-medium',
                                                booking.status === 'completed'
                                                    ? (booking.funds_unlocked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700') :
                                                    booking.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                        booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-charcoal-100 text-charcoal-600'
                                            )}>
                                                {booking.status === 'completed'
                                                    ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held (24h)') :
                                                    booking.status === 'approved' ? 'Awaiting Completion' :
                                                        booking.status === 'pending' ? 'Pending' :
                                                            booking.status}
                                            </span>
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
