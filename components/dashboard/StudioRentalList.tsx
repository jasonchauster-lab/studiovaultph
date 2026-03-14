'use client'

import { useState } from 'react'
import { CalendarX2, PlusCircle, MapPin, Box, X, AlertCircle, Clock, Star, Award, Instagram } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import CancelBookingModal from './CancelBookingModal'
import { cancelBookingByStudio } from '@/app/(dashboard)/studio/actions'
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'
import { getInstructorProfile } from '@/app/(dashboard)/instructors/actions'

interface StudioRentalListProps {
    bookings: any[]
    currentUserId: string
}

export default function StudioRentalList({ bookings, currentUserId }: StudioRentalListProps) {
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        dateRange: { from: null, to: null }
    })
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [selectedInstructor, setSelectedInstructor] = useState<any>(null)
    const [instructorDetails, setInstructorDetails] = useState<any>(null)
    const [loadingInstructor, setLoadingInstructor] = useState(false)
    const [resetKey, setResetKey] = useState(0)

    const handleInstructorClick = async (instructor: any) => {
        if (!instructor?.id) return
        setSelectedInstructor(instructor)
        setInstructorDetails(null)
        setLoadingInstructor(true)
        try {
            const data = await getInstructorProfile(instructor.id)
            setInstructorDetails(data)
        } finally {
            setLoadingInstructor(false)
        }
    }

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }
        const result = await cancelBookingByStudio(cancellingBooking.id, reason)
        if (result.success) {
            // Revalidate happens on server, but we can update local state if needed
            // For now, let the page revalidation handle it or filter out locally
        }
        return result
    }

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v

    const getSlotDateTime = (date: string, time: string) => {
        return new Date(`${date}T${time}+08:00`)
    }

    const calculateAge = (birthday: string) => {
        if (!birthday) return null
        const birthDate = new Date(birthday)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    const now = new Date()

    // 1. Filter ALL bookings based on local state
    const baseFilteredBookings = bookings.filter((b) => {
        const slot = getFirst(b.slots)
        if (!slot) return false

        // Status Filter
        if (filters.status !== 'all') {
            if (filters.status === 'cancelled') {
                if (!['cancelled_refunded', 'cancelled_charged'].includes(b.status)) return false
            } else if (b.status !== filters.status) return false
        }

        // Date Filter
        if (filters.dateRange.from || filters.dateRange.to) {
            const slotDateTime = getSlotDateTime(slot.date, slot.start_time)
            if (filters.dateRange.from && slotDateTime < filters.dateRange.from) return false
            if (filters.dateRange.to && slotDateTime > filters.dateRange.to) return false
        }

        return true
    })

    // 2. Split filtered bookings into upcoming/past
    const upcomingBookings = baseFilteredBookings.filter(b => {
        const slot = getFirst(b.slots)
        return b.status === 'approved' && getSlotDateTime(slot.date, slot.start_time) > now
    })
    const pastBookings = baseFilteredBookings.filter(b => {
        const slot = getFirst(b.slots)
        return b.status === 'completed' ||
            b.status === 'cancelled_refunded' ||
            b.status === 'cancelled_charged' ||
            (b.status === 'approved' && getSlotDateTime(slot.date, slot.start_time) <= now)
    })

    const filteredBookings = [...upcomingBookings, ...pastBookings].sort((a, b) => {
        const slotA = getFirst(a.slots)
        const slotB = getFirst(b.slots)
        const dateA = getSlotDateTime(slotA.date, slotA.start_time).getTime()
        const dateB = getSlotDateTime(slotB.date, slotB.start_time).getTime()
        return dateB - dateA // Sort descending by date
    })

    return (
        <div className="space-y-6">
            <BookingFilter key={resetKey} onFilterChange={setFilters} />

            <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                    <div className="min-h-[200px] py-12 flex flex-col items-center justify-center text-center earth-card border-dashed bg-off-white mx-6 sm:mx-0 px-4">
                        <div className="w-12 h-12 bg-charcoal/5 rounded-full flex items-center justify-center mb-4">
                            <CalendarX2 className="w-6 h-6 text-charcoal/30" />
                        </div>
                        <h3 className="text-sm font-bold text-charcoal mb-1">No sessions found for this period.</h3>
                        <p className="text-[11px] text-charcoal/50 max-w-[240px] mb-6">Try adjusting your filters or adding a new availability slot.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                <button 
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="px-4 py-2 bg-charcoal text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-charcoal/80 transition-all shadow-sm"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                href="/studio"
                                className="px-4 py-2 bg-forest/10 text-forest text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-forest/20 transition-all border border-forest/20"
                            >
                                Add Availability Slot
                            </Link>
                        </div>
                    </div>
                ) : (
                    filteredBookings.map((booking: any) => {
                        const slot = getFirst(booking.slots)
                        const studioData = getFirst(slot?.studios)
                        const instructor = getFirst(booking.instructor)
                        const client = getFirst(booking.client)

                        const start = new Date(`${slot?.date}T${slot?.start_time}+08:00`)

                        const studioFee = booking.price_breakdown?.studio_fee ?? 0
                        const instructorFee = (booking.price_breakdown as any)?.instructor_fee ?? 0
                        const serviceFee = (booking.price_breakdown as any)?.service_fee ?? 0
                        const fullTotal = booking.total_price ?? ((studioFee + instructorFee + serviceFee) || 0)

                        return (
                            <div key={booking.id} className="earth-card p-4 sm:p-6 border border-border-grey bg-white hover:bg-off-white transition-all duration-300 shadow-tight group relative mx-4 sm:mx-0">
                                <div className="flex flex-col gap-4">
                                    {/* Row 1: Date & Time Header (Mobile) / Desktop Sidebar */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                        {/* Mobile Header: JAN 12 • 9:00 AM */}
                                        <div className="block sm:hidden w-full bg-forest/5 px-3 py-2 rounded-lg border border-forest/10">
                                            <span className="text-[10px] font-black text-forest uppercase tracking-widest leading-none">
                                                {start.toLocaleDateString(undefined, { month: 'short' })} {start.toLocaleDateString(undefined, { day: 'numeric' })}
                                                <span className="mx-2 text-forest/30">•</span>
                                                {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>

                                        {/* Desktop Date Block */}
                                        <div className="hidden sm:flex flex-col items-center justify-center bg-forest/5 rounded-lg w-16 shrink-0 py-2 border border-forest/10">
                                            <span className="text-[9px] font-black text-forest uppercase tracking-widest leading-none mb-1">
                                                {start.toLocaleDateString(undefined, { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-serif text-charcoal leading-none">
                                                {start.toLocaleDateString(undefined, { day: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Row 2 (Mobile) / Session Info (Desktop) */}
                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
                                            <div className="flex flex-col gap-2">
                                                {/* Stacked Names */}
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        {client && (
                                                            <button onClick={() => setSelectedClient(client)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0">
                                                                <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-5 h-5 rounded-full border border-border-grey shrink-0 object-cover" />
                                                                <span className="text-sm font-bold text-charcoal/90 truncate">{client.full_name}</span>
                                                            </button>
                                                        )}
                                                        <span className="hidden sm:flex items-center">
                                                            <span className={clsx(
                                                                'px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-md tracking-widest border inline-block whitespace-nowrap',
                                                                booking.status === 'completed'
                                                                    ? (booking.funds_unlocked
                                                                        ? 'border-[#b8d49a] text-[#2D4F1E] bg-[#D4E4BC]'
                                                                        : 'bg-amber-100/50 text-amber-700 border-amber-200')
                                                                    : booking.status === 'approved' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                                                        'bg-red-100/50 text-red-700 border-red-200'
                                                            )}>
                                                                {['completed', 'approved'].includes(booking.status)
                                                                    ? (booking.status === 'completed'
                                                                        ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held (24h)')
                                                                        : 'Approved')
                                                                    : 'Cancelled'}
                                                            </span>
                                                        </span>
                                                    </div>

                                                    <button onClick={() => handleInstructorClick(instructor)} className="text-[11px] font-bold text-charcoal/60 hover:text-charcoal transition-colors hover:underline underline-offset-2 whitespace-normal break-words text-left flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Instructor:</span>
                                                        {instructor?.full_name || "Instructor"}
                                                    </button>
                                                </div>

                                                {/* Tags (Flex Wrap) */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Status Box (Mobile only inside Row 2) */}
                                                    <span className={clsx(
                                                        'sm:hidden px-1.5 py-0.5 text-[7px] font-bold uppercase rounded-md tracking-widest border inline-block whitespace-nowrap',
                                                        booking.status === 'completed'
                                                            ? (booking.funds_unlocked
                                                                ? 'border-[#b8d49a] text-[#2D4F1E] bg-[#D4E4BC]'
                                                                : 'bg-amber-100/50 text-amber-700 border-amber-200')
                                                            : booking.status === 'approved' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                                                'bg-red-100/50 text-red-700 border-red-200'
                                                    )}>
                                                        {['completed', 'approved'].includes(booking.status)
                                                            ? (booking.status === 'completed'
                                                                ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held (24h)')
                                                                : 'Approved')
                                                            : 'Cancelled'}
                                                    </span>

                                                    {client?.medical_conditions && (
                                                        <span className="px-1.5 py-1 bg-red-50 text-red-600 text-[6.5px] sm:text-[7px] font-black uppercase rounded border border-red-200 animate-pulse flex items-center gap-1 tracking-widest shrink-0">
                                                            <AlertCircle className="w-2.5 h-2.5 -mt-px" /> MEDICAL
                                                        </span>
                                                    )}

                                                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-1 rounded border border-charcoal/10 whitespace-nowrap">
                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                            ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                            : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Time for Desktop only in Row 2 */}
                                            <span className="hidden sm:inline text-[11px] font-black uppercase text-charcoal/60 tracking-widest">
                                                {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Row 3: Earnings & Action */}
                                    <div className="flex items-stretch justify-between gap-2 pt-5 border-t border-border-grey sm:border-t-0 sm:pt-0">
                                        {['completed', 'approved'].includes(booking.status) ? (
                                            <div className="flex-1 px-3 py-2 bg-forest/5 border border-forest/10 rounded flex items-center justify-center gap-2">
                                                <span className="text-[7px] sm:text-[8px] font-black text-forest/50 uppercase tracking-widest">Earned</span>
                                                <span className="text-[10px] sm:text-[12px] font-black text-forest tracking-tighter">₱{Number(studioFee || booking.total_price || 0).toLocaleString()}</span>
                                            </div>
                                        ) : <div className="flex-1" />}

                                        <div className="flex-1 flex items-center gap-2">
                                            {instructor && instructor.id !== currentUserId && (
                                                <div className="flex-1 h-full">
                                                    <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={instructor.id} partnerName={instructor.full_name || 'Instructor'} label="MESSAGE" variant="antigravity" className="h-full w-full bg-charcoal/5 hover:bg-charcoal/10 border-none justify-center" />
                                                </div>
                                            )}
                                            {booking.status === 'approved' && start > now && (
                                                <button
                                                    onClick={() => setCancellingBooking(booking)}
                                                    className="h-full px-2 sm:px-3 bg-off-white text-red-600 border border-border-grey rounded text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-tight group/cancel flex-1"
                                                    title="Cancel Session"
                                                >
                                                    <X className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                                                    <span>CANCEL</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <CancelBookingModal
                isOpen={!!cancellingBooking}
                onClose={() => setCancellingBooking(null)}
                onConfirm={handleCancelConfirm}
                title="Cancel Session"
                description="Are you sure you want to cancel this session? A 100% refund will be issued to the client immediately. The instructor will also be notified."
                penaltyNotice={
                    (() => {
                        if (!cancellingBooking) return null
                        const slotData = getFirst(cancellingBooking.slots)
                        if (!slotData) return null
                        const startTime = new Date(`${slotData.date}T${slotData.start_time}+08:00`)
                        const diffInHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                        const isLate = diffInHours < 24

                        if (isLate) {
                            const studioFee = cancellingBooking.price_breakdown?.studio_fee || 0
                            return `Late Cancellation Displacement Fee: ₱${studioFee.toLocaleString()} will be deducted from your wallet and credited to the instructor.`
                        }
                        return null
                    })() || undefined
                }
            />

            {/* Instructor Profile Modal */}
            {selectedInstructor && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setSelectedInstructor(null); setInstructorDetails(null) }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedInstructor(null); setInstructorDetails(null) }} className="absolute top-4 right-4 z-10 text-charcoal-400 hover:text-charcoal-900 transition-colors"><X className="w-5 h-5" /></button>

                        <div className="overflow-y-auto flex-1 p-6">
                            {/* Header */}
                            <div className="flex flex-col items-center mt-2 mb-5 text-center">
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                    <img
                                        src={instructorDetails?.instructor?.avatar_url
                                            ? `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${instructorDetails.instructor.avatar_url}`
                                            : selectedInstructor?.avatar_url
                                                ? `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${selectedInstructor.avatar_url}`
                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedInstructor.full_name || 'I')}&background=F5F2EB&color=2C3230`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h3 className="text-xl font-serif text-charcoal-900">{selectedInstructor.full_name}</h3>
                                {instructorDetails?.instructor?.instagram_handle && (
                                    <a href={`https://instagram.com/${instructorDetails.instructor.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors">
                                        <Instagram className="w-3 h-3" />
                                        @{instructorDetails.instructor.instagram_handle}
                                    </a>
                                )}
                                {!loadingInstructor && instructorDetails && (
                                    <div className="flex items-center gap-1 mt-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(instructorDetails.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-charcoal-200'}`} />
                                        ))}
                                        {instructorDetails.totalCount > 0 && (
                                            <span className="text-xs text-charcoal-400 ml-1">({instructorDetails.totalCount})</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {loadingInstructor && (
                                <div className="flex items-center justify-center py-8 text-charcoal-400 text-sm">Loading profile...</div>
                            )}

                            {!loadingInstructor && instructorDetails && (
                                <>
                                    {/* Bio */}
                                    {instructorDetails.instructor?.bio && (
                                        <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50 mb-3">
                                            <h4 className="text-sm font-bold text-charcoal-700 mb-1">About</h4>
                                            <p className="text-sm text-charcoal-600 leading-relaxed italic">"{instructorDetails.instructor.bio}"</p>
                                        </div>
                                    )}

                                    {/* Certifications */}
                                    {instructorDetails.certifications.length > 0 && (
                                        <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50 mb-3">
                                            <h4 className="text-sm font-bold text-charcoal-700 mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-sage" /> Certifications</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {instructorDetails.certifications.map((cert: any, i: number) => (
                                                    <span key={i} className="px-2.5 py-1 bg-sage/10 text-sage text-xs font-semibold rounded-full border border-sage/20">
                                                        {cert.certification_name}{cert.certification_body ? ` — ${cert.certification_body}` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Gallery */}
                                    {instructorDetails.instructor?.gallery_images?.length > 0 && (
                                        <div className="mb-3">
                                            <h4 className="text-sm font-bold text-charcoal-700 mb-2">Photos</h4>
                                            <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                                                {instructorDetails.instructor.gallery_images.slice(0, 6).map((img: string, i: number) => (
                                                    <div key={i} className="aspect-square bg-cream-100 overflow-hidden rounded-lg">
                                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reviews */}
                                    {instructorDetails.reviews?.length > 0 && (
                                        <div className="mb-2">
                                            <h4 className="text-sm font-bold text-charcoal-700 mb-2 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400" /> Client Reviews</h4>
                                            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                                {instructorDetails.reviews.slice(0, 5).map((r: any) => {
                                                    const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
                                                    return (
                                                        <div key={r.id} className="bg-cream-50 rounded-xl p-3 border border-cream-100/50">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <img
                                                                    src={reviewer?.avatar_url
                                                                        ? `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${reviewer.avatar_url}`
                                                                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230`}
                                                                    className="w-6 h-6 rounded-full object-cover border border-cream-200"
                                                                    alt=""
                                                                />
                                                                <span className="text-xs font-semibold text-charcoal-700">{reviewer?.full_name || 'Anonymous'}</span>
                                                                <div className="flex items-center gap-0.5 ml-auto">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-charcoal-200'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {r.comment && <p className="text-xs text-charcoal-500 leading-relaxed italic">"{r.comment}"</p>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {!instructorDetails.reviews?.length && !instructorDetails.instructor?.bio && !instructorDetails.certifications.length && (
                                        <p className="text-sm text-charcoal-400 italic text-center py-4">No additional profile info available.</p>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-cream-100 flex gap-2">
                            <Link
                                href={`/instructors/${selectedInstructor.id}`}
                                target="_blank"
                                className="flex-1 py-2.5 text-center bg-charcoal-100 text-charcoal-700 rounded-xl font-bold text-sm hover:bg-charcoal-200 transition-colors"
                            >
                                View Full Profile
                            </Link>
                            <button
                                onClick={() => { setSelectedInstructor(null); setInstructorDetails(null) }}
                                className="flex-1 py-2.5 bg-charcoal-900 text-white rounded-xl font-bold text-sm hover:bg-charcoal-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Client Medical Modal */}
            {
                selectedClient && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900 transition-colors"><X className="w-5 h-5" /></button>
                            <div className="flex flex-col items-center mt-2 mb-6 text-center">
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                    <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-xl font-serif text-charcoal-900">{selectedClient.full_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-charcoal-500">{selectedClient.email}</p>
                                    {selectedClient.date_of_birth && (
                                        <>
                                            <span className="text-charcoal-300">•</span>
                                            <p className="text-sm font-bold text-rose-gold">{calculateAge(selectedClient.date_of_birth)} years old</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {selectedClient.bio && (
                                <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50 mb-3">
                                    <h4 className="text-sm font-bold text-charcoal-700 mb-1">About</h4>
                                    <p className="text-sm text-charcoal-600 leading-relaxed italic">"{selectedClient.bio}"</p>
                                </div>
                            )}
                            {(() => {
                                const conditions = typeof selectedClient.medical_conditions === 'string'
                                    ? selectedClient.medical_conditions.split(',').map((c: string) => c.trim())
                                    : Array.isArray(selectedClient.medical_conditions)
                                        ? selectedClient.medical_conditions
                                        : [];

                                const displayConditions = conditions
                                    .map((c: string) => c === 'Others' ? selectedClient.other_medical_condition : c)
                                    .filter(Boolean)
                                    .join(', ');

                                return displayConditions ? (
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-2">
                                        <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Medical Conditions</h4>
                                        <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">{displayConditions}</p>
                                    </div>
                                ) : (
                                    <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50 mb-2">
                                        <h4 className="text-sm font-bold text-charcoal-700 mb-1">Medical Conditions</h4>
                                        <p className="text-sm text-charcoal-500 italic">None reported.</p>
                                    </div>
                                );
                            })()}
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="w-full mt-4 py-3 bg-charcoal-900 text-white rounded-xl font-bold hover:bg-charcoal-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
