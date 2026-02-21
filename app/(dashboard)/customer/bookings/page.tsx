import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QrCode, Calendar } from 'lucide-react'
import clsx from 'clsx'
import BookingList from '@/components/customer/BookingList'
import ReviewTrigger from '@/components/reviews/ReviewTrigger'
import LeaveReviewButton from '@/components/reviews/LeaveReviewButton'
import { getPendingReviews } from '@/app/(dashboard)/reviews/actions'

export default async function CustomerBookingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch Bookings with nested details
    // We need Studio name and Instructor name
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            *,
            slots (
                start_time,
                end_time,
                studios (
                    name,
                    location,
                    address,
                    owner_id
                )
            ),
            instructor:profiles!instructor_id (
                id,
                full_name,
                avatar_url,
                instagram_handle
            ),
            client:profiles!client_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })

    // Fetch pending reviews for the customer
    const { bookings: pendingReviews, isInstructor } = await getPendingReviews()

    const upcomingBookings = bookings?.filter(b => new Date(b.slots.start_time) > new Date()) || []
    const pastBookings = bookings?.filter(b => new Date(b.slots.start_time) <= new Date()) || []

    return (
        <div className="min-h-screen bg-cream-50 p-8">
            {/* Review Trigger: shows modal for pending reviews */}
            {pendingReviews && pendingReviews.length > 0 && (
                <ReviewTrigger
                    pendingBookings={pendingReviews as any}
                    currentUserId={user.id}
                    isInstructor={isInstructor ?? false}
                />
            )}
            <div className="max-w-4xl mx-auto space-y-12">

                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Sessions</h1>
                    <p className="text-charcoal-600">Track your upcoming classes and access your entry pass.</p>
                </div>

                {/* Digital Entry Pass (For the next confirmed session) */}
                {upcomingBookings.some(b => b.status === 'approved') && (
                    <div className="bg-charcoal-900 rounded-2xl p-8 text-cream-50 flex flex-col md:flex-row items-center justify-between shadow-xl">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-charcoal-300 text-sm uppercase tracking-widest font-medium">
                                <QrCode className="w-4 h-4" />
                                Digital Entry Pass
                            </div>
                            <h2 className="text-3xl font-serif mb-1">
                                {upcomingBookings.find(b => b.status === 'approved')?.slots.studios.name}
                            </h2>
                            {upcomingBookings.find(b => b.status === 'approved')?.slots.studios.address && (
                                <p className="text-charcoal-400 text-sm mb-1">
                                    {upcomingBookings.find(b => b.status === 'approved')?.slots.studios.address}
                                </p>
                            )}
                            <p className="text-charcoal-300 mb-6">
                                {new Date(upcomingBookings.find(b => b.status === 'approved')?.slots.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                {' • '}
                                {new Date(upcomingBookings.find(b => b.status === 'approved')?.slots.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-charcoal-800 rounded-full flex items-center justify-center text-lg font-bold">
                                    {(user.email?.[0] || 'U').toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-cream-50">Member Access</p>
                                    <p className="text-xs text-charcoal-400">{user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* QR Code Mockup */}
                        <div className="mt-8 md:mt-0 bg-white p-4 rounded-xl">
                            <div className="w-32 h-32 bg-charcoal-100 flex items-center justify-center rounded-lg border-2 border-dashed border-charcoal-300">
                                <QrCode className="w-16 h-16 text-charcoal-900 opacity-80" />
                            </div>
                            <p className="text-center text-[10px] text-charcoal-500 mt-2 font-mono">SCAN AT DESK</p>
                        </div>
                    </div>
                )}

                {/* Upcoming List */}
                <section>
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-charcoal-500" />
                        Upcoming Sessions
                    </h2>

                    <BookingList bookings={bookings || []} userId={user.id} />
                </section>

                {/* Past List */}
                {pastBookings.length > 0 && (
                    <section>
                        <h2 className="text-xl font-serif text-charcoal-900 mb-6">Past Sessions</h2>
                        <div className="space-y-4">
                            {pastBookings.map((booking: any) => (
                                <div key={booking.id} className="bg-white p-4 rounded-xl border border-cream-200 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="text-charcoal-500 text-sm">
                                            {new Date(booking.slots.start_time).toLocaleDateString()}
                                        </div>
                                        <div className="font-medium text-charcoal-700">{booking.slots.studios.name}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Show Leave Review button only for completed sessions or passed approved sessions */}
                                        {(() => {
                                            const isPast = new Date(booking.slots?.end_time) < new Date()
                                            const canReview = booking.status === 'completed' || (booking.status === 'approved' && isPast)

                                            if (!canReview) return null

                                            const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
                                            const studio = getFirst(booking.slots?.studios)
                                            return (
                                                <LeaveReviewButton
                                                    booking={booking}
                                                    currentUserId={user.id}
                                                    studioOwnerId={studio?.owner_id ?? null}
                                                    studioName={studio?.name ?? 'Studio'}
                                                />
                                            )
                                        })()}
                                        <span className={clsx(
                                            "text-xs px-2 py-1 rounded",
                                            booking.status === 'completed' ? "bg-green-100 text-green-700" :
                                                booking.status === 'approved' ? "bg-green-100 text-green-700" :
                                                    booking.status === 'rejected' ? "bg-red-100 text-red-700" :
                                                        "bg-charcoal-100 text-charcoal-600"
                                        )}>
                                            {booking.status === 'completed' ? 'Completed' :
                                                booking.status === 'approved' ? 'Completed' :
                                                    booking.status === 'pending' ? 'Expired' :
                                                        booking.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
