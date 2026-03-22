import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { User, Award, Instagram, Calendar, Star, Image as ImageIcon } from 'lucide-react'

import InstructorBookingWizard from '@/components/customer/InstructorBookingWizard'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import PublicInstructorGallery from '@/components/instructor/PublicInstructorGallery'
import InstructorProfileCard from '@/components/instructor/InstructorProfileCard'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import NextImage from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import { clsx } from 'clsx'


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
        <div className="min-h-screen bg-[#faf9f6] relative selection:bg-sage/20 pb-20">
            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply" 
                style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }} 
            />

            {/* Banner Section */}
            {instructor.banner_url && (
                <div className="relative w-full h-[200px] sm:h-[350px] bg-cream-100 overflow-hidden">
                    <NextImage
                        src={getSupabaseAssetUrl(instructor.banner_url, 'avatars') || '/default-banner.svg'}
                        alt={`${instructor.full_name} Banner`}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
            )}

            <div className={clsx("max-w-7xl mx-auto p-4 sm:p-8 md:p-12", instructor.banner_url && "-mt-16 sm:-mt-24 relative z-10")}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* Sidebar: Profile Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <InstructorProfileCard 
                            instructor={instructor as any} 
                            averageRating={averageRating ?? undefined} 
                            totalReviews={totalCount} 
                            isSticky={true} 
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Booking Wizard Section */}
                        <div className="atelier-card p-10">
                            <h2 className="text-3xl font-serif font-bold text-burgundy mb-10 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shadow-lg shadow-forest/20">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                Session Schedule
                            </h2>

                            <InstructorBookingWizard
                                instructorId={instructor.id}
                                availability={availability || []}
                                activeBookings={activeBookings || []}
                                instructorRates={instructor?.rates || {}}
                                pendingBookings={pendingBookings || []}
                                offersHomeSessions={instructor.offers_home_sessions}
                                maxTravelKm={instructor.max_travel_km}
                                homeBaseLat={instructor.home_base_lat}
                                homeBaseLng={instructor.home_base_lng}
                            />
                        </div>

                        {/* Photo Gallery Section */}
                        {instructor.gallery_images && instructor.gallery_images.length > 0 && (
                            <div className="atelier-card p-10">
                                <h2 className="text-3xl font-serif font-bold text-burgundy mb-10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-burgundy text-white flex items-center justify-center shadow-lg shadow-burgundy/20">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                    In Practice
                                </h2>
                                <PublicInstructorGallery images={instructor.gallery_images} />
                            </div>
                        )}


                        {/* Reviews Section */}
                        <div id="reviews" className="atelier-card p-10 scroll-mt-32">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                                <h2 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                                        <Star className="w-6 h-6" />
                                    </div>
                                    Student Stories
                                </h2>
                                <div className="bg-white px-6 py-3 rounded-2xl border border-burgundy/5 shadow-sm">
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
