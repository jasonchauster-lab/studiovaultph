import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { User, Award, Instagram, Calendar, Star, Image as ImageIcon } from 'lucide-react'

import InstructorBookingWizard from '@/components/customer/InstructorBookingWizard'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import PublicInstructorGallery from '@/components/instructor/PublicInstructorGallery'
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
    const { reviews, averageRating, totalCount } = await getPublicReviews(id)

    return (
        <div className="min-h-screen bg-alabaster relative selection:bg-sage/20">
            <div className="fixed inset-0 bg-white/50 animate-mesh -z-10 pointer-events-none" />

            <div className="p-4 sm:p-8 md:p-12">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Sidebar: Profile Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-card p-8 rounded-[32px] text-center sticky top-24">
                            <div className="w-32 h-32 bg-white/40 rounded-full flex items-center justify-center mx-auto mb-6 overflow-hidden border-2 border-white/80 shadow-cloud">
                                {instructor.avatar_url ? (
                                    <img
                                        src={instructor.avatar_url}
                                        alt={instructor.full_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-16 h-16 text-charcoal/20" />
                                )}
                            </div>
                            <h1 className="text-3xl font-serif font-bold text-charcoal mb-2 tracking-tight">{instructor.full_name}</h1>
                            {instructor.instagram_handle && (
                                <a
                                    href={`https://instagram.com/${instructor.instagram_handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 text-[10px] font-bold text-sage uppercase tracking-widest hover:text-charcoal transition-colors group"
                                >
                                    <Instagram className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    @{instructor.instagram_handle}
                                </a>
                            )}

                            {/* Average Rating */}
                            <div className="mt-6 flex justify-center">
                                <a href="#reviews" className="hover:opacity-80 transition-opacity">
                                    <StarRating rating={averageRating} count={totalCount} size="sm" />
                                </a>
                            </div>

                            {instructor.bio && (
                                <div className="mt-6 text-[13px] font-medium text-charcoal/60 leading-relaxed italic px-4">
                                    &ldquo;{instructor.bio}&rdquo;
                                </div>
                            )}

                            <div className="mt-8 flex flex-wrap justify-center gap-2">
                                {instructor.certifications?.map((c: any, i: number) => (
                                    <span
                                        key={i}
                                        className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${c.verified
                                            ? "bg-sage/10 text-sage border-sage/20"
                                            : "bg-white/40 text-charcoal/40 border-white/60"
                                            }`}
                                        title={c.verified ? 'Verified Certification' : 'Pending Verification'}
                                    >
                                        <Award className="w-3 h-3" />
                                        {c.certification_body}
                                        {!c.verified && <span className="opacity-50">(Pending)</span>}
                                    </span>
                                ))}
                            </div>


                            {/* Teaching Equipment */}
                            {instructor.teaching_equipment && instructor.teaching_equipment.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-charcoal/5">
                                    <h3 className="text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em] mb-4">
                                        Certified Equipment
                                    </h3>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {instructor.teaching_equipment.map((eq: string) => (
                                            <span key={eq} className="bg-white/60 text-charcoal text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-[12px] border border-white">
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Booking Wizard Section */}
                        <div className="glass-card p-8 rounded-[32px]">
                            <h2 className="text-2xl font-serif font-bold text-charcoal mb-8 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-sage/10 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-sage" />
                                </div>
                                Book a Session
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
                                <h2 className="text-2xl font-serif font-bold text-charcoal mb-8 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-gold" />
                                    </div>
                                    The Practice in Action
                                </h2>
                                <PublicInstructorGallery images={instructor.gallery_images} />
                            </div>
                        )}


                        {/* Reviews Section */}

                        <div id="reviews" className="glass-card p-8 rounded-[32px] scroll-mt-24">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-serif font-bold text-charcoal flex items-center gap-3">
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
