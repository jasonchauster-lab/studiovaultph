import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiscoveryFilters from '@/components/customer/DiscoveryFilters'
import { MapPin, Award, User, Clock } from 'lucide-react'
import Image from 'next/image'
import SlotCard from '@/components/dashboard/SlotCard'
import { Slot } from '@/types'
import BookSessionButton from '@/components/customer/BookSessionButton'
import AvatarWithFallback from '@/components/customer/AvatarWithFallback'
import StarRating from '@/components/reviews/StarRating'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'
import ReferralCard from '@/components/customer/ReferralCard'
import { headers } from 'next/headers'

interface SearchParams {
    q?: string;
    type?: 'instructor' | 'studio' | 'slot';
    location?: string;
    certification?: string;
    date?: string;
    time?: string;
    equipment?: string;
    amenity?: string;
}

export default async function CustomerDashboard({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const params = await searchParams
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const proto = headersList.get('x-forwarded-proto') ?? 'http'
    const origin = `${proto}://${host}`

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth, contact_number, referral_code')
        .eq('id', user.id)
        .single()

    if (!profile?.date_of_birth || !profile?.contact_number) {
        redirect('/customer/onboarding')
    }

    // Fire-and-forget: expire abandoned bookings to release slots.
    import('@/lib/wallet').then(({ expireAbandonedBookings }) =>
        expireAbandonedBookings().catch(() => {})
    )

    // 1. Fetch Studios + all distinct verified locations (for smart filter)
    let studioQuery = supabase
        .from('studios')
        .select('*, profiles!owner_id(available_balance, is_suspended)')
        .eq('verified', true)

    if (params.location && params.location !== 'all') {
        if (params.location.includes(' - ')) {
            studioQuery = studioQuery.eq('location', params.location)
        } else {
            studioQuery = studioQuery.like('location', params.location + ' - %')
        }
    }

    if (params.equipment && params.equipment !== 'all') {
        const equipmentList = params.equipment.split(',')
        studioQuery = studioQuery.overlaps('equipment', equipmentList)
    }

    if (params.amenity && params.amenity !== 'all') {
        const amenityList = params.amenity.split(',')
        studioQuery = studioQuery.overlaps('amenities', amenityList)
    }

    // Fetch studios + all verified locations in parallel
    const [{ data: allStudiosForLocations }, { data: rawStudios }] = await Promise.all([
        supabase.from('studios').select('location').eq('verified', true),
        studioQuery
    ])

    const availableLocations: string[] = [
        ...new Set((allStudiosForLocations || []).map((s: any) => s.location).filter(Boolean))
    ]

    // Filter out suspended or negative balance studios
    const studios = rawStudios?.filter((s: any) => {
        const owner = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return !owner?.is_suspended && (owner?.available_balance || 0) >= 0;
    }) || []

    // 2. Fetch Instructors (with certifications)
    let instructorQuery = supabase
        .from('profiles')
        .select(`
            *,
            certifications (
                id,
                certification_body,
                verified
            )
        `)
        .eq('role', 'instructor')
        .eq('is_suspended', false)

    if (params.equipment && params.equipment !== 'all') {
        const equipmentList = params.equipment.split(',')
        instructorQuery = instructorQuery.overlaps('teaching_equipment', equipmentList)
    }

    // 3. Availability & Location Filter (Instructors)
    if (params.date || params.time || (params.location && params.location !== 'all')) {
        let availQuery = supabase.from('instructor_availability').select('instructor_id')

        if (params.location && params.location !== 'all') {
            const trimmedLocation = params.location.trim();
            availQuery = availQuery.or(`location_area.eq."${trimmedLocation}",location_area.like."${trimmedLocation} - %"`)
        }

        if (params.date) {
            const dayOfWeek = new Date(params.date + "T00:00:00+08:00").getDay()
            availQuery = availQuery.or(`date.eq.${params.date},and(day_of_week.eq.${dayOfWeek},date.is.null)`)
        }

        if (params.time) {
            const timeStr = params.time.length === 5 ? params.time + ':00' : params.time;
            availQuery = availQuery.lte('start_time', timeStr).gt('end_time', timeStr)
        }

        const { data: availableIds, error: availError } = await availQuery

        if (availError) {
            console.error('Availability Query Error:', availError)
        }

        if (availableIds && availableIds.length > 0) {
            const ids = availableIds.map((a: any) => a.instructor_id)
            instructorQuery = instructorQuery.in('id', ids)
        } else {
            instructorQuery = instructorQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
    }

    // 4. Fetch Slots
    let slots: Slot[] = []
    const shouldShowSlots = params.type === 'slot'

    if (shouldShowSlots) {
        const nowManilaDate = getManilaTodayStr()
        const nowManilaTime = toManilaTimeString(new Date())

        let slotQuery = supabase
            .from('slots')
            .select(`*, studios!inner(*)`)
            .eq('is_available', true)
            .eq('studios.verified', true)
            .or(`date.gt.${nowManilaDate},and(date.eq.${nowManilaDate},start_time.gte.${nowManilaTime})`)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true })

        if (params.location && params.location !== 'all') {
            const trimmedLocation = params.location.trim();
            slotQuery = slotQuery.ilike('studios.location', `%${trimmedLocation}%`)
        }

        if (params.equipment && params.equipment !== 'all') {
            const equipmentList = params.equipment.split(',')
            const conditions = equipmentList.flatMap(eq => {
                const eqTrimmed = eq.trim()
                const eqUpper = eqTrimmed.toUpperCase()
                return [`equipment->>"${eqTrimmed}".gte.1`, `equipment->>"${eqUpper}".gte.1`]
            })
            slotQuery = slotQuery.or(conditions.join(','))
        }

        if (params.date) {
            slotQuery = slotQuery.eq('date', params.date)
        }

        if (params.time) {
            const timeStr = params.time.length === 5 ? params.time + ':00' : params.time
            slotQuery = slotQuery.gte('start_time', timeStr)
        }

        const { data } = await slotQuery
        if (data) slots = data as unknown as Slot[]
    }

    // Fetch reviews for aggregated ratings (capped to prevent loading the entire table)
    const { data: reviews } = await supabase.from('reviews').select('reviewee_id, rating').limit(2000)
    const ratingsMap: Record<string, { total: number, count: number, average: number }> = {}

    reviews?.forEach(r => {
        if (!ratingsMap[r.reviewee_id]) {
            ratingsMap[r.reviewee_id] = { total: 0, count: 0, average: 0 }
        }
        ratingsMap[r.reviewee_id].total += r.rating
        ratingsMap[r.reviewee_id].count += 1
        ratingsMap[r.reviewee_id].average = ratingsMap[r.reviewee_id].total / ratingsMap[r.reviewee_id].count
    })

    const { data: instructorsRaw } = await instructorQuery

    // Filter Instructors by certification
    const instructors = instructorsRaw?.filter(inst => {
        if (params.certification && params.certification !== 'all') {
            const filterTokens = params.certification.split(',').map(c => c.trim().toLowerCase())
            return inst.certifications?.some((c: any) =>
                c.verified &&
                filterTokens.some(token => c.certification_body?.trim().toLowerCase().startsWith(token))
            )
        }
        return true
    }) || []

    return (
        <div className="space-y-16 pb-24">
            <div className="max-w-[1600px] mx-auto space-y-16">

                {/* ─── Page Header & Filters ─── */}
                <div className="flex flex-col gap-y-8">
                    <div className="max-w-2xl flex flex-col gap-y-3">
                        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-burgundy tracking-tight leading-tight">
                            Find your flow.
                        </h1>
                        <p className="text-muted-burgundy text-lg leading-relaxed">
                            Discover top studios and verified instructors in Metro Manila with ease.
                        </p>
                    </div>

                    <DiscoveryFilters availableLocations={availableLocations} />
                </div>

                {/* ─── Sections ─── */}
                <div className="flex flex-col gap-y-24">

                    {/* ══════════════════════════════════════
                        INSTRUCTORS SECTION
                    ══════════════════════════════════════ */}
                    {(!params.type || params.type === 'instructor') && (
                        <section>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-serif font-bold text-burgundy tracking-tight">Verified Instructors</h2>
                                    <span className="badge-verified">
                                        {instructors.length} Available
                                    </span>
                                </div>
                            </div>

                            {instructors.length === 0 ? (
                                <div className="earth-card py-20 text-center flex flex-col items-center justify-center gap-y-4">
                                    <div className="w-20 h-20 bg-walking-vinnie/40 rounded-full flex items-center justify-center shadow-tight">
                                        <User className="w-10 h-10 text-burgundy/30" />
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-burgundy tracking-tight">No results for this search</h3>
                                    <p className="text-muted-burgundy max-w-sm mx-auto text-sm leading-relaxed">Try adjusting your filters, location, or checking a different date.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {instructors.map(inst => {
                                        const hasVerifiedCert = inst.certifications?.some((c: any) => c.verified)
                                        return (
                                            <div key={inst.id} className="marketplace-card earth-card overflow-hidden hover:translate-y-[-4px] transition-all duration-300 group">

                                                {/* ── Banner: gradient lifestyle area ── */}
                                                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-off-white via-buttermilk/40 to-walking-vinnie/30">
                                                    {/* decorative pattern */}
                                                    <div
                                                        className="absolute inset-0 opacity-20"
                                                        style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(81,50,41,0.25) 0%, transparent 55%), radial-gradient(circle at 80% 20%, rgba(215,212,177,0.6) 0%, transparent 50%)' }}
                                                        aria-hidden="true"
                                                    />

                                                    {/* Verified badge — top right */}
                                                    {hasVerifiedCert && (
                                                        <div className="absolute top-3 right-3 badge-verified flex items-center gap-1 z-10">
                                                            <Award className="w-3 h-3" />
                                                            Certified
                                                        </div>
                                                    )}

                                                    {/* ── Circular instructor avatar overlapping bottom edge ── */}
                                                    <div className="instructor-trust-avatar">
                                                        <AvatarWithFallback
                                                            src={inst.avatar_url}
                                                            alt={inst.full_name}
                                                        />
                                                    </div>
                                                </div>

                                                {/* ── Card Body — padded with room for overlapping avatar ── */}
                                                <div className="p-6 pt-10 flex flex-col gap-y-4">

                                                    {/* Name + handle */}
                                                    <div>
                                                        <h3 className="text-lg font-bold text-burgundy tracking-tight leading-tight">{inst.full_name}</h3>
                                                        {inst.instagram_handle && (
                                                            <p className="text-[10px] font-bold text-muted-burgundy uppercase tracking-widest mt-0.5">
                                                                @{inst.instagram_handle}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Star rating */}
                                                    <StarRating
                                                        rating={ratingsMap[inst.id]?.average || null}
                                                        count={ratingsMap[inst.id]?.count}
                                                        size="xs"
                                                    />

                                                    {/* Certification badges — Walking Vinnie palette */}
                                                    {(inst.certifications || []).filter((c: any) => c.verified).length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(inst.certifications || []).filter((c: any) => c.verified).map((c: any) => (
                                                                <span
                                                                    key={c.id}
                                                                    className="text-[9px] font-bold uppercase tracking-widest bg-walking-vinnie/50 text-burgundy px-2.5 py-1 rounded-full border border-walking-vinnie"
                                                                >
                                                                    {c.certification_body}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-y-2.5 mt-auto pt-2">
                                                        <Link
                                                            href={`/instructors/${inst.id}`}
                                                            className="block w-full text-center py-3 rounded-lg bg-white text-burgundy text-[11px] font-bold uppercase tracking-wider border-2 border-burgundy/20 hover:border-burgundy/50 hover:bg-off-white transition-all"
                                                        >
                                                            View Profile
                                                        </Link>

                                                        {/* Book Session — only when all required filters are active */}
                                                        {params.date && params.time && params.location && params.location !== 'all' && params.equipment && params.equipment !== 'all' && (
                                                            <BookSessionButton
                                                                instructorId={inst.id}
                                                                date={params.date}
                                                                time={params.time}
                                                                location={params.location}
                                                                equipment={params.equipment}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ══════════════════════════════════════
                        STUDIOS SECTION — Marketplace Cards
                    ══════════════════════════════════════ */}
                    {(!params.type || params.type === 'studio') && (
                        <section>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-serif font-bold text-burgundy tracking-tight">Partner Studios</h2>
                                    <span className="status-pill-earth status-pill-yellow">
                                        {studios?.length || 0} Registered
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {studios?.map(studio => (
                                    <div key={studio.id} className="marketplace-card earth-card overflow-hidden hover:translate-y-[-4px] transition-all duration-300 group">

                                        {/* ── Banner Image — aspect-video, object-cover ── */}
                                        <div className="relative aspect-video overflow-hidden bg-off-white">
                                            {studio.logo_url ? (
                                                <Image
                                                    src={studio.logo_url}
                                                    alt={studio.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white to-walking-vinnie/40">
                                                    <span className="text-burgundy/15 font-serif italic" style={{ fontSize: '5rem' }}>
                                                        {studio.name.slice(0, 1)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Location badge — top left */}
                                            <div className="absolute top-3 left-3 z-10">
                                                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-tight border border-white/60">
                                                    <MapPin className="w-3 h-3 text-burgundy shrink-0" />
                                                    <span className="text-[10px] font-bold text-burgundy truncate max-w-[140px]">{studio.location}</span>
                                                </div>
                                            </div>

                                            {/* ── Studio logo overlapping bottom edge of banner ── */}
                                            <div className="instructor-trust-avatar">
                                                <AvatarWithFallback
                                                    src={studio.logo_url}
                                                    alt={studio.name}
                                                    initials={studio.name.slice(0, 1)}
                                                />
                                            </div>
                                        </div>

                                        {/* ── Card Body ── */}
                                        <div className="p-6 pt-10 flex flex-col gap-y-3">

                                            {/* Studio name + rating */}
                                            <div className="flex items-start justify-between gap-3">
                                                <h3 className="text-xl font-serif font-bold text-burgundy tracking-tight leading-tight">{studio.name}</h3>
                                                <StarRating
                                                    rating={ratingsMap[studio.owner_id]?.average || null}
                                                    count={ratingsMap[studio.owner_id]?.count}
                                                    size="xs"
                                                />
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-muted-burgundy leading-relaxed line-clamp-2">
                                                {studio.description || 'A premiere pilates studio dedicated to your well-being.'}
                                            </p>

                                            {/* Equipment count + Book Now CTA */}
                                            <div className="flex items-center justify-between pt-3 mt-auto">
                                                <div className="flex items-center gap-1.5 bg-buttermilk/60 px-3 py-1.5 rounded-full border border-buttermilk">
                                                    <span className="text-[11px] font-bold text-burgundy uppercase tracking-wide">
                                                        {studio.reformers_count} Reformers
                                                    </span>
                                                </div>
                                                <Link
                                                    href={`/studios/${studio.id}`}
                                                    className="btn-book-now"
                                                >
                                                    Book Now
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ══════════════════════════════════════
                        SLOTS SECTION
                    ══════════════════════════════════════ */}
                    {params.type === 'slot' && (
                        <section>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-serif font-bold text-burgundy tracking-tight">Available Sessions</h2>
                                    <span className="badge-verified">
                                        {slots.length} Ready
                                    </span>
                                </div>
                            </div>

                            {slots.length === 0 ? (
                                <div className="earth-card py-20 text-center flex flex-col items-center justify-center gap-y-4">
                                    <div className="w-20 h-20 bg-buttermilk/60 rounded-full flex items-center justify-center shadow-tight">
                                        <Clock className="w-10 h-10 text-burgundy/25" />
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-burgundy tracking-tight">No slots available</h3>
                                    <p className="text-muted-burgundy max-w-sm mx-auto text-sm leading-relaxed">Try adjusting your filters or checking a different date.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {slots.map(slot => (
                                        <div key={slot.id} className="h-full">
                                            <SlotCard slot={slot} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                </div>

                {/* ══════════════════════════════════════
                    REFERRAL CARD
                ══════════════════════════════════════ */}
                {profile?.referral_code && (
                    <div className="mt-10">
                        <ReferralCard referralCode={profile.referral_code} origin={origin} />
                    </div>
                )}

            </div>
        </div>
    )
}
