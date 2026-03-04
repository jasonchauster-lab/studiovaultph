import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Clock, Users, Star, ShowerHead, Droplets, Car, Wifi, Square, Lock, Shirt, CheckCircle2 } from 'lucide-react'
import BookingSection from '@/components/customer/BookingSection'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import NextImage from 'next/image'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'

import { startOfMonth, endOfMonth, format } from 'date-fns'

export default async function StudioDetailsPage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ month?: string }>
}) {
    const { id } = await props.params
    const searchParams = await props.searchParams
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

    const { data: { user } } = await supabase.auth.getUser()

    // 2. Fetch Available Slots for the visible month
    // Also fetch slots that are currently locked by the CURRENT user's pending bookings
    const { data: pendingBookings } = user ? await supabase
        .from('bookings')
        .select('id, slot_id, status, booked_slot_ids')
        .eq('client_id', user.id)
        .eq('status', 'pending') : { data: [] }

    // Extract all slot IDs currently locked by this specific user
    const lockedSlotIds = (pendingBookings || []).flatMap(b => b.booked_slot_ids || []);

    const monthParam = searchParams.month || format(new Date(), 'yyyy-MM')
    const rangeStart = startOfMonth(new Date(monthParam + '-01'))
    const rangeEnd = endOfMonth(rangeStart)
    const startDateStr = format(rangeStart, 'yyyy-MM-dd')
    const endDateStr = format(rangeEnd, 'yyyy-MM-dd')

    // Also consider today for the "past" filter
    const nowDate = getManilaTodayStr()
    const nowTime = toManilaTimeString(new Date())

    let slotsQuery = supabase
        .from('slots')
        .select('*')
        .eq('studio_id', id)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .or(`date.gt.${nowDate},and(date.eq.${nowDate},start_time.gte.${nowTime})`)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

    if (lockedSlotIds.length > 0) {
        // If the user has locked slots, fetch available slots OR their locked slots
        slotsQuery = slotsQuery.or(`is_available.eq.true,id.in.(${lockedSlotIds.join(',')})`)
    } else {
        // Otherwise, just fetch available slots
        slotsQuery = slotsQuery.eq('is_available', true)
    }

    const { data: slots } = await slotsQuery

    const trimmedStudioLocation = studio.location?.trim() ?? ''
    // Build a list of tokens from the location for fuzzy matching
    // e.g., "QC - Fairview/Commonwealth" → ["QC", "Fairview", "Commonwealth"]
    const locationTokens = trimmedStudioLocation
        .split(/[\s\-\/,]+/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 1)

    // 3. Fetch verified instructors (Bypassing broken joins due to schema cache issues)
    // 3. Fetch verified instructors and their availability
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, rates, avatar_url')
        .eq('role', 'instructor')
        .not('rates', 'is', null)

    const allInstructorIds = (profiles || []).map(p => p.id)

    // Parallel fetch for all related instructor data
    const [{ data: certsRaw }, { data: availabilityRaw }] = await Promise.all([
        supabase
            .from('certifications')
            .select('instructor_id, verified')
            .in('instructor_id', allInstructorIds)
            .eq('verified', true),
        supabase
            .from('instructor_availability')
            .select('instructor_id, day_of_week, date, start_time, end_time, location_area')
            .in('instructor_id', allInstructorIds)
    ])

    // Filter and build definitive Instructor objects
    const instructors = (profiles || []).map(p => ({
        ...p,
        certifications: (certsRaw || []).filter(c => c.instructor_id === p.id),
        instructor_availability: (availabilityRaw || []).filter(a => a.instructor_id === p.id)
    })).filter(i => {
        // Must have at least one verified certification
        if (i.certifications.length === 0) return false

        // Location check: must have at least one availability entry that matches studio location
        const instrLocations = i.instructor_availability.map((a: any) => (a.location_area ?? '').trim().toLowerCase())
        return instrLocations.some(loc =>
            loc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some((token: string) => loc.includes(token.toLowerCase()) || loc.startsWith(token.toLowerCase()))
        )
    })

    // 4. Filter availability blocks to only those matching the studio's location
    const matchedInstructorIds = instructors.map(i => i.id)
    const locationAvailability = (availabilityRaw || []).filter((block: any) => {
        if (!matchedInstructorIds.includes(block.instructor_id)) return false
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
                                availabilityBlocks={locationAvailability}
                                studioPricing={studio.pricing}
                                studioHourlyRate={studio.hourly_rate}
                                studioLocation={studio.location}
                                pendingBookings={pendingBookings || []}
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

