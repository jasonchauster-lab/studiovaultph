import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DiscoveryFilters from '@/components/customer/DiscoveryFilters'
import { MapPin, Award, User, Clock } from 'lucide-react'
import Image from 'next/image'
import SlotCard from '@/components/dashboard/SlotCard'
import { Slot } from '@/types'
import BookSessionButton from '@/components/customer/BookSessionButton'
import StarRating from '@/components/reviews/StarRating'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Lazily expire any abandoned bookings to release their slots
    const { expireAbandonedBookings } = await import('@/lib/wallet')
    await expireAbandonedBookings().catch(() => { }) // Non-blocking

    // 1. Fetch Studios + all distinct verified locations (for smart filter)
    let studioQuery = supabase
        .from('studios')
        .select('*, profiles!owner_id(available_balance, is_suspended)')
        .eq('verified', true)

    if (params.location && params.location !== 'all') {
        if (params.location.includes(' - ')) {
            studioQuery = studioQuery.eq('location', params.location)
        } else {
            // Broad city prefix: match 'BGC - *' etc.
            // 'QC' is the DB prefix for Quezon City
            studioQuery = studioQuery.like('location', params.location + ' - %')
        }
    }

    if (params.equipment && params.equipment !== 'all') {
        // Studios must have this equipment
        studioQuery = studioQuery.contains('equipment', [params.equipment])
    }

    if (params.amenity && params.amenity !== 'all') {
        // Studios must have this amenity
        studioQuery = studioQuery.contains('amenities', [params.amenity])
    }

    // Fetch all verified studio locations for the smart location filter (no other filters applied)
    const { data: allStudiosForLocations } = await supabase
        .from('studios')
        .select('location')
        .eq('verified', true)

    const availableLocations: string[] = [
        ...new Set((allStudiosForLocations || []).map((s: any) => s.location).filter(Boolean))
    ]

    const { data: rawStudios } = await studioQuery

    // Filter out suspended or negative balance studios
    const studios = rawStudios?.filter((s: any) => {
        const owner = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        return !owner?.is_suspended && (owner?.available_balance || 0) >= 0;
    }) || []

    // 2. Fetch Instructors (with certifications)
    // Note: This is a simplified join. 
    // Ideally we filter profiles where role = 'instructor'.
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
        // Instructors must teach this equipment
        instructorQuery = instructorQuery.contains('teaching_equipment', [params.equipment])
    }

    // 3. Availability & Location Filter (Instructors)
    if (params.date || params.time || (params.location && params.location !== 'all')) {
        let availQuery = supabase.from('instructor_availability').select('instructor_id')

        // Filter by Location if set
        if (params.location && params.location !== 'all') {
            const trimmedLocation = params.location.trim();
            // Match exactly or as a prefix (e.g., "BGC" matches "BGC - Studio")
            availQuery = availQuery.or(`location_area.eq."${trimmedLocation}",location_area.like."${trimmedLocation} - %"`)
        }

        if (params.date) {
            // Use local PHT date to avoid day-shift issues
            const dayOfWeek = new Date(params.date + "T00:00:00+08:00").getDay()
            // Match specific date OR recurring day_of_week (if date is null)
            availQuery = availQuery.or(`date.eq.${params.date},and(day_of_week.eq.${dayOfWeek},date.is.null)`)
        }

        if (params.time) {
            // Find windows that cover this start time
            // Normalize time to HH:mm:ss for consistent string comparison
            const timeStr = params.time.length === 5 ? params.time + ':00' : params.time;
            availQuery = availQuery.lte('start_time', timeStr).gt('end_time', timeStr)
        }

        const { data: availableIds, error: availError } = await availQuery

        if (availError) {
            console.error('Availability Query Error:', availError)
        }

        if (availableIds && availableIds.length > 0) {
            const ids = availableIds.map((a: any) => a.instructor_id)
            // Filter the main instructor query to only these IDs
            instructorQuery = instructorQuery.in('id', ids)
        } else {
            // No instructors found for this time/location
            // Force empty result
            instructorQuery = instructorQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
    }

    // 4. Fetch Slots (Browse Slots Mode)
    let slots: Slot[] = []
    if (params.type === 'slot' || (!params.type && (params.date || params.time))) {
        // If explicitly searching slots OR filtering by date/time without type preference, prioritize slots view?
        // Actually adhering to explicit type is safer. Let's just do it if type === 'slot'
        // If type is not 'instructor' or 'studio', and filters are set, we show slots
        const shouldShowSlots = params.type === 'slot' || (!params.type && (params.date || params.time))

        if (shouldShowSlots) {
            const nowManilaDate = getManilaTodayStr()
            const nowManilaTime = toManilaTimeString(new Date())

            let slotQuery = supabase
                .from('slots')
                .select(`
                    *,
                    studios!inner(*)
                `)
                .eq('is_available', true)
                .eq('studios.verified', true)
                .or(`date.gt.${nowManilaDate},and(date.eq.${nowManilaDate},start_time.gte.${nowManilaTime})`)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true })

            if (params.location && params.location !== 'all') {
                const trimmedLocation = params.location.trim();
                // Relaxed ilike match on joined studio location
                slotQuery = slotQuery.ilike('studios.location', `%${trimmedLocation}%`)
            }

            if (params.equipment && params.equipment !== 'all') {
                // Check both uppercase (standardized) and original casing for equipment keys
                const eq = params.equipment.trim();
                const eqUpper = eq.toUpperCase();
                // Quote JSONB keys for PostgREST robustness (handles spaces/chars)
                slotQuery = slotQuery.or(`equipment->>"${eq}".gte.1,equipment->>"${eqUpper}".gte.1`)
            }

            if (params.date) {
                slotQuery = slotQuery.eq('date', params.date)
            }

            if (params.time) {
                // "Show me 10 AM slots" usually means slots starting around 10 AM.
                const timeStr = params.time.length === 5 ? params.time + ':00' : params.time
                slotQuery = slotQuery.gte('start_time', timeStr)
            }


            const { data } = await slotQuery
            if (data) slots = data as unknown as Slot[]
        }
    }

    // Fetch all reviews to calculate aggregated ratings
    const { data: reviews } = await supabase.from('reviews').select('reviewee_id, rating')
    const ratingsMap: Record<string, { total: number, count: number, average: number }> = {}

    reviews?.forEach(r => {
        if (!ratingsMap[r.reviewee_id]) {
            ratingsMap[r.reviewee_id] = { total: 0, count: 0, average: 0 }
        }
        ratingsMap[r.reviewee_id].total += r.rating
        ratingsMap[r.reviewee_id].count += 1
        ratingsMap[r.reviewee_id].average = ratingsMap[r.reviewee_id].total / ratingsMap[r.reviewee_id].count
    })

    // We can't easy filter pure joins in Supabase helper without strict foreign keys or views,  
    // but for now we'll fetch and filter in memory if needed or use post-filtering for MVP.
    // If 'certification' param exists, we filter accordingly.

    const { data: instructorsRaw } = await instructorQuery

    // Filter Instructors
    const instructors = instructorsRaw?.filter(inst => {
        // If filter applied, check certs with case-insensitive, trimmed startsWith
        // This ensures "STOTT Pilates" (free-text entered) matches the filter token "STOTT"
        if (params.certification && params.certification !== 'all') {
            const filterToken = params.certification.trim().toLowerCase()
            return inst.certifications?.some((c: any) =>
                c.verified &&
                c.certification_body?.trim().toLowerCase().startsWith(filterToken)
            )
        }
        return true
    }) || []

    return (
        <div className="space-y-16 pb-20">
            <div className="max-w-[1600px] mx-auto space-y-16">

                {/* Header & Filters */}
                <div className="space-y-10">
                    <div className="max-w-2xl">
                        <h1 className="text-5xl font-serif font-bold text-charcoal tracking-tight mb-4">Find your flow.</h1>
                        <p className="text-charcoal/60 text-lg font-medium leading-relaxed">Discover top studios and verified instructors in Metro Manila with ease.</p>
                    </div>

                    <DiscoveryFilters availableLocations={availableLocations} />
                </div>

                {/* Vertical Sections */}
                <div className="space-y-24">

                    {/* Instructors Section */}
                    {(!params.type || params.type === 'instructor') && (
                        <section>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Verified Instructors</h2>
                                    <span className="bg-sage/10 text-sage text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-sage/20">
                                        {instructors.length} Available
                                    </span>
                                </div>
                            </div>

                            {instructors.length === 0 ? (
                                <div className="glass-card py-20 text-center flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-sage/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <User className="w-10 h-10 text-sage/30" />
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-charcoal tracking-tight mb-2">No results for this search</h3>
                                    <p className="text-charcoal/40 max-w-sm mx-auto text-sm font-medium">Try adjusting your filters, location, or checking a different date.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    {instructors.map(inst => (
                                        <div key={inst.id} className="glass-card hover:translate-y-[-4px] transition-all duration-300 group">
                                            <div className="p-8">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-5">
                                                        <Link href={`/instructors/${inst.id}`} className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-white border border-white shadow-cloud group-hover:scale-105 transition-transform">
                                                            {inst.avatar_url ? (
                                                                <Image
                                                                    src={inst.avatar_url}
                                                                    alt={inst.full_name}
                                                                    width={64}
                                                                    height={64}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-alabaster">
                                                                    <User className="w-8 h-8 text-charcoal/20" />
                                                                </div>
                                                            )}
                                                        </Link>
                                                        <div>
                                                            <h3 className="text-lg font-bold text-charcoal tracking-tight mb-1">{inst.full_name}</h3>
                                                            <div className="flex items-center gap-3">
                                                                {inst.instagram_handle && (
                                                                    <p className="text-[10px] font-bold text-sage uppercase tracking-widest">@{inst.instagram_handle}</p>
                                                                )}
                                                                <StarRating rating={ratingsMap[inst.id]?.average || null} count={ratingsMap[inst.id]?.count} size="xs" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {inst.certifications?.some((c: any) => c.verified) && (
                                                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                                                            <Award className="w-4 h-4 text-gold" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-8 min-h-[40px]">
                                                    {(inst.certifications || []).filter((c: any) => c.verified).map((c: any) => (
                                                        <span key={c.id} className="text-[9px] font-bold uppercase tracking-widest bg-sage/5 text-sage px-3 py-1 rounded-full border border-sage/10">
                                                            {c.certification_body}
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="space-y-3">
                                                    <Link href={`/instructors/${inst.id}`} className="block w-full text-center py-4 rounded-[20px] bg-white text-charcoal text-[11px] font-bold uppercase tracking-widest border border-white/60 hover:bg-alabaster transition-all shadow-sm">
                                                        View Profile
                                                    </Link>

                                                    {/* Book Button (Only if filters active) */}
                                                    {
                                                        params.date && params.time && params.location && params.location !== 'all' && params.equipment && params.equipment !== 'all' && (
                                                            <BookSessionButton
                                                                instructorId={inst.id}
                                                                date={params.date}
                                                                time={params.time}
                                                                location={params.location}
                                                                equipment={params.equipment}
                                                            />
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Studios Section */}
                    {(!params.type || params.type === 'studio') && (
                        <section>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Partner Studios</h2>
                                    <span className="bg-gold/10 text-gold text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-gold/20">
                                        {studios?.length || 0} Registered
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {studios?.map(studio => (
                                    <div key={studio.id} className="glass-card overflow-hidden hover:translate-y-[-4px] transition-all duration-300 group">
                                        <Link href={`/studios/${studio.id}`} className="block h-52 relative overflow-hidden">
                                            {studio.logo_url ? (
                                                <Image
                                                    src={studio.logo_url}
                                                    alt={studio.name}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-sage/5">
                                                    <span className="text-charcoal/20 font-serif italic text-6xl">
                                                        {studio.name.slice(0, 1)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full text-charcoal border border-white/40 uppercase tracking-widest">
                                                    <MapPin className="w-3 h-3 text-sage" />
                                                    {studio.location}
                                                </div>
                                            </div>
                                        </Link>
                                        <div className="p-8">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">{studio.name}</h3>
                                                <StarRating rating={ratingsMap[studio.owner_id]?.average || null} count={ratingsMap[studio.owner_id]?.count} size="xs" />
                                            </div>

                                            <p className="text-sm text-charcoal/40 font-medium mb-8 line-clamp-2 leading-relaxed">
                                                {studio.description || 'A premiere pilates studio dedicated to your well-being.'}
                                            </p>

                                            <div className="flex justify-between items-center bg-alabaster/40 p-4 rounded-2xl border border-white/40">
                                                <span className="text-[10px] font-bold text-sage uppercase tracking-[0.2em]">
                                                    {studio.reformers_count} Reformers
                                                </span>
                                                <Link
                                                    href={`/studios/${studio.id}`}
                                                    className="text-[10px] font-bold text-charcoal uppercase tracking-widest hover:text-sage transition-colors"
                                                >
                                                    View Details &rarr;
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Slots Section (Browse Slots) */}
                    {(params.type === 'slot' || (!params.type && (params.date || params.time))) && (
                        <section>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Available Sessions</h2>
                                    <span className="bg-sage/10 text-sage text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-sage/20">
                                        {slots.length} Ready
                                    </span>
                                </div>
                            </div>

                            {slots.length === 0 ? (
                                <div className="glass-card py-20 text-center flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <Clock className="w-10 h-10 text-gold/30" />
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-charcoal tracking-tight mb-2">No slots available</h3>
                                    <p className="text-charcoal/40 max-w-sm mx-auto text-sm font-medium">Try adjusting your filters or checking a different date.</p>
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
            </div>
        </div >
    )
}
