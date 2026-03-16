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

    // Fetch profile + studios + locations in parallel (saves 1 sequential round trip)
    const [{ data: profile }, { data: allStudiosForLocations }, { data: rawStudios }] = await Promise.all([
        supabase.from('profiles').select('date_of_birth, contact_number').eq('id', user.id).single(),
        supabase.from('studios').select('location').eq('verified', true),
        studioQuery
    ])

    if (!profile?.date_of_birth || !profile?.contact_number) {
        redirect('/customer/onboarding')
    }

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
        <div className="relative min-h-screen pb-24 space-y-16 overflow-hidden">
            {/* Page-wide subtle texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23513229' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
            />

            <div className="relative z-10 max-w-[1600px] mx-auto pt-10 px-4 sm:px-8 space-y-16">

                {/* ─── Filters Row ─── */}
                <div className="relative z-20">
                    <DiscoveryFilters availableLocations={availableLocations} />
                </div>

                {/* ─── Sections ─── */}
                <div className="flex flex-col gap-y-32">

                    {/* ══════════════════════════════════════
                        INSTRUCTORS SECTION
                    ══════════════════════════════════════ */}
                    {(!params.type || params.type === 'instructor') && (
                        <section>
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 border-b border-burgundy/5 pb-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-4xl font-serif font-bold text-burgundy tracking-tight">Verified Instructors</h2>
                                        <div className="px-3 py-1 rounded-full bg-walking-vinnie/10 border border-walking-vinnie/20 text-[10px] font-black text-burgundy uppercase tracking-[0.2em] shadow-sm">
                                            {instructors.length} Available
                                        </div>
                                    </div>
                                    <p className="text-muted-burgundy/60 text-base font-medium">World-class talent, personally vetted for quality and expertise.</p>
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
                                            <div key={inst.id} className="marketplace-card earth-card overflow-hidden hover:translate-y-[-8px] transition-all duration-700 group border-burgundy/5 bg-white flex flex-col shadow-[0_10px_40px_rgba(81,50,41,0.03)] hover:shadow-[0_30px_70px_rgba(81,50,41,0.12)]">
                                                {/* ── Banner: gradient lifestyle area ── */}
                                                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-off-white via-walking-vinnie/10 to-buttermilk/20">
                                                    {/* decorative pattern */}
                                                    <div
                                                        className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-700"
                                                        style={{ 
                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm76-52c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-3-11c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM86 82c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-49 11c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM25 17c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM9 43c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm44 46c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM100 4c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM78 68c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM25 95c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM18 30c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm64 56c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm33-60c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM58 85c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm14-42c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm32 20c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-66 10c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-9-53c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm20 30c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm-10 68c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM9 62c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm44-53c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zM27 80c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1zm10-55c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z' fill='%23513229' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` 
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                                                    
                                                    {/* Verified badge — top right */}
                                                    {hasVerifiedCert && (
                                                        <div className="absolute top-5 right-5 bg-forest/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full flex items-center gap-2 z-10 text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-lg">
                                                            <Award className="w-3.5 h-3.5" />
                                                            Verified Master
                                                        </div>
                                                    )}
                                                    {/* ── Circular instructor avatar overlapping bottom edge ── */}
                                                    <div className="absolute bottom-0 left-8 translate-y-1/2 z-20 transition-transform duration-700 group-hover:scale-105">
                                                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white ring-1 ring-burgundy/5">
                                                            <AvatarWithFallback
                                                                src={inst.avatar_url}
                                                                alt={inst.full_name}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── Card Body — padded with room for overlapping avatar ── */}
                                                <div className="p-8 pt-16 flex flex-col gap-y-6 flex-1 relative">
                                                    {/* Name + handle */}
                                                    <div className="space-y-1.5">
                                                        <h3 className="text-2xl font-serif font-bold text-burgundy tracking-tight leading-tight group-hover:text-forest transition-colors duration-300">{inst.full_name}</h3>
                                                        {inst.instagram_handle && (
                                                            <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-[0.25em]">
                                                                @{inst.instagram_handle}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Star rating */}
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 rounded-lg bg-off-white border border-burgundy/5">
                                                            <StarRating
                                                                rating={ratingsMap[inst.id]?.average || null}
                                                                count={ratingsMap[inst.id]?.count}
                                                                size="xs"
                                                            />
                                                        </div>
                                                        {ratingsMap[inst.id]?.count > 0 && (
                                                            <span className="text-[10px] text-burgundy/40 font-black uppercase tracking-widest mt-0.5">({ratingsMap[inst.id].count})</span>
                                                        )}
                                                    </div>

                                                    {/* Certification badges — Walking Vinnie palette */}
                                                    {(inst.certifications || []).filter((c: any) => c.verified).length > 0 && (
                                                        <div className="flex flex-wrap gap-2.5">
                                                            {(inst.certifications || []).filter((c: any) => c.verified).slice(0, 3).map((c: any) => (
                                                                <span
                                                                    key={c.id}
                                                                    className="text-[9px] font-black uppercase tracking-[0.18em] bg-walking-vinnie/10 text-burgundy/70 px-3 py-1.5 rounded-lg border border-walking-vinnie/20 transition-colors group-hover:bg-walking-vinnie/20"
                                                                >
                                                                    {c.certification_body}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-y-4 mt-auto pt-6 border-t border-burgundy/5">
                                                        <Link
                                                            href={`/instructors/${inst.id}`}
                                                            className="flex items-center justify-center w-full py-4 rounded-2xl bg-off-white text-burgundy text-[11px] font-black uppercase tracking-[0.25em] border border-burgundy/10 hover:bg-white hover:border-burgundy/30 hover:shadow-md transition-all duration-500"
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
                        <section>
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 border-b border-burgundy/5 pb-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-4xl font-serif font-bold text-burgundy tracking-tight">Partner Studios</h2>
                                        <div className="px-3 py-1 rounded-full bg-buttermilk/20 border border-buttermilk/40 text-[10px] font-black text-burgundy/50 uppercase tracking-[0.2em] shadow-sm">
                                            {studios?.length || 0} Registered
                                        </div>
                                    </div>
                                    <p className="text-muted-burgundy/60 text-base font-medium">Top-tier facilities curated for your practice and excellence.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {studios?.map(studio => (
                                    <div key={studio.id} className="marketplace-card earth-card overflow-hidden hover:translate-y-[-8px] transition-all duration-700 group flex flex-col border-burgundy/5 bg-white shadow-[0_10px_40px_rgba(81,50,41,0.03)] hover:shadow-[0_30px_70px_rgba(81,50,41,0.12)]">
                                        {/* ── Banner Image — aspect-[16/9] — object-cover ── */}
                                        <div className="relative aspect-[16/10] overflow-hidden bg-off-white">
                                            {studio.logo_url ? (
                                                <Image
                                                    src={studio.logo_url}
                                                    alt={studio.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-[2000ms] ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-off-white to-walking-vinnie/20">
                                                    <span className="text-burgundy/10 font-serif italic text-7xl select-none group-hover:scale-110 transition-transform duration-1000">
                                                        {studio.name.slice(0, 1)}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-burgundy/5 group-hover:bg-transparent transition-colors duration-700" />

                                            {/* Location overlay — top left */}
                                            <div className="absolute top-5 left-5 z-10 transition-all duration-500 group-hover:translate-x-1">
                                                <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-white/50">
                                                    <MapPin className="w-3.5 h-3.5 text-forest shrink-0" />
                                                    <span className="text-[10px] font-black text-burgundy uppercase tracking-widest">{studio.location}</span>
                                                </div>
                                            </div>

                                            {/* Studio small logo overlay — bottom left circular */}
                                            <div className="absolute bottom-5 left-5 z-10 hidden sm:block transition-all duration-700 group-hover:scale-110 group-hover:rotate-3">
                                                <div className="w-14 h-14 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white ring-1 ring-burgundy/5">
                                                    <AvatarWithFallback
                                                        src={studio.logo_url}
                                                        alt={studio.name}
                                                        initials={studio.name.slice(0, 1)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Card Body ── */}
                                        <div className="p-8 flex flex-col flex-1 gap-y-6">

                                            {/* Studio name + rating */}
                                            <div className="flex items-start justify-between gap-4">
                                                <h3 className="text-2xl font-serif font-bold text-burgundy tracking-tight leading-tight group-hover:text-forest transition-colors duration-300">{studio.name}</h3>
                                                <div className="shrink-0 p-2 rounded-xl bg-off-white border border-burgundy/5 flex flex-col items-center gap-0.5">
                                                    <StarRating
                                                        rating={ratingsMap[studio.owner_id]?.average || null}
                                                        count={ratingsMap[studio.owner_id]?.count}
                                                        size="xs"
                                                    />
                                                    {(!ratingsMap[studio.owner_id]?.count || ratingsMap[studio.owner_id].count === 0) && (
                                                        <span className="text-[8px] font-black text-burgundy/30 uppercase tracking-tighter">Vault Choice</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-muted-burgundy leading-relaxed line-clamp-2 italic font-medium opacity-80">
                                                {studio.description || 'A premiere pilates studio dedicated to your well-being.'}
                                            </p>

                                            {/* Features/Equipment */}
                                            {(studio.reformers_count || 0) > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                                                    <div className="flex items-center gap-2.5 bg-walking-vinnie/5 px-4 py-2 rounded-xl border border-walking-vinnie/10 group-hover:border-walking-vinnie/30 transition-colors">
                                                        <div className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                                                        <span className="text-[10px] font-black text-burgundy/60 uppercase tracking-[0.2em]">
                                                            {studio.reformers_count} Professional Reformers
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Book Now Button — Full width at bottom */}
                                            <div className="pt-4 mt-auto">
                                                <Link
                                                    href={`/studios/${studio.id}`}
                                                    className="flex items-center justify-center w-full py-4.5 rounded-2xl bg-forest text-white text-[11px] font-black uppercase tracking-[0.3em] hover:bg-burgundy hover:scale-[1.03] transition-all duration-500 shadow-[0_15px_30px_rgba(40,63,55,0.2)] hover:shadow-[0_20px_40px_rgba(81,50,41,0.3)] group-hover:bg-forest group-hover:hover:bg-burgundy"
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
