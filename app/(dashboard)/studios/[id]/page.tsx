import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MapPin, Clock, Users, Star, ShowerHead, Droplets, Car, Wifi, Square, Lock, Shirt, CheckCircle2 } from 'lucide-react'
import BookingSection from '@/components/customer/BookingSection'
import StarRating from '@/components/reviews/StarRating'
import ReviewList from '@/components/reviews/ReviewList'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import NextImage from 'next/image'

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
        .select('*')
        .eq('id', id)
        .single()

    if (!studio) notFound()

    // 2. Fetch Available Slots
    const { data: slots } = await supabase
        .from('slots')
        .select('*')
        .eq('studio_id', id)
        .eq('is_available', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

    // 3. Fetch Verified Instructors for Dropdown
    const { data: instructorsRaw } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            rates,
            certifications!inner (
                verified
            )
        `)
        .eq('role', 'instructor')

    const instructors = instructorsRaw?.filter(i =>
        i.certifications && i.certifications.some((c: any) => c.verified)
    ) || []

    // 4. Fetch public reviews for the studio owner's profile
    const { reviews, averageRating, totalCount } = await getPublicReviews(studio.owner_id)

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8 mb-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Studio Logo */}
                        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-cream-50 flex-shrink-0 border border-cream-200 flex items-center justify-center">
                            {studio.logo_url ? (
                                <NextImage
                                    src={studio.logo_url}
                                    alt={studio.name}
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-charcoal-200 font-serif italic text-4xl">
                                    {studio.name.slice(0, 1)}
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-serif text-charcoal-900 mb-2">{studio.name}</h1>
                            <div className="flex items-center gap-4 text-charcoal-600 mb-3">
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {studio.location}
                                </span>
                            </div>

                            {studio.equipment && studio.equipment.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {studio.equipment.map((eq: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-cream-100/50 text-charcoal-700 text-xs rounded-full border border-cream-200">
                                            <span className="font-semibold text-charcoal-900">{studio.inventory?.[eq] || (eq === 'Reformer' ? studio.reformers_count : 1)}x</span> {eq}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {studio.address && (
                                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                                    <p className="text-sm text-charcoal-500">{studio.address}</p>
                                    {studio.google_maps_url && (
                                        <a href={studio.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-100 w-fit">
                                            <MapPin className="w-3.5 h-3.5" />
                                            Open in Google Maps
                                        </a>
                                    )}
                                </div>
                            )}
                            <a href="#reviews" className="inline-block hover:opacity-80 transition-opacity">
                                <StarRating rating={averageRating} count={totalCount} size="md" />
                            </a>
                        </div>
                    </div>

                    {studio.bio && (
                        <div className="mt-6 text-charcoal-600 border-t border-cream-100 pt-6 italic">
                            "{studio.bio}"
                        </div>
                    )}
                    {studio.description && (
                        <p className={studio.bio ? "mt-4 text-charcoal-600" : "mt-6 text-charcoal-600 border-t border-cream-100 pt-6"}>
                            {studio.description}
                        </p>
                    )}

                    {studio.amenities && studio.amenities.length > 0 && (
                        <div className="mt-8 border-t border-cream-100 pt-8">
                            <h3 className="text-sm font-semibold text-charcoal-900 mb-4 uppercase tracking-wider">Features & Amenities</h3>
                            <div className="flex flex-wrap gap-3">
                                {studio.amenities.map((amenity: string, i: number) => {
                                    let Icon = CheckCircle2;
                                    if (amenity === 'Shower') Icon = ShowerHead;
                                    if (amenity === 'Water Dispenser') Icon = Droplets;
                                    if (amenity === 'Parking') Icon = Car;
                                    if (amenity === 'Wi-Fi') Icon = Wifi;
                                    if (amenity === 'Towels') Icon = Square;
                                    if (amenity === 'Lockers') Icon = Lock;
                                    if (amenity === 'Changing Room') Icon = Shirt;

                                    return (
                                        <div key={i} className="flex items-center gap-2 text-sm text-charcoal-700 bg-cream-50 px-3 py-2 rounded-lg border border-cream-200">
                                            <Icon className="w-4 h-4 text-charcoal-500" />
                                            <span className="font-medium">{amenity}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {studio.space_photos && studio.space_photos.length > 0 && (
                        <div className="mt-8 border-t border-cream-100 pt-8">
                            <h3 className="text-sm font-semibold text-charcoal-900 mb-4 uppercase tracking-wider">Studio Photos</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {studio.space_photos.map((photoUrl: string, index: number) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-cream-100 border border-cream-200 group">
                                        <NextImage
                                            src={photoUrl}
                                            alt={`${studio.name} photo ${index + 1}`}
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Booking Section */}
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-8 mb-8">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-charcoal-500" />
                        Available Slots
                    </h2>
                    {(() => {
                        const now = new Date().toISOString().split('T')[0];
                        const expired = (studio.mayors_permit_expiry && studio.mayors_permit_expiry < now)
                            || (studio.bir_certificate_expiry && studio.bir_certificate_expiry < now);
                        if (expired || studio.verified === false) {
                            return (
                                <div className="py-8 text-center bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-red-700 font-medium text-sm">This studio is temporarily unavailable for bookings.</p>
                                    <p className="text-red-600 text-xs mt-1">One or more required documents have expired. The studio owner has been notified.</p>
                                </div>
                            );
                        }
                        return (
                            <BookingSection
                                studioId={studio.id}
                                slots={slots || []}
                                instructors={instructors}
                                studioHourlyRate={studio.hourly_rate || 0}
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

