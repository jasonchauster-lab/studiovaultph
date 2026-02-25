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

    // 1. Fetch Studios
    let studioQuery = supabase
        .from('studios')
        .select('*')
        .eq('verified', true)

    if (params.location && params.location !== 'all') {
        studioQuery = studioQuery.eq('location', params.location)
    }

    if (params.equipment && params.equipment !== 'all') {
        // Studios must have this equipment
        studioQuery = studioQuery.contains('equipment', [params.equipment])
    }

    if (params.amenity && params.amenity !== 'all') {
        // Studios must have this amenity
        studioQuery = studioQuery.contains('amenities', [params.amenity])
    }

    const { data: studios } = await studioQuery

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
            availQuery = availQuery.eq('location_area', params.location)
        }

        if (params.date) {
            // JavaScript getDay(): 0 = Sunday, 1 = Monday...
            // Use local date to avoid timezone offset issues if possible, but params.date is typically YYYY-MM-DD
            const dayOfWeek = new Date(params.date).getDay()
            availQuery = availQuery.eq('day_of_week', dayOfWeek)

            // Optional: If the table supports specific dates ('date' column), we could also check:
            // .or(`date.eq.${params.date},date.is.null`) 
            // But relying on day_of_week seems to be the primary model for now.
        }

        if (params.time) {
            // Find windows that cover this start time
            // start_time <= time AND end_time > time
            availQuery = availQuery.lte('start_time', params.time).gt('end_time', params.time)
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
        if (params.type === 'slot') {
            let slotQuery = supabase
                .from('slots')
                .select(`
                    *,
                    studios!inner(*)
                `)
                .eq('is_available', true)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })

            if (params.location && params.location !== 'all') {
                slotQuery = slotQuery.eq('studios.location', params.location)
            }

            if (params.equipment && params.equipment !== 'all') {
                // Slots/Studios must have this equipment
                // slots have 'equipment' array
                slotQuery = slotQuery.contains('equipment', [params.equipment])
            }

            if (params.date) {
                // Filter by date range (start of day to end of day)
                const startOfDay = new Date(params.date)
                const endOfDay = new Date(params.date)
                endOfDay.setHours(23, 59, 59, 999)
                slotQuery = slotQuery.gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString())
            }

            if (params.time) {
                // Simple filter: slots starting after this time? 
                // Or slots containing this time? 
                // "Show me 10 AM slots" usually means slots starting around 10 AM.
                // Let's filter for start_time >= params.date + params.time
                // If only time is provided, assume today/future dates matching valid time?
                // Matching repeated time across days is hard in SQL ISO strings.
                // Let's rely on date + time combination for precise lookups, or just Client side filter if needed.
                // For MVP: if Date AND Time provided, combine them.
                if (params.date) {
                    const specificStart = new Date(`${params.date}T${params.time}`)
                    slotQuery = slotQuery.gte('start_time', specificStart.toISOString())
                }
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
        // If filter applied, check certs
        if (params.certification) {
            return inst.certifications?.some((c: any) =>
                c.certification_body === params.certification && c.verified
            )
        }
        return true
    }) || []

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header & Filters */}
                <div>
                    <h1 className="text-4xl font-serif text-charcoal-900 mb-4">Find your flow.</h1>
                    <p className="text-charcoal-600 mb-8 text-lg">Discover top studios and verified instructors in Metro Manila.</p>

                    <DiscoveryFilters />
                </div>

                {/* Vertical Sections */}
                <div className="space-y-16">

                    {/* Instructors Section */}
                    {(!params.type || params.type === 'instructor') && (
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-2xl font-serif text-charcoal-900">Verified Instructors</h2>
                                <span className="bg-charcoal-900 text-cream-50 text-xs px-2 py-1 rounded-full">
                                    {instructors.length}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {instructors.map(inst => (
                                    <div key={inst.id} className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <Link href={`/instructors/${inst.id}`} className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-cream-100 flex items-center justify-center border border-cream-200 hover:opacity-80 transition-opacity">
                                                    {inst.avatar_url ? (
                                                        <Image
                                                            src={inst.avatar_url}
                                                            alt={inst.full_name}
                                                            width={48}
                                                            height={48}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <User className="w-6 h-6 text-charcoal-400" />
                                                    )}
                                                </Link>
                                                <div>
                                                    <h3 className="font-medium text-charcoal-900">{inst.full_name}</h3>
                                                    {inst.instagram_handle && (
                                                        <p className="text-xs text-charcoal-500 mb-1">@{inst.instagram_handle}</p>
                                                    )}
                                                    <StarRating rating={ratingsMap[inst.id]?.average || null} count={ratingsMap[inst.id]?.count} size="sm" />
                                                </div>
                                            </div>
                                            {inst.certifications?.some((c: any) => c.verified) && (
                                                <div className="text-green-600">
                                                    <Award className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <div className="flex flex-wrap gap-2">
                                                {inst.certifications?.filter((c: any) => c.verified).map((c: any) => (
                                                    <span key={c.id} className="text-[10px] uppercase tracking-wider bg-cream-100 text-charcoal-600 px-2 py-1 rounded-md">
                                                        {c.certification_body}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <Link href={`/instructors/${inst.id}`} className="block w-full text-center py-2 mt-4 rounded-lg border border-charcoal-200 text-charcoal-900 hover:bg-charcoal-50 transition-colors">
                                            View Profile
                                        </Link>

                                        {/* Book Button (Only if filters active) */}
                                        {
                                            params.date && params.time && params.location && params.location !== 'all' && params.equipment && params.equipment !== 'all' && (
                                                <div className="mt-2">
                                                    <BookSessionButton
                                                        instructorId={inst.id}
                                                        date={params.date}
                                                        time={params.time}
                                                        location={params.location} // Validated as string above
                                                        equipment={params.equipment}
                                                    />
                                                </div>
                                            )
                                        }
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Studios Section */}
                    {(!params.type || params.type === 'studio') && (
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-2xl font-serif text-charcoal-900">Partner Studios</h2>
                                <span className="bg-charcoal-900 text-cream-50 text-xs px-2 py-1 rounded-full">
                                    {studios?.length || 0}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {studios?.map(studio => (
                                    <div key={studio.id} className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                                        <Link href={`/studios/${studio.id}`} className="block h-40 bg-charcoal-50 relative items-center justify-center overflow-hidden border-b border-cream-100 cursor-pointer">
                                            {studio.logo_url ? (
                                                <Image
                                                    src={studio.logo_url}
                                                    alt={studio.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <span className="text-charcoal-300 font-serif italic text-4xl group-hover:scale-110 transition-transform duration-500 flex h-full items-center justify-center">
                                                    {studio.name.slice(0, 1)}
                                                </span>
                                            )}
                                        </Link>
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-serif text-xl text-charcoal-900 mb-1">{studio.name}</h3>
                                                    <StarRating rating={ratingsMap[studio.owner_id]?.average || null} count={ratingsMap[studio.owner_id]?.count} size="sm" />
                                                </div>
                                                <span className="flex items-center gap-1 text-xs font-medium bg-cream-100 px-2 py-1 rounded-full text-charcoal-700 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {studio.location}
                                                </span>
                                            </div>
                                            <p className="text-sm text-charcoal-500 mb-6 line-clamp-2">
                                                {studio.description || 'A premiere pilates studio.'}
                                            </p>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-charcoal-600">
                                                    <strong>{studio.reformers_count}</strong> Reformers
                                                </span>
                                                <Link
                                                    href={`/studios/${studio.id}`}
                                                    className="font-medium text-charcoal-900 hover:underline decoration-1 underline-offset-4"
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
                    {params.type === 'slot' && (
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-2xl font-serif text-charcoal-900">Available Sessions</h2>
                                <span className="bg-charcoal-900 text-cream-50 text-xs px-2 py-1 rounded-full">
                                    {slots.length}
                                </span>
                            </div>

                            {slots.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border border-cream-200">
                                    <Clock className="w-12 h-12 text-charcoal-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-charcoal-900">No slots found</h3>
                                    <p className="text-charcoal-500">Try adjusting your filters or checking a different date.</p>
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
        </div >
    )
}
