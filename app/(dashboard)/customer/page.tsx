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

    // 1. Fetch main datasets in parallel
    const [{ data: profile }, { data: allLocationsRaw }] = await Promise.all([
        supabase.from('profiles').select('role, date_of_birth, contact_number').eq('id', user.id).maybeSingle(),
        supabase.from('studios').select('location').eq('verified', true)
    ])

    if (!profile?.date_of_birth || !profile?.contact_number) {
        redirect('/customer/onboarding')
    }

    const availableLocations: string[] = [...new Set((allLocationsRaw || []).map((s: any) => s.location).filter(Boolean))]

    // 1.1 Define Distance Parameters
    const userLat = params.lat ? parseFloat(params.lat) : null
    const userLng = params.lng ? parseFloat(params.lng) : null
    const radiusKm = params.radius && params.radius !== 'all' ? parseFloat(params.radius) : null
    const radiusMeters = radiusKm ? radiusKm * 1000 : null

    // 1.2 Fetch Studios (PostGIS optimization)
    let rawStudiosData: any[];
    if (userLat !== null && userLng !== null && radiusMeters !== null) {
        const { data } = await supabase.rpc('get_studios_nearby_v2', {
            user_lat: userLat,
            user_lng: userLng,
            radius_meters: radiusMeters
        })
        rawStudiosData = data || []
    } else {
        const { data } = await supabase
            .from('studios')
            .select('*, profiles!owner_id!inner(available_balance, is_suspended)')
            .eq('verified', true)
            .eq('profiles.is_suspended', false)
            .gte('profiles.available_balance', 0)
        rawStudiosData = data || []
    }

    let studios = rawStudiosData.filter(s => {
        // A. Location Tags (Fallback)
        if (params.location && params.location !== 'all') {
            const matchesTag = params.location.includes(' - ') 
                ? s.location === params.location 
                : s.location?.startsWith(params.location + ' - ')
            if (!matchesTag) return false
        }

        // B. Equipment/Amenities
        if (params.equipment && params.equipment !== 'all') {
             const equipmentList = params.equipment.split(',')
             if (!s.equipment?.some((e: string) => equipmentList.includes(e))) return false
        }
        if (params.amenity && params.amenity !== 'all') {
             const amenityList = params.amenity.split(',')
             if (!s.amenities?.some((a: string) => amenityList.includes(a))) return false
        }
        return true
    })

    // 2. Fetch Instructors (PostGIS optimization)
    let fetchedInstructors: any[];
    if (userLat !== null && userLng !== null && radiusMeters !== null) {
        const { data } = await supabase.rpc('get_instructors_nearby_v1', {
            user_lat: userLat,
            user_lng: userLng,
            radius_meters: radiusMeters
        })
        fetchedInstructors = data || []
    } else {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'instructor')
            .is('is_suspended', false)
        
        fetchedInstructors = data || []
    }

    // 2.1 Process instructor filters (Availability & Certs)
    let filteredInstructors = fetchedInstructors;

    if (params.certification && params.certification !== 'all') {
        // Fetch certs for these instructors since the RPC might not include them joined
        const instructorIds = filteredInstructors.map(i => i.id)
        if (instructorIds.length > 0) {
            const { data: certs } = await supabase
                .from('certifications')
                .select('*')
                .in('instructor_id', instructorIds)
                .eq('verified', true)
            
            const filterTokens = params.certification.split(',').map(c => c.trim().toLowerCase())
            filteredInstructors = filteredInstructors.filter(inst => {
                const instCerts = certs?.filter(c => c.instructor_id === inst.id) || []
                return instCerts.some(c => 
                    filterTokens.some(token => c.certification_body?.trim().toLowerCase().startsWith(token))
                )
            })
        }
    }

    if (params.equipment && params.equipment !== 'all') {
        const equipmentList = params.equipment.split(',')
        filteredInstructors = filteredInstructors.filter(inst => 
            inst.teaching_equipment?.some((e: string) => equipmentList.includes(e))
        )
    }

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

        const { data: availableIds } = await availQuery
        if (availableIds) {
            const ids = availableIds.map((a: any) => a.instructor_id)
            filteredInstructors = filteredInstructors.filter(inst => ids.includes(inst.id))
        } else {
            filteredInstructors = []
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

    // 3. Fetch aggregated ratings + ratings rows in parallel
    const [{ data: ratingsRows }] = await Promise.all([
        supabase.from('reviewer_ratings').select('reviewee_id, average, count'),
    ])

    const ratingsMap: Record<string, { total: number, count: number, average: number }> = {}
    ratingsRows?.forEach((r: any) => {
        ratingsMap[r.reviewee_id] = {
            average: Number(r.average),
            count: Number(r.count),
            total: Number(r.average) * Number(r.count),
        }
    })

    // To ensure the UI has certifications, join them back if they aren't there
    const instructorsWithCerts = await Promise.all(filteredInstructors.map(async (inst) => {
        if (inst.certifications) return inst;
        const { data: certs } = await supabase
            .from('certifications')
            .select('*')
            .eq('instructor_id', inst.id)
            .eq('verified', true);
        return { ...inst, certifications: certs || [] };
    }));

    const instructors = instructorsWithCerts;

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
                                <div className="atelier-card py-24 text-center flex flex-col items-center justify-center gap-y-6 border-dashed border-2 border-burgundy/10 bg-off-white/30">
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
                                            <div key={inst.id} className="atelier-card group flex flex-col h-full relative overflow-hidden">
                                                {/* ── Banner: gradient lifestyle area ── */}
                                                <div className="relative h-32 sm:h-44 bg-[#F5F2EB] overflow-hidden">
                                                    {(inst.banner_url || inst.avatar_url) ? (
                                                        <Image
                                                            src={inst.banner_url || inst.avatar_url}
                                                            alt={inst.full_name}
                                                            fill
                                                            className="object-cover group-hover:scale-110 transition-transform duration-[3000ms] ease-out will-change-transform opacity-40"
                                                        />
                                                    ) : (
                                                        <>
                                                            <div className="absolute inset-0 bg-gradient-to-br from-walking-vinnie/20 via-buttermilk/10 to-transparent opacity-60" />
                                                            <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 w-48 sm:w-64 h-48 sm:h-64 bg-forest/5 rounded-full blur-[60px] sm:blur-[80px]" />
                                                            <div className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-48 sm:w-64 h-48 sm:h-64 bg-burgundy/5 rounded-full blur-[60px] sm:blur-[80px]" />
                                                        </>
                                                    )}
                                                    
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
                                                            isOnline={inst.is_online}
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
                                    <div key={studio.id} className="atelier-card group flex flex-col h-full ring-1 ring-burgundy/[0.02] overflow-hidden">
                                        {/* ── Banner Image ── */}
                                        <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F2EB]">
                                            {(studio.banner_url || studio.logo_url) ? (
                                                <Image
                                                    src={studio.banner_url || studio.logo_url}
                                                    alt={studio.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover group-hover:scale-110 transition-transform duration-[3000ms] ease-out will-change-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-50 to-walking-vinnie/20">
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
                                <div className="atelier-card py-24 text-center flex flex-col items-center justify-center gap-y-6 border-dashed border-2 border-burgundy/10 bg-off-white/30">
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
