import { createClient, createAdminClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { notFound } from 'next/navigation'
import { MapPin, Clock, Users, Star, ShowerHead, Droplets, Car, Wifi, Square, Lock, Shirt, CheckCircle2, Image as ImageIcon, ExternalLink, Navigation } from 'lucide-react'
import BookingSection from '@/components/customer/BookingSection'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import PublicInstructorGallery from '@/components/instructor/PublicInstructorGallery'
import NextImage from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'

import { startOfMonth, endOfMonth, format } from 'date-fns'
import { clsx } from 'clsx'

// Cache studio + instructor data for 2 minutes.
// Slots, pending bookings, and reviews stay dynamic (user-specific or time-sensitive).
const getStudioStaticData = unstable_cache(
    async (studioId: string) => {
        const admin = createAdminClient()

        const { data: studio } = await admin
            .from('studios')
            .select('*, profiles!owner_id(available_balance, is_suspended, avatar_url, full_name)')
            .eq('id', studioId)
            .single()

        if (!studio) return null

        // Use a bounding box to prune the instructor list (roughly 50km radius)
        // 0.5 degrees lat/lng is ~55km in the Philippines.
        let instructorQuery = admin
            .from('profiles')
            .select('id, full_name, rates, avatar_url, bio, instagram_handle, teaching_equipment, home_base_lat, home_base_lng, max_travel_km, offers_home_sessions')
            .eq('role', 'instructor')
            .not('rates', 'is', null)
            .is('is_suspended', false)

        if (studio.lat && studio.lng) {
            const lat = Number(studio.lat)
            const lng = Number(studio.lng)
            instructorQuery = instructorQuery
                .gte('home_base_lat', lat - 0.5)
                .lte('home_base_lat', lat + 0.5)
                .gte('home_base_lng', lng - 0.5)
                .lte('home_base_lng', lng + 0.5)
        }

        const { data: profiles } = await instructorQuery

        const allInstructorIds = (profiles || []).map((p: any) => p.id)

        if (allInstructorIds.length === 0) {
            return { studio, profiles: [], certsRaw: [], availabilityRaw: [] }
        }

        const [{ data: certsRaw }, { data: availabilityRaw }] = await Promise.all([
            admin
                .from('certifications')
                .select('instructor_id, verified, certification_body, certification_name')
                .in('instructor_id', allInstructorIds)
                .eq('verified', true),
            admin
                .from('instructor_availability')
                .select('instructor_id, day_of_week, date, start_time, end_time, location_area')
                .in('instructor_id', allInstructorIds),
        ])

        return {
            studio,
            profiles: profiles || [],
            certsRaw: certsRaw || [],
            availabilityRaw: availabilityRaw || [],
        }
    },
    ['studio-static'],
    { revalidate: 120 }
)

export default async function StudioDetailsPage(props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ month?: string }>
}) {
    try {
    const { id } = await props.params
    const searchParams = await props.searchParams
    const supabase = await createClient()

    // Fire-and-forget: expire abandoned bookings to release slots
    // Using a safer import check
    import('@/lib/wallet').then((mod) => {
        if (mod?.expireAbandonedBookings) {
            mod.expireAbandonedBookings().catch((err) => {
                console.error('[Studio] Failed to expire bookings:', err)
            })
        }
    }).catch(() => { })

    // Round 1: cached static data + user auth in parallel
    const [staticData, { data: { user } }] = await Promise.all([
        getStudioStaticData(id),
        supabase.auth.getUser(),
    ])

    if (!staticData) notFound()

    const { studio, profiles, certsRaw, availabilityRaw } = staticData

    // Compute date ranges
    const monthParam = searchParams.month || format(new Date(), 'yyyy-MM')
    const rangeStart = startOfMonth(new Date(monthParam + '-01'))
    const rangeEnd = endOfMonth(rangeStart)
    const startDateStr = format(rangeStart, 'yyyy-MM-dd')
    const endDateStr = format(rangeEnd, 'yyyy-MM-dd')
    const nowDate = getManilaTodayStr()
    const nowTime = toManilaTimeString(new Date())
    const trimmedStudioLocation = studio.location?.trim() ?? ''
    const locationTokens = trimmedStudioLocation
        .split(/[\s\-\/,]+/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 1)

    // Round 2: pending bookings + reviews
    const [{ data: pendingBookings }, { reviews, averageRating, totalCount }] = await Promise.all([
        user
            ? supabase.from('bookings').select('id, slot_id, status, booked_slot_ids').eq('client_id', user.id).eq('status', 'pending')
            : Promise.resolve({ data: [] as any[], error: null }),
        getPublicReviews(studio.owner_id, user?.id),
    ])

    const lockedSlotIds = (pendingBookings || []).flatMap((b: any) => b.booked_slot_ids || [])

    // Round 3: slots
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
        lockedSlotIds.length > 0
            ? supabase.from('slots').select('*').in('id', lockedSlotIds).order('date', { ascending: true }).order('start_time', { ascending: true })
            : Promise.resolve({ data: [] as any[], error: null }),
    ])

    const rawSlots = [...(availableSlotsRes.data || []), ...(lockedSlotsRes.data || [])]
    const slots = Array.from(new Map(rawSlots.map(s => [s.id, s])).values())
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return a.start_time.localeCompare(b.start_time)
        })

    const { calculateDistance } = await import('@/lib/utils/location')
    const studioLat = Number(studio.lat)
    const studioLng = Number(studio.lng)

    const instructors = (profiles || []).map(p => ({
        ...p,
        certifications: (certsRaw || []).filter(c => c.instructor_id === p.id),
        instructor_availability: (availabilityRaw || []).filter(a => a.instructor_id === p.id)
    })).filter(i => {
        if (i.certifications.length === 0) return false
        
        // 1. Distance-based matching (New Primary System)
        if (studioLat && studioLng && i.home_base_lat && i.home_base_lng) {
            const dist = calculateDistance(studioLat, studioLng, Number(i.home_base_lat), Number(i.home_base_lng))
            return dist <= (i.max_travel_km || 10)
        }

        // 2. Fallback to location-area tags
        const instrLocations = i.instructor_availability.map((a: any) => (a.location_area ?? '').trim().toLowerCase())
        return instrLocations.some(loc =>
            loc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some((token: string) => loc.includes(token.toLowerCase()) || loc.startsWith(token.toLowerCase()))
        )
    })

    const matchedInstructorIds = instructors.map(i => i.id)
    const locationAvailability = (availabilityRaw || []).filter((block: any) => {
        if (!matchedInstructorIds.includes(block.instructor_id)) return false
        const bLoc = (block.location_area ?? '').trim().toLowerCase()
        return bLoc === trimmedStudioLocation.toLowerCase() ||
            locationTokens.some((token: string) => bLoc.includes(token.toLowerCase()) || bLoc.startsWith(token.toLowerCase()))
    })

    return (
        <div className="min-h-screen bg-[#faf9f6] pb-20">
            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply" 
                style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }} 
            />
            {/* Banner Section */}
            {studio.banner_url && (
                <div className="relative w-full h-[200px] sm:h-[400px] bg-cream-100 overflow-hidden">
                    <NextImage
                        src={getSupabaseAssetUrl(studio.banner_url, 'avatars') || '/default-banner.svg'}
                        alt={`${studio.name} Banner`}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
            )}

            <div className={clsx("max-w-5xl mx-auto space-y-12 p-4 sm:p-8", studio.banner_url && "-mt-16 sm:-mt-24 relative z-10")}>
                {/* Studio Header */}
                <div className="atelier-card p-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-40 h-40 bg-white rounded-[32px] flex items-center justify-center overflow-hidden border-4 border-white shadow-2xl shrink-0 group hover:scale-105 transition-transform duration-700">
                        {studio.logo_url ? (
                            <div className="relative w-full h-full">
                                <NextImage
                                    src={getSupabaseAssetUrl(studio.logo_url, 'avatars') || '/default-studio.svg'}
                                    alt={studio.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (() => {
                            const ownerRecord = Array.isArray(studio.profiles) ? studio.profiles[0] : studio.profiles;
                            const avatar = ownerRecord?.avatar_url;
                            if (avatar) {
                                const fullUrl = getSupabaseAssetUrl(avatar, 'avatars') || '/default-studio.svg';
                                return (
                                    <div className="relative w-full h-full">
                                        <NextImage
                                            src={fullUrl}
                                            alt={studio.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                );
                            }
                            return <Users className="w-12 h-12 text-burgundy/10" />;
                        })()}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-burgundy tracking-tight">{studio.name}</h1>
                            {studio.verified && (
                                <div className="px-4 py-1.5 rounded-full bg-forest text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-forest/20 flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Verified
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-sm font-medium">
                            <div className="flex items-center gap-2 bg-burgundy/5 px-4 py-1.5 rounded-full border border-burgundy/5">
                                <MapPin className="w-4 h-4 text-forest shrink-0" />
                                <span className="font-bold text-burgundy-900 tracking-tight">
                                    {studio.floor_or_unit ? `${studio.floor_or_unit}, ` : ''}
                                    {studio.address || studio.location}
                                </span>
                            </div>
                            <a
                                href={studio.google_maps_url || `https://maps.google.com/?q=${encodeURIComponent((studio.floor_or_unit ? studio.floor_or_unit + ', ' : '') + (studio.address || studio.location) + ', Philippines')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-bold text-sage hover:text-sage/80 border border-sage/50 hover:border-sage/80 px-4 py-1.5 rounded-full transition-all duration-200 bg-sage/10 hover:bg-sage/20 shadow-sm active:scale-95"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Directions</span>
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
                <div className="atelier-card p-10">
                    <h2 className="text-3xl font-serif font-bold text-burgundy mb-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shadow-lg shadow-forest/20">
                            <Clock className="w-6 h-6" />
                        </div>
                        Available Sessions
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
                    <div className="atelier-card p-10">
                        <h2 className="text-3xl font-serif font-bold text-burgundy mb-10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-burgundy text-white flex items-center justify-center shadow-lg shadow-burgundy/20">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            The Studio Space
                        </h2>
                        <PublicInstructorGallery images={studio.space_photos_urls} />
                    </div>
                )}

                {/* Reviews Section */}
                <div id="reviews" className="atelier-card p-10 scroll-mt-32">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                        <h2 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                                <Star className="w-6 h-6" />
                            </div>
                            Member Experience
                        </h2>
                        <div className="bg-white px-6 py-3 rounded-2xl border border-burgundy/5 shadow-sm">
                            <StarRating rating={averageRating} count={totalCount} size="sm" />
                        </div>
                    </div>
                    <ReviewList reviews={reviews} />
                </div>
            </div>
        </div >
    )
    } catch (e: any) {
        console.error('[StudioDetailsPage] CRASH:', e?.message, e?.stack)
        throw e
    }
}

