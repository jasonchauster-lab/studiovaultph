import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { User, Award, Instagram, Calendar, Star, Image as ImageIcon } from 'lucide-react'

import InstructorBookingWizard from '@/components/customer/InstructorBookingWizard'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import PublicInstructorGallery from '@/components/instructor/PublicInstructorGallery'
import InstructorProfileCard from '@/components/instructor/InstructorProfileCard'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'


import { startOfMonth, endOfMonth, format } from 'date-fns'

export default async function InstructorProfilePage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ month?: string }>
}) {
    const { id } = await props.params
    const searchParams = await props.searchParams
    const supabase = await createClient()

    // Lazily expire any abandoned bookings to release their slots
    const { expireAbandonedBookings } = await import('@/lib/wallet')
    await expireAbandonedBookings().catch(() => { }) // Non-blocking

    // 1. Fetch Instructor Profile & Certs
    const { data: instructor } = await supabase
        .from('profiles')
        .select(`
            *,
            certifications (
                certification_body,
                certification_name,
                verified
            )

        `)
        .eq('id', id)
        .eq('role', 'instructor')
        .eq('is_suspended', false)
        .single()

    if (!instructor) notFound()

    // 2. Fetch Availability for the visible month
    const monthParam = searchParams.month || format(new Date(), 'yyyy-MM')
    const rangeStart = startOfMonth(new Date(monthParam + '-01'))
    const rangeEnd = endOfMonth(rangeStart)
    const startDateStr = format(rangeStart, 'yyyy-MM-dd')
    const endDateStr = format(rangeEnd, 'yyyy-MM-dd')

    const { data: availability } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', id)
        .or(`date.is.null,and(date.gte.${startDateStr},date.lte.${endDateStr})`)
        .order('day_of_week', { ascending: true })

    // 2.5 Fetch Active Bookings to filter out taken slots for this month
    const { data: activeBookings } = await supabase
        .from('bookings')
        .select('id, slots!inner(start_time, date)')
        .eq('instructor_id', id)
        .in('status', ['pending', 'approved'])
        .gte('slots.date', startDateStr)
        .lte('slots.date', endDateStr)

    // 2.6 Fetch this user's own pending bookings for resume-booking support
    const { data: { user } } = await supabase.auth.getUser()
    const { data: pendingBookings } = user ? await supabase
        .from('bookings')
        .select('id, slot_id, status, booked_slot_ids')
        .eq('client_id', user.id)
        .eq('status', 'pending') : { data: [] }

    // 3. Fetch public reviews for this instructor
    const { reviews, averageRating, totalCount } = await getPublicReviews(id, user?.id)

    return (
        <div className="min-h-screen bg-alabaster relative selection:bg-sage/20">
            <div className="fixed inset-0 bg-white/50 animate-mesh -z-10 pointer-events-none" />

            <div className="p-4 sm:p-8 md:p-12">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Sidebar: Profile Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <InstructorProfileCard 
                            instructor={instructor as any} 
                            averageRating={averageRating ?? undefined} 
                            totalReviews={totalCount} 
                            isSticky={true} 
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Booking Wizard Section */}
                        <div className="glass-card p-8 rounded-[32px]">
                            <h2 className="text-2xl font-serif font-bold text-burgundy mb-8 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-sage/10 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-sage" />
                                </div>
                                Schedule a Session
                            </h2>

                            <InstructorBookingWizard
                                instructorId={instructor.id}
                                availability={availability || []}
                                activeBookings={activeBookings || []}
                                instructorRates={instructor?.rates || {}}
                                pendingBookings={pendingBookings || []}
                            />
                        </div>

                        {/* Photo Gallery Section */}
                        {instructor.gallery_images && instructor.gallery_images.length > 0 && (
                            <div className="glass-card p-8 rounded-[32px]">
                                <h2 className="text-2xl font-serif font-bold text-burgundy mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-gold" />
                                    </div>
                                    From my Classes
                                </h2>
                                <PublicInstructorGallery images={instructor.gallery_images} />
                            </div>
                        )}


                        {/* Reviews Section */}

                        <div id="reviews" className="glass-card p-8 rounded-[32px] scroll-mt-24">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-serif font-bold text-burgundy flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                        <Star className="w-5 h-5 text-gold" />
                                    </div>
                                    Client Reviews
                                </h2>
                                <div className="bg-white/40 px-4 py-2 rounded-2xl border border-white/60">
                                    <StarRating rating={averageRating} count={totalCount} size="sm" />
                                </div>
                            </div>
                            <ReviewList reviews={reviews} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
