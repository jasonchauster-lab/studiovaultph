import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Clock, Users, Star, ShowerHead, Droplets, Car, Wifi, Square, Lock, Shirt, CheckCircle2, Image as ImageIcon, ExternalLink } from 'lucide-react'
import BookingSection from '@/components/customer/BookingSection'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import PublicInstructorGallery from '@/components/instructor/PublicInstructorGallery'
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
        .select('*, profiles!owner_id(available_balance, is_suspended, avatar_url, full_name)')
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

    // 2.1 Fetch Slots: (TimeFilter AND available) OR (ID in user's locked list)
    // We run two queries and merge them to avoid complex PostgREST OR nesting issues
    // and to ensure locked slots bypass the "is_available" and "nowTime" filters.
    const [availableSlotsRes, lockedSlotsRes] = await Promise.all([
        supabase
            .from('slots')
            .select('*')
            .eq('studio_id', id)
            .eq('is_available', true)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .or(`date.gt.${nowDate},and(date.eq.${nowDate},start_time.gte.${nowTime})`)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true }),
        lockedSlotIds.length > 0 ? supabase
            .from('slots')
            .select('*')
            .in('id', lockedSlotIds)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true }) : { data: [] as any[] }
    ])

    const rawSlots = [...(availableSlotsRes.data || []), ...(lockedSlotsRes.data || [])]
    // Unique by ID
    const slots = Array.from(new Map(rawSlots.map(s => [s.id, s])).values())
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return a.start_time.localeCompare(b.start_time)
        })

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
        .select('id, full_name, rates, avatar_url, bio, instagram_handle, teaching_equipment')
        .eq('role', 'instructor')
        .not('rates', 'is', null)

    const allInstructorIds = (profiles || []).map(p => p.id)

    // Parallel fetch for all related instructor data
    const [{ data: certsRaw }, { data: availabilityRaw }] = await Promise.all([
        supabase
            .from('certifications')
            .select('instructor_id, verified, certification_body, certification_name')
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
    const { reviews, averageRating, totalCount } = await getPublicReviews(studio.owner_id, user?.id)

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Studio Header */}
                <div className="glass-card p-8 rounded-[32px] bg-white flex flex-col md:flex-row items-center gap-8 mb-8 border-border-grey shadow-cloud">
                    <div className="w-32 h-32 bg-off-white rounded-[24px] flex items-center justify-center overflow-hidden border-2 border-white shadow-tight shrink-0">
                        {studio.logo_url ? (
                            <img src={studio.logo_url} alt={studio.name} className="w-full h-full object-cover" />
                        ) : (studio.profiles as any)?.avatar_url ? (
                            <img src={`https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${(studio.profiles as any).avatar_url}`} alt={studio.name} className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-12 h-12 text-burgundy/10" />
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-4xl font-serif font-bold text-burgundy tracking-tight">{studio.name}</h1>
                            {studio.verified && (
                                <div className="badge-verified flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Verified Studio
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-burgundy/60 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-sage" />
                                {studio.location}
                            </div>
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent((studio.address || studio.location) + ', Philippines')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-bold text-sage hover:text-sage/80 border border-sage/30 hover:border-sage/60 px-3 py-1 rounded-full transition-all duration-200 bg-sage/5 hover:bg-sage/10"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Maps
                            </a>
                            <div className="flex items-center gap-1.5">
                                <StarRating rating={averageRating} count={totalCount} size="sm" />
                            </div>
                        </div>
                        {studio.bio && (
                            <p className="mt-4 text-burgundy/70 max-w-2xl leading-relaxed italic text-sm">
                                &ldquo;{studio.bio}&rdquo;
                            </p>
                        )}
                    </div>
                </div>

                {/* Booking Section */}
                <div className="glass-card p-8 rounded-[32px] bg-white border-border-grey shadow-cloud">
                    <h2 className="text-2xl font-serif font-bold text-burgundy mb-8 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sage/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-sage" />
                        </div>
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

                {/* Studio Gallery Section */}
                {studio.space_photos_urls && studio.space_photos_urls.length > 0 && (
                    <div className="glass-card p-8 rounded-[32px] bg-white border-border-grey shadow-cloud">
                        <h2 className="text-2xl font-serif font-bold text-burgundy mb-8 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-gold" />
                            </div>
                            The Studio
                        </h2>
                        <PublicInstructorGallery images={studio.space_photos_urls} />
                    </div>
                )}


                {/* Reviews Section */}
                <div id="reviews" className="glass-card p-8 rounded-[32px] bg-white border-border-grey shadow-cloud scroll-mt-24">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-serif font-bold text-burgundy flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                <Star className="w-5 h-5 text-gold" />
                            </div>
                            Member Reviews
                        </h2>
                        <div className="bg-white/40 px-4 py-2 rounded-2xl border border-white/60">
                            <StarRating rating={averageRating} count={totalCount} size="sm" />
                        </div>
                    </div>
                    <ReviewList reviews={reviews} />
                </div>
            </div>
        </div >
    )
}

