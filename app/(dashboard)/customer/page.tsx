import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiscoveryFilters from '@/components/customer/DiscoveryFilters'
import { MapPin, Award, User, Clock, Filter, Calendar } from 'lucide-react'
import Image from 'next/image'
import SlotCard from '@/components/dashboard/SlotCard'
import { Slot } from '@/types'
import BookSessionButton from '@/components/customer/BookSessionButton'
import AvatarWithFallback from '@/components/customer/AvatarWithFallback'
import StarRating from '@/components/reviews/StarRating'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'
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
    lat?: string;
    lng?: string;
    radius?: string;
}

export default async function CustomerDashboard({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const params = await searchParams
    const headersList = await headers()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

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

    // Fetch profile + studios + locations in parallel
    const [{ data: profile, error: profileError }, { data: allStudiosForLocations }, { data: rawStudios }] = await Promise.all([
        supabase.from('profiles').select('role, date_of_birth, contact_number').eq('id', user.id).maybeSingle(),
        supabase.from('studios').select('location').eq('verified', true),
        studioQuery
    ])

    if (profileError) {
        console.error('[CustomerDashboard] Profile fetch error:', profileError)
    }

    if (!profile?.date_of_birth || !profile?.contact_number) {
        console.log(`[CustomerDashboard] Incomplete profile for ${user.email}. Redirecting to onboarding.`)
        redirect('/customer/onboarding')
    }

    const availableLocations: string[] = [
        ...new Set((allStudiosForLocations || []).map((s: any) => s.location).filter(Boolean))
    ]

    // Filter out suspended or negative balance studios
    let studios = rawStudios?.filter((s: any) => {
        const owner = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return !owner?.is_suspended && (owner?.available_balance || 0) >= 0;
    }) || []

    // 1.1 Distance Filter for Studios
    if (params.lat && params.lng && params.radius && params.radius !== 'all') {
        const { calculateDistance } = await import('@/lib/utils/location')
        const userLat = parseFloat(params.lat)
        const userLng = parseFloat(params.lng)
        const radius = parseFloat(params.radius)

        studios = studios.filter(s => {
            if (!s.lat || !s.lng) return false;
            const dist = calculateDistance(userLat, userLng, Number(s.lat), Number(s.lng))
            return dist <= radius
        })
    }

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

    // Fetch aggregated ratings + instructors in parallel
    // reviewer_ratings is a DB view (GROUP BY reviewee_id) — no more loading 2000 raw rows
    const [{ data: ratingsRows }, { data: instructorsRaw }] = await Promise.all([
        supabase.from('reviewer_ratings').select('reviewee_id, average, count'),
        instructorQuery,
    ])

    const ratingsMap: Record<string, { total: number, count: number, average: number }> = {}
    ratingsRows?.forEach((r: any) => {
        ratingsMap[r.reviewee_id] = {
            average: Number(r.average),
            count: Number(r.count),
            total: Number(r.average) * Number(r.count),
        }
    })

    // Filter Instructors by certification and Distance
    const { calculateDistance } = await import('@/lib/utils/location')
    const userLat = params.lat ? parseFloat(params.lat) : null
    const userLng = params.lng ? parseFloat(params.lng) : null
    const radius = params.radius && params.radius !== 'all' ? parseFloat(params.radius) : null

    const instructors = instructorsRaw?.filter(inst => {
        // 1. Certification Filter
        if (params.certification && params.certification !== 'all') {
            const filterTokens = params.certification.split(',').map(c => c.trim().toLowerCase())
            const hasCert = inst.certifications?.some((c: any) =>
                c.verified &&
                filterTokens.some(token => c.certification_body?.trim().toLowerCase().startsWith(token))
            )
            if (!hasCert) return false
        }

        // 2. Distance Filter (Home Sessions)
        if (userLat !== null && userLng !== null && radius !== null) {
            // An instructor matches IF:
            // 1. They offer home sessions
            // 2. They have a home base set
            // 3. The distance is within THEIR max_travel_km
            // 4. The distance is within the USER'S preferred radius
            
            if (!inst.offers_home_sessions || !inst.home_base_lat || !inst.home_base_lng) return false

            const dist = calculateDistance(userLat, userLng, Number(inst.home_base_lat), Number(inst.home_base_lng))
            
            const withinUserRadius = dist <= radius
            const withinInstructorLimit = dist <= (inst.max_travel_km || 10)

            return withinUserRadius && withinInstructorLimit
        }

        return true
    }) || []

    return (
        <div className="relative min-h-screen pb-20 sm:pb-32 space-y-12 sm:space-y-20 overflow-hidden bg-[#faf9f6]">
            {/* Page-wide extremely subtle texture/grain */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply" 
                style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }} 
            />

            <div className="relative z-10 max-w-[1400px] mx-auto pt-6 sm:pt-12 px-4 sm:px-10 space-y-12 sm:space-y-20">

                {/* ─── Filters Row ─── */}
                <div className="relative z-20">
                    <DiscoveryFilters 
                        availableLocations={availableLocations} 
                        userRole={profile?.role} 
                    />
                </div>

                {/* ─── Sections ─── */}
                <div className="flex flex-col gap-y-32">

                    {/* ══════════════════════════════════════
                        INSTRUCTORS SECTION
                    ══════════════════════════════════════ */}
                    {(profile?.role !== 'instructor') && (!params.type || params.type === 'instructor') && (
                        <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-8 mb-8 sm:mb-16 border-b border-burgundy/5 pb-6 sm:pb-10">
                                <div className="space-y-2 sm:space-y-3">
                                    <div className="flex items-center gap-3 sm:gap-5">
                                        <h2 className="text-2xl sm:text-5xl font-serif font-bold text-burgundy tracking-tight">Verified Instructors</h2>
                                        <div className="px-3 sm:px-4 py-1.5 rounded-full bg-forest text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.25em] shadow-lg shadow-forest/20">
                                            {instructors.length} Available
                                        </div>
                                    </div>
                                    <p className="text-burgundy/40 text-sm sm:text-lg font-medium max-w-2xl">World-class talent, personally vetted for quality and expertise.</p>
                                </div>
                            </div>

                            {instructors.length === 0 ? (
                                <div className="earth-card py-24 text-center flex flex-col items-center justify-center gap-y-6 border-dashed border-2 border-burgundy/10 bg-off-white/30">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-walking-vinnie/20 rounded-full flex items-center justify-center shadow-inner ring-1 ring-walking-vinnie/30">
                                            <User className="w-10 h-10 text-burgundy/20" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-burgundy/5">
                                            <Filter className="w-3.5 h-3.5 text-burgundy/40" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-serif font-bold text-burgundy tracking-tight">No instructors found</h3>
                                        <p className="text-muted-burgundy/70 max-w-sm mx-auto text-sm font-medium leading-relaxed">We couldn't find any instructors matching your current filters. Try broadening your search or clearing all filters.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {instructors.map(inst => {
                                        const hasVerifiedCert = inst.certifications?.some((c: any) => c.verified)
                                        return (
                                            <div key={inst.id} className="marketplace-card earth-card group bg-white rounded-[2.5rem] border border-burgundy/5 overflow-hidden transition-all duration-700 hover:shadow-[0_40px_100px_rgba(81,50,41,0.12)] hover:-translate-y-2 flex flex-col h-full relative">
                                                {/* ── Banner: gradient lifestyle area ── */}
                                                <div className="relative h-32 sm:h-44 bg-[#F5F2EB]">
                                                    {/* Premium mesh gradient background */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-walking-vinnie/20 via-buttermilk/10 to-transparent opacity-60" />
                                                    <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-48 sm:w-64 h-48 sm:h-64 bg-forest/5 rounded-full blur-[60px] sm:blur-[80px]" />
                                                    <div className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-48 sm:w-64 h-48 sm:h-64 bg-burgundy/5 rounded-full blur-[60px] sm:blur-[80px]" />
                                                    
                                                    <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-gradient-to-t from-white to-transparent" />
                                                    
                                                    {/* Verified badge — top right */}
                                                    {hasVerifiedCert && (
                                                        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-white/90 backdrop-blur-md text-burgundy px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 z-10 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] border border-burgundy/5 shadow-xl transition-all duration-500 group-hover:bg-forest group-hover:text-white group-hover:border-forest/20">
                                                            <Award className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                                            Verified Master
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ── Circular instructor avatar overlapping bottom edge ── */}
                                                {/* MOVED OUTSIDE OF overflow-hidden TO PREVENT CLIPPING */}
                                                <div className="absolute top-20 sm:top-28 left-6 sm:left-8 z-30 transition-transform duration-700 group-hover:scale-105">
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] sm:border-4 border-white shadow-2xl overflow-hidden bg-white ring-1 ring-burgundy/5">
                                                        <AvatarWithFallback
                                                            src={inst.avatar_url}
                                                            alt={inst.full_name}
                                                        />
                                                    </div>
                                                </div>

                                                {/* ── Card Body ── */}
                                                <div className="p-6 sm:p-10 pt-12 sm:pt-16 flex flex-col gap-y-6 sm:gap-y-8 flex-1 relative">
                                                    {/* Name + handle */}
                                                    <div className="space-y-1 sm:space-y-2">
                                                        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-burgundy tracking-tight leading-tight group-hover:text-forest transition-colors duration-500">{inst.full_name}</h3>
                                                        {inst.instagram_handle && (
                                                            <p className="text-[9px] sm:text-[10px] font-black text-burgundy/20 uppercase tracking-[0.2em] sm:tracking-[0.3em] group-hover:text-forest/30 transition-colors duration-500">
                                                                @{inst.instagram_handle}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Rating and Badges container */}
                                                    <div className="flex flex-col gap-6">
                                                        {/* Star rating */}
                                                        <div className="flex items-center gap-4">
                                                            <div className="px-3 py-1.5 rounded-xl bg-[#F5F2EB] border border-burgundy/5 flex items-center gap-2 shadow-sm">
                                                                <StarRating
                                                                    rating={ratingsMap[inst.id]?.average || null}
                                                                    count={ratingsMap[inst.id]?.count}
                                                                    size="xs"
                                                                />
                                                                {ratingsMap[inst.id]?.count > 0 && (
                                                                    <span className="text-[10px] text-burgundy/30 font-black uppercase tracking-widest border-l border-burgundy/10 pl-2">
                                                                        {ratingsMap[inst.id].count} Reviews
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Certification badges */}
                                                        {(inst.certifications || []).filter((c: any) => c.verified).length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {(inst.certifications || []).filter((c: any) => c.verified).slice(0, 3).map((c: any) => (
                                                                    <span
                                                                        key={c.id}
                                                                        className="text-[9px] font-black uppercase tracking-[0.2em] bg-walking-vinnie/10 text-burgundy/40 px-3.5 py-1.5 rounded-xl border border-walking-vinnie/20 transition-all duration-500 group-hover:bg-forest/5 group-hover:text-forest/50 group-hover:border-forest/10"
                                                                    >
                                                                        {c.certification_body}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-y-4 mt-auto pt-8 border-t border-burgundy/5">
                                                        <Link
                                                            href={`/instructors/${inst.id}`}
                                                            className="flex items-center justify-center w-full py-4.5 rounded-[1.25rem] bg-[#F5F2EB]/50 text-burgundy text-[11px] font-black uppercase tracking-[0.3em] border border-burgundy/5 hover:bg-white hover:border-burgundy/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-500"
                                                        >
                                                            View Full Profile
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
                        <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-8 mb-8 sm:mb-16 border-b border-burgundy/5 pb-6 sm:pb-10">
                                <div className="space-y-2 sm:space-y-3">
                                    <div className="flex items-center gap-3 sm:gap-5">
                                        <h2 className="text-2xl sm:text-5xl font-serif font-bold text-burgundy tracking-tight">Partner Studios</h2>
                                        <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-buttermilk/20 border border-buttermilk/40 text-[9px] sm:text-[10px] font-black text-burgundy/50 uppercase tracking-[0.2em] sm:tracking-[0.25em] shadow-sm">
                                            {studios?.length || 0} Registered
                                        </div>
                                    </div>
                                    <p className="text-burgundy/40 text-sm sm:text-lg font-medium max-w-2xl">Top-tier facilities curated for your practice and excellence.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                                {studios?.map(studio => (
                                    <div key={studio.id} className="marketplace-card earth-card group bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-burgundy/5 overflow-hidden transition-all duration-700 hover:shadow-[0_40px_100px_rgba(81,50,41,0.12)] hover:-translate-y-2 flex flex-col h-full ring-1 ring-burgundy/[0.02]">
                                        {/* ── Banner Image ── */}
                                        <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F2EB]">
                                            {studio.logo_url ? (
                                                <Image
                                                    src={studio.logo_url}
                                                    alt={studio.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover group-hover:scale-110 transition-transform duration-[3000ms] ease-out will-change-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white to-walking-vinnie/20">
                                                    <span className="text-burgundy/10 font-serif italic text-7xl sm:text-8xl select-none group-hover:scale-110 transition-transform duration-1000">
                                                        {studio.name.slice(0, 1)}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-burgundy/5 group-hover:bg-transparent transition-colors duration-1000" />

                                            {/* Location overlay — top left */}
                                            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
                                                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-xl border border-white/50 transition-all duration-500 group-hover:bg-forest group-hover:text-white group-hover:border-forest/20">
                                                    <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-forest shrink-0 group-hover:text-white" />
                                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em]">{studio.location}</span>
                                                </div>
                                            </div>

                                            {/* Studio small logo overlay — bottom left circular */}
                                            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 z-10 hidden sm:block transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[4px] sm:border-[6px] border-white shadow-2xl overflow-hidden bg-white ring-1 ring-burgundy/5">
                                                    <AvatarWithFallback
                                                        src={studio.logo_url}
                                                        alt={studio.name}
                                                        initials={studio.name.slice(0, 1)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Card Body ── */}
                                        <div className="p-6 sm:p-10 flex flex-col flex-1 gap-y-6 sm:gap-y-8">

                                            {/* Studio name + rating */}
                                            <div className="flex items-start justify-between gap-4 sm:gap-6">
                                                <div className="space-y-1 sm:space-y-2">
                                                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-burgundy tracking-tight leading-tight group-hover:text-forest transition-colors duration-500">{studio.name}</h3>
                                                    <p className="text-[9px] sm:text-[10px] font-black text-burgundy/20 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Partner Studio</p>
                                                </div>
                                                <div className="shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-[#F5F2EB] border border-burgundy/5 flex flex-col items-center gap-0.5 sm:gap-1 shadow-sm transition-all duration-500 group-hover:bg-white group-hover:border-burgundy/10">
                                                    <StarRating
                                                        rating={ratingsMap[studio.owner_id]?.average || null}
                                                        count={ratingsMap[studio.owner_id]?.count}
                                                        size="xs"
                                                    />
                                                    {(!ratingsMap[studio.owner_id]?.count || ratingsMap[studio.owner_id].count === 0) && (
                                                        <span className="text-[8px] font-black text-burgundy/25 uppercase tracking-[0.1em]">Vault Choice</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-[13px] sm:text-[14px] text-burgundy/40 leading-relaxed line-clamp-2 italic font-medium transition-colors duration-500 group-hover:text-burgundy/60">
                                                {studio.description || 'A premiere pilates studio dedicated to your well-being and excellence.'}
                                            </p>

                                            {/* Features/Equipment */}
                                            {(studio.reformers_count || 0) > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="flex items-center gap-2.5 sm:gap-3 bg-walking-vinnie/5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-walking-vinnie/10 group-hover:border-forest/20 group-hover:bg-forest/5 transition-all duration-500">
                                                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-forest animate-pulse" />
                                                        <span className="text-[9px] sm:text-[10px] font-black text-burgundy/40 uppercase tracking-[0.15em] sm:tracking-[0.2em] group-hover:text-forest/70">
                                                            {studio.reformers_count} Reformers
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Book Now Button — Full width at bottom */}
                                            <div className="pt-6 sm:pt-8 mt-auto border-t border-burgundy/5">
                                                <Link
                                                    href={`/studios/${studio.id}`}
                                                    className="flex items-center justify-center w-full py-4 sm:py-5 rounded-[1.25rem] sm:rounded-[1.5rem] bg-[#F5F2EB]/50 text-burgundy text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] border border-burgundy/5 hover:bg-forest hover:text-white hover:border-forest/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-500"
                                                >
                                                    Book Studio
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
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-serif font-bold text-burgundy tracking-tight">Available Sessions</h2>
                                        <div className="px-2 py-0.5 rounded-md bg-walking-vinnie/20 border border-walking-vinnie/30 text-[10px] font-black text-burgundy/60 uppercase tracking-widest">
                                            {slots.length} Ready
                                        </div>
                                    </div>
                                    <p className="text-muted-burgundy/60 text-sm font-medium">Instant booking for your preferred time slots.</p>
                                </div>
                            </div>

                            {slots.length === 0 ? (
                                <div className="earth-card py-24 text-center flex flex-col items-center justify-center gap-y-6 border-dashed border-2 border-burgundy/10 bg-off-white/30">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-buttermilk/20 rounded-full flex items-center justify-center shadow-inner ring-1 ring-buttermilk/40">
                                            <Clock className="w-10 h-10 text-burgundy/20" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border border-burgundy/5">
                                            <Calendar className="w-3.5 h-3.5 text-burgundy/40" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-serif font-bold text-burgundy tracking-tight">No sessions available</h3>
                                        <p className="text-muted-burgundy/70 max-w-sm mx-auto text-sm font-medium leading-relaxed">There are no sessions available for the selected period. Please try a different date or time range.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            </div>
        </div>
    )
}
