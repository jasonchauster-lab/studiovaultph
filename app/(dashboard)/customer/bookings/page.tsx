import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QrCode, Calendar } from 'lucide-react'
import clsx from 'clsx'
import BookingList from '@/components/customer/BookingList'
import ReviewTrigger from '@/components/reviews/ReviewTrigger'
import { getPendingReviews } from '@/app/(dashboard)/reviews/actions'

export default async function CustomerBookingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Lazily expire any abandoned bookings before fetching (same as dashboard + payment page)
    const { expireAbandonedBookings } = await import('@/lib/wallet')
    await expireAbandonedBookings().catch(() => { })

    // We need Studio name and Instructor name
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            *,
            slots (
                date,
                start_time,
                end_time,
                equipment
            ),
            studios:studio_id (
                id,
                name,
                location,
                address,
                owner_id,
                logo_url
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
        .in('status', ['approved', 'completed', 'cancelled_refunded', 'cancelled_charged', 'pending', 'submitted', 'rejected', 'expired'])
        .order('created_at', { ascending: false })

    // ── Signed URL Generation ──────────────────────────────────────────
    const isStoragePath = (url: string) => url && !url.startsWith('http');
    const storagePaths = ((bookings || []).map(b => b.payment_proof_url).filter(isStoragePath)) as string[]

    let signedUrlMap: Record<string, string> = {}
    if (storagePaths.length > 0) {
        const { data } = await supabase.storage
            .from('payment-proofs')
            .createSignedUrls(storagePaths, 3600)

        data?.forEach(item => {
            if (item.signedUrl && item.path) {
                signedUrlMap[item.path] = item.signedUrl
            }
        })
    }

    const finalBookings = bookings?.map(b => {
        const proofUrl = b.payment_proof_url;
        return {
            ...b,
            payment_proof_url: isStoragePath(proofUrl)
                ? (signedUrlMap[proofUrl as string] || proofUrl)
                : proofUrl
        }
    }) || []

    // Fetch pending reviews for the customer
    const { bookings: pendingReviews, isInstructor } = await getPendingReviews()

    const getSlotDateTime = (date: string | undefined, time: string | undefined) => {
        if (!date || !time) return new Date(0)
        return new Date(`${date}T${time}+08:00`)
    }
    const now = new Date()
    const upcomingBookings = finalBookings.filter(b => getSlotDateTime(b.slots?.date, b.slots?.start_time) > now)

    // Cache next approved session once instead of calling .find() 5Ã— in JSX
    const nextSession = upcomingBookings.find(b => b.status === 'approved')

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
                {nextSession && (
                    <div className="bg-charcoal-900 rounded-2xl p-8 text-cream-50 flex flex-col md:flex-row items-center justify-between shadow-xl">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-charcoal-300 text-sm uppercase tracking-widest font-medium">
                                <QrCode className="w-4 h-4" />
                                Digital Entry Pass
                            </div>
                            <h2 className="text-3xl font-serif mb-1">
                                {nextSession.studios?.name || nextSession.slots?.studios?.name || 'Studio'}
                            </h2>
                            {(nextSession.studios?.address || nextSession.slots?.studios?.address) && (
                                <p className="text-charcoal-400 text-sm mb-1">
                                    {nextSession.studios?.address || nextSession.slots?.studios?.address}
                                </p>
                            )}
                            <p className="text-charcoal-300 mb-6">
                                {getSlotDateTime(nextSession.slots?.date, nextSession.slots?.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                {' • '}
                                {getSlotDateTime(nextSession.slots?.date, nextSession.slots?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
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
                        My Sessions
                    </h2>

                    <BookingList bookings={finalBookings} userId={user.id} />
                </section>
            </div>
        </div>
    )
}
