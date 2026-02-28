import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { User, Award, Instagram, Calendar, Star, Image as ImageIcon } from 'lucide-react'

import InstructorBookingWizard from '@/components/customer/InstructorBookingWizard'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import PublicInstructorGallery from '@/components/instructor/PublicInstructorGallery'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'


export default async function InstructorProfilePage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

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

    // 2. Fetch Availability
    const { data: availability } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', id)
        .order('day_of_week', { ascending: true })

    // 2.5 Fetch Active Bookings to filter out taken slots
    const { data: activeBookings } = await supabase
        .from('bookings')
        .select('id, slots(start_time)')
        .eq('instructor_id', id)
        .in('status', ['pending', 'confirmed', 'paid', 'submitted'])

    // 3. Fetch public reviews for this instructor
    const { reviews, averageRating, totalCount } = await getPublicReviews(id)

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Sidebar: Profile Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm text-center">
                        <div className="w-24 h-24 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border border-cream-200">
                            {instructor.avatar_url ? (
                                <img
                                    src={instructor.avatar_url}
                                    alt={instructor.full_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-12 h-12 text-charcoal-400" />
                            )}
                        </div>
                        <h1 className="text-2xl font-serif text-charcoal-900 mb-2">{instructor.full_name}</h1>
                        {instructor.instagram_handle && (
                            <a
                                href={`https://instagram.com/${instructor.instagram_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-800"
                            >
                                <Instagram className="w-4 h-4" />
                                @{instructor.instagram_handle}
                            </a>
                        )}

                        {/* Average Rating */}
                        <div className="mt-4 flex justify-center">
                            <a href="#reviews" className="hover:opacity-80 transition-opacity">
                                <StarRating rating={averageRating} count={totalCount} size="sm" />
                            </a>
                        </div>

                        {instructor.bio && (
                            <div className="mt-4 text-sm text-charcoal-600 leading-relaxed italic">
                                "{instructor.bio}"
                            </div>
                        )}

                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {instructor.certifications?.map((c: any, i: number) => (
                                <span
                                    key={i}
                                    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${c.verified
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-50 text-yellow-700 border border-yellow-100"
                                        }`}
                                    title={c.verified ? 'Verified Certification' : 'Pending Verification'}
                                >
                                    <Award className="w-3 h-3" />
                                    {c.certification_body}
                                    {!c.verified && <span className="text-[8px] uppercase ml-1 opacity-70">(Pending)</span>}
                                </span>
                            ))}
                        </div>


                        {/* Teaching Equipment */}
                        {instructor.teaching_equipment && instructor.teaching_equipment.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-cream-100">
                                <h3 className="text-xs font-bold text-charcoal-400 uppercase tracking-wider mb-3">
                                    Certified Equipment
                                </h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {instructor.teaching_equipment.map((eq: string) => (
                                        <span key={eq} className="bg-charcoal-100 text-charcoal-700 text-xs px-2.5 py-1 rounded-md border border-charcoal-200">
                                            {eq}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main: Booking Wizard */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-cream-200 shadow-sm">
                        <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-charcoal-500" />
                            Book a Session
                        </h2>

                        <InstructorBookingWizard
                            instructorId={instructor.id}
                            availability={availability || []}
                            activeBookings={activeBookings || []}
                        />
                    </div>

                    {/* Photo Gallery Section */}
                    {instructor.gallery_images && instructor.gallery_images.length > 0 && (
                        <PublicInstructorGallery images={instructor.gallery_images} />
                    )}


                    {/* Reviews Section */}

                    <div id="reviews" className="bg-white p-8 rounded-2xl border border-cream-200 shadow-sm scroll-mt-24">
                        <h2 className="text-xl font-serif text-charcoal-900 mb-2 flex items-center gap-2">
                            <Star className="w-5 h-5 text-charcoal-500" />
                            Client Reviews
                        </h2>
                        <div className="mb-6">
                            <StarRating rating={averageRating} count={totalCount} size="md" />
                        </div>
                        <ReviewList reviews={reviews} />
                    </div>
                </div>

            </div>
        </div>
    )
}
