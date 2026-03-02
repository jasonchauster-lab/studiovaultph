import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Clock, Users, Star, ShowerHead, Droplets, Car, Wifi, Square, Lock, Shirt, CheckCircle2 } from 'lucide-react'
import BookingSection from '@/components/customer/BookingSection'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import NextImage from 'next/image'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'

export default async function StudioDetailsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Lazily expire any abandoned bookings to release their slots
    const { expireAbandonedBookings } = await import('@/lib/wallet')
    await expireAbandonedBookings().catch(() => { }) // Non-blocking

    // 1. Fetch Studio Details
    const { data: studio } = await supabase
        .from('studios')
        .select('*, profiles!owner_id(available_balance, is_suspended)')
        .eq('id', id)
        .single()

    if (!studio) notFound()

    // 2. Fetch Available Slots (Upcoming only, Manila Time)
    const nowDate = getManilaTodayStr()
    const nowTime = toManilaTimeString(new Date())

    const { data: slots } = await supabase
        .from('slots')
        .select('*')
        .eq('studio_id', id)
        .eq('is_available', true)
        .or(`date.gt.${nowDate},and(date.eq.${nowDate},start_time.gte.${nowTime})`)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

    const trimmedStudioLocation = studio.location?.trim() ?? ''
    // Build a list of tokens from the location for fuzzy matching
    // e.g., "QC - Fairview/Commonwealth" → ["QC", "Fairview", "Commonwealth"]
    const locationTokens = trimmedStudioLocation
        .split(/[\s\-\/,]+/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 1)

    // 3. Fetch ALL verified instructors with availability (broad fetch, filter in JS)
    // We deliberately don't filter by location here to avoid missing fuzzy matches.
    const { data: instructorsRaw } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            rates,
            certifications!inner (
                verified
            ),
            instructor_availability!inner (
                location_area
            )
        `)
        .eq('role', 'instructor')

    // JS-level fuzzy location filter: instructor location must overlap at least one token
    const instructors = (instructorsRaw || []).filter(i => {
        const verified = i.certifications && i.certifications.some((c: any) => c.verified)
        if (!verified) return false
        const instrLocations: string[] = Array.isArray(i.instructor_availability)
            ? i.instructor_availability.map((a: any) => (a.location_area ?? '').trim().toLowerCase())
            : []
        return instrLocations.some(loc =>
            loc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some((token: string) => loc.includes(token.toLowerCase()) || loc.startsWith(token.toLowerCase()))
        )
    })

    // 4. Fetch Availability blocks for this location (fuzzy — all instructors from the list above)
    const instructorIds = instructors.map((i: any) => i.id)
    const { data: locationAvailabilityRaw } = instructorIds.length > 0
        ? await supabase
            .from('instructor_availability')
            .select('instructor_id, day_of_week, date, start_time, end_time, location_area')
            .in('instructor_id', instructorIds)
        : { data: [] }

    // JS-level location filter on availability blocks
    const locationAvailability = (locationAvailabilityRaw || []).filter((block: any) => {
        const bLoc = (block.location_area ?? '').trim().toLowerCase()
        return bLoc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some((token: string) => bLoc.includes(token.toLowerCase()) || bLoc.startsWith(token.toLowerCase()))
    })

    // 5. Fetch public reviews for the studio owner's profile
    const { reviews, averageRating, totalCount } = await getPublicReviews(studio.owner_id)

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header omitted for brevity */}
                {/* ... existing header code ... */}

                {/* Booking Section */}
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8 mb-8">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-charcoal-500" />
                        Available Slots
                    </h2>
                    {(() => {
                        const now = new Date().toISOString().split('T')[0];
                        const owner = Array.isArray(studio.profiles) ? studio.profiles[0] : studio.profiles;
                        const isSuspended = owner?.is_suspended || (owner?.available_balance || 0) < 0;
                        const expired = (studio.mayors_permit_expiry && studio.mayors_permit_expiry < now)
                            || (studio.bir_certificate_expiry && studio.bir_certificate_expiry < now);

                        if (expired || studio.verified === false || isSuspended) {
                            return (
                                <div className="py-8 text-center bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-red-700 font-medium text-sm">This studio is temporarily unavailable for bookings.</p>
                                    <p className="text-red-600 text-xs mt-1">One or more required documents have expired or the studio is under administrative review.</p>
                                </div>
                            );
                        }
                        return (
                            <BookingSection
                                studioId={studio.id}
                                slots={slots || []}
                                instructors={instructors}
                                availabilityBlocks={locationAvailability || []}
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

