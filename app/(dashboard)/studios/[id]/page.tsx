import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Clock, Users, Star } from 'lucide-react'
import BookingSection from '@/components/customer/BookingSection'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import NextImage from 'next/image'

export default async function StudioDetailsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch Studio Details
    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('id', id)
        .single()

    if (!studio) notFound()

    // 2. Fetch Available Slots
    const { data: slots } = await supabase
        .from('slots')
        .select('*')
        .eq('studio_id', id)
        .eq('is_available', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

    // 3. Fetch Verified Instructors for Dropdown
    const { data: instructorsRaw } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            rates,
            certifications!inner (
                verified
            )
        `)
        .eq('role', 'instructor')

    const instructors = instructorsRaw?.filter(i =>
        i.certifications && i.certifications.some((c: any) => c.verified)
    ) || []

    // 4. Fetch public reviews for the studio owner's profile
    const { reviews, averageRating, totalCount } = await getPublicReviews(studio.owner_id)

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8 mb-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Studio Logo */}
                        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-cream-50 flex-shrink-0 border border-cream-200 flex items-center justify-center">
                            {studio.logo_url ? (
                                <NextImage
                                    src={studio.logo_url}
                                    alt={studio.name}
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-charcoal-200 font-serif italic text-4xl">
                                    {studio.name.slice(0, 1)}
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-serif text-charcoal-900 mb-2">{studio.name}</h1>
                            <div className="flex items-center gap-4 text-charcoal-600 mb-3">
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {studio.location}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {studio.reformers_count} Reformers
                                </span>
                            </div>
                            {studio.address && (
                                <p className="text-sm text-charcoal-500 mb-4">{studio.address}</p>
                            )}
                            <a href="#reviews" className="inline-block hover:opacity-80 transition-opacity">
                                <StarRating rating={averageRating} count={totalCount} size="md" />
                            </a>
                        </div>
                    </div>

                    {studio.bio && (
                        <div className="mt-6 text-charcoal-600 border-t border-cream-100 pt-6 italic">
                            "{studio.bio}"
                        </div>
                    )}
                    {studio.description && (
                        <p className={studio.bio ? "mt-4 text-charcoal-600" : "mt-6 text-charcoal-600 border-t border-cream-100 pt-6"}>
                            {studio.description}
                        </p>
                    )}
                </div>

                {/* Booking Section */}
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8 mb-8">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-charcoal-500" />
                        Available Slots
                    </h2>
                    {(() => {
                        const now = new Date().toISOString().split('T')[0];
                        const expired = (studio.mayors_permit_expiry && studio.mayors_permit_expiry < now)
                            || (studio.bir_certificate_expiry && studio.bir_certificate_expiry < now);
                        if (expired || studio.verified === false) {
                            return (
                                <div className="py-8 text-center bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-red-700 font-medium text-sm">This studio is temporarily unavailable for bookings.</p>
                                    <p className="text-red-600 text-xs mt-1">One or more required documents have expired. The studio owner has been notified.</p>
                                </div>
                            );
                        }
                        return (
                            <BookingSection
                                studioId={studio.id}
                                slots={slots || []}
                                instructors={instructors}
                                studioHourlyRate={studio.hourly_rate || 0}
                                studioPricing={studio.pricing as Record<string, number> | undefined}
                            />
                        );
                    })()}
                </div>


                {/* Reviews Section */}
                <div id="reviews" className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8 scroll-mt-24">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-2 flex items-center gap-2">
                        <Star className="w-5 h-5 text-charcoal-500" />
                        Member Reviews
                    </h2>
                    <div className="mb-6">
                        <StarRating rating={averageRating} count={totalCount} size="lg" />
                    </div>
                    <ReviewList reviews={reviews} />
                </div>
            </div>
        </div >
    )
}

