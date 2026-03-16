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

    // 3. Group filtered bookings by date
    const groupedBookings: Record<string, any[]> = {}
    
    baseFilteredBookings.sort((a, b) => {
        const slotA = getFirst(a.slots)
        const slotB = getFirst(b.slots)
        const dateA = getSlotDateTime(slotA.date, slotA.start_time).getTime()
        const dateB = getSlotDateTime(slotB.date, slotB.start_time).getTime()
        return dateB - dateA // Sort descending by date
    }).forEach(booking => {
        const slot = getFirst(booking.slots)
        if (!slot) return
        const dateKey = slot.date
        if (!groupedBookings[dateKey]) {
            groupedBookings[dateKey] = []
        }
        groupedBookings[dateKey].push(booking)
    })

    const sortedDates = Object.keys(groupedBookings).sort((a, b) => b.localeCompare(a))

    return (
        <div className="space-y-8 pb-48">
            <BookingFilter key={resetKey} onFilterChange={setFilters} />

            <div className="space-y-10">
                {sortedDates.length === 0 ? (
                    <div className="min-h-[200px] py-12 flex flex-col items-center justify-center text-center earth-card border-dashed bg-off-white mx-6 sm:mx-0 px-4">
                        <div className="w-12 h-12 bg-charcoal/5 rounded-full flex items-center justify-center mb-4">
                            <CalendarX2 className="w-6 h-6 text-charcoal/50" />
                        </div>
                        <h3 className="text-sm font-bold text-charcoal mb-1">No sessions found for this period.</h3>
                        <p className="text-[11px] text-charcoal/50 max-w-[240px] mb-6">Try adjusting your filters or adding a new availability slot.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                <button 
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="px-4 py-2 bg-forest text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-charcoal/80 transition-all shadow-sm"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                href="/studio"
                                className="px-4 py-2 bg-forest text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all shadow-tight"
                            >
                                Add Availability Slot
                            </Link>
                        </div>
                    </div>
                ) : (
                    sortedDates.map((dateKey) => {
                        const dayBookings = groupedBookings[dateKey]
                        const dateObj = new Date(`${dateKey}T00:00:00+08:00`)
                        
                        return (
                            <div key={dateKey} className="space-y-4">
                                {/* Sticky Date Header */}
                                <div className="sticky top-0 z-20 py-2 bg-cream-50/80 backdrop-blur-sm -mx-4 px-4 sm:mx-0 sm:px-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center bg-forest text-white rounded-lg w-12 h-12 shrink-0 shadow-sm">
                                            <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">
                                                {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-serif font-bold leading-none">
                                                {dateObj.toLocaleDateString(undefined, { day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-charcoal uppercase tracking-[0.15em]">
                                                {dateObj.toLocaleDateString(undefined, { weekday: 'long' })}
                                            </h2>
                                            <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-widest">
                                                {dayBookings.length} {dayBookings.length === 1 ? 'Session' : 'Sessions'}
                                            </p>
                                        </div>
                                        <div className="flex-1 h-[1px] bg-charcoal/10" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {dayBookings.map((booking: any) => {
                                        const slot = getFirst(booking.slots)
                                        const instructor = getFirst(booking.instructor)
                                        const client = getFirst(booking.client)
                                        const start = new Date(`${slot?.date}T${slot?.start_time}+08:00`)
                                        const studioFee = booking.price_breakdown?.studio_fee ?? 0
                                        const isCancelled = !['completed', 'approved'].includes(booking.status)

                                        return (
                                            <div 
                                                key={booking.id} 
                                                className={clsx(
                                                    "earth-card p-4 border border-border-grey bg-white hover:bg-off-white transition-all duration-300 shadow-tight group relative mx-4 sm:mx-0",
                                                    isCancelled && "opacity-60 grayscale-[0.3]"
                                                )}
                                            >
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    {/* Time Indicator */}
                                                    <div className="shrink-0 sm:w-20">
                                                        <span className="text-[11px] font-black text-charcoal/60 uppercase tracking-widest">
                                                            {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </span>
                                                    </div>

                                                    {/* Main Content */}
                                                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                                        <div className="min-w-0 flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {client && (
                                                                    <button onClick={() => setSelectedClient(client)} className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0">
                                                                        <div className="w-7 h-7 rounded-full bg-sage/10 border border-border-grey flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                                                            <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=8BA889`} className="w-full h-full object-cover" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-burgundy/90 truncate">{client.full_name}</span>
                                                                    </button>
                                                                )}

                                                                <span className={clsx(
                                                                    'px-2 py-0.5 text-[8px] font-bold uppercase rounded-md tracking-widest border inline-flex items-center gap-1 shrink-0',
                                                                    booking.status === 'completed'
                                                                        ? (booking.funds_unlocked
                                                                            ? 'border-[#b8d49a] text-[#2D4F1E] bg-[#D4E4BC]'
                                                                            : 'bg-amber-100/50 text-amber-700 border-amber-200')
                                                                        : booking.status === 'approved' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                                                            'bg-red-100/50 text-red-700 border-red-200'
                                                                )}>
                                                                    {booking.status === 'completed' && (
                                                                        booking.funds_unlocked ? <Award className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />
                                                                    )}
                                                                    {['completed', 'approved'].includes(booking.status)
                                                                        ? (booking.status === 'completed'
                                                                            ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held')
                                                                            : 'Approved')
                                                                        : 'Cancelled'}
                                                                </span>

                                                                {['completed', 'approved'].includes(booking.status) && (
                                                                    <div className="flex items-baseline gap-1 bg-burgundy/5 px-2 py-0.5 rounded-full border border-burgundy/10">
                                                                        <span className="text-[8px] font-black text-burgundy/40 uppercase tracking-widest">EARNED</span>
                                                                        <span className="text-[11px] font-black text-burgundy">₱{Number(studioFee || booking.total_price || 0).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                <button onClick={() => handleInstructorClick(instructor)} className="text-[10px] font-bold text-burgundy/70 hover:text-burgundy transition-colors hover:underline underline-offset-2 flex items-center gap-1">
                                                                    <span className="font-normal text-burgundy/40 lowercase">instructor:</span>
                                                                    <span className="font-bold">{instructor?.full_name || "Instructor"}</span>
                                                                </button>

                                                                <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <span className="w-1 h-1 rounded-full bg-charcoal/20" />
                                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                                        ? `${slot.equipment[0]}`
                                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'}`)}
                                                                    <span className="text-[8px] font-normal opacity-60">({booking.quantity || 1}x)</span>
                                                                </span>

                                                                {client?.medical_conditions && (
                                                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[7px] font-black uppercase rounded border border-red-100 flex items-center gap-1 tracking-widest">
                                                                        <AlertCircle className="w-2.5 h-2.5" /> MEDICAL
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-2 shrink-0 sm:self-center">
                                                            {instructor && instructor.id !== currentUserId && (
                                                                <StudioChatButton
                                                                    bookingId={booking.id}
                                                                    currentUserId={currentUserId}
                                                                    partnerId={instructor.id}
                                                                    partnerName={instructor.full_name || 'Instructor'}
                                                                    label="MESSAGE"
                                                                    variant="antigravity"
                                                                    className="px-4 py-2 bg-white hover:bg-off-white border border-border-grey hover:border-burgundy/20 transition-all rounded-lg font-bold text-[9px] tracking-widest text-burgundy/60"
                                                                />
                                                            )}
                                                            {booking.status === 'approved' && start > now && (
                                                                <button
                                                                    onClick={() => setCancellingBooking(booking)}
                                                                    className="px-3 py-2 bg-off-white text-red-600 border border-border-grey rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-tight"
                                                                    title="Cancel Session"
                                                                >
                                                                    CANCEL
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-burgundy/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setSelectedInstructor(null); setInstructorDetails(null) }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedInstructor(null); setInstructorDetails(null) }} className="absolute top-4 right-4 z-10 text-burgundy/40 hover:text-burgundy transition-colors"><X className="w-5 h-5" /></button>

                        <div className="overflow-y-auto flex-1 p-6">
                            {/* Header */}
                            <div className="flex flex-col items-center mt-2 mb-5 text-center">
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                    <img
                                        src={(() => {
                                            const url = instructorDetails?.instructor?.avatar_url || selectedInstructor?.avatar_url
                                            if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedInstructor.full_name || 'I')}&background=F5F2EB&color=2C3230`
                                            if (url.startsWith('http')) return url
                                            return `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${url}`
                                        })()}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h3 className="text-xl font-serif text-charcoal-900">{selectedInstructor.full_name}</h3>
                                {instructorDetails?.instructor?.instagram_handle && (
                                    <a href={`https://instagram.com/${instructorDetails.instructor.instagram_handle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-xs text-burgundy/40 hover:text-burgundy/70 transition-colors">
                                        <Instagram className="w-3 h-3" />
                                        @{instructorDetails.instructor.instagram_handle}
                                    </a>
                                )}
                                {!loadingInstructor && instructorDetails && (
                                    <div className="flex items-center gap-1 mt-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(instructorDetails.averageRating || 0) ? 'fill-gold text-gold' : 'text-burgundy/20'}`} />
                                        ))}
                                        {instructorDetails.totalCount > 0 && (
                                            <span className="text-xs text-burgundy/40 ml-1">({instructorDetails.totalCount})</span>
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
                                        <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-3">
                                            <h4 className="text-sm font-bold text-burgundy/70 mb-1">About</h4>
                                            <p className="text-sm text-slate leading-relaxed italic">"{instructorDetails.instructor.bio}"</p>
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
                                            <h4 className="text-sm font-bold text-charcoal-700 mb-2">Teaching Gallery</h4>
                                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory -mx-1 px-1">
                                                {instructorDetails.instructor.gallery_images.map((img: string, i: number) => (
                                                    <div key={i} className="flex-none w-32 aspect-[4/5] bg-cream-100 overflow-hidden rounded-lg snap-start border border-cream-200">
                                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                                {instructorDetails.instructor.gallery_images.length > 1 && (
                                                    <span className="text-[8px] font-black text-gold/40 uppercase tracking-[0.2em] animate-pulse">Swipe to see more</span>
                                                )}
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
                                                        <div key={r.id} className="bg-pastel-blue rounded-xl p-3 border border-border-grey">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <img
                                                                    src={reviewer?.avatar_url
                                                                        ? (reviewer.avatar_url.startsWith('http') ? reviewer.avatar_url : `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${reviewer.avatar_url}`)
                                                                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=3C2F2F`}
                                                                    className="w-6 h-6 rounded-full object-cover border border-border-grey"
                                                                    alt=""
                                                                />
                                                                <span className="text-xs font-semibold text-burgundy/70">{reviewer?.full_name || 'Anonymous'}</span>
                                                                <div className="flex items-center gap-0.5 ml-auto">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-gold text-gold' : 'text-burgundy/20'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {r.comment && <p className="text-xs text-slate leading-relaxed italic">"{r.comment}"</p>}
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

                        <div className="p-4 border-t border-border-grey">
                            <button
                                onClick={() => { setSelectedInstructor(null); setInstructorDetails(null) }}
                                className="w-full py-2.5 bg-forest text-white rounded-xl font-bold text-sm hover:brightness-110 transition-colors"
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
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-burgundy/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-burgundy/40 hover:text-burgundy transition-colors"><X className="w-5 h-5" /></button>
                            <div className="flex flex-col items-center mt-2 mb-6 text-center">
                                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                    <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-xl font-serif text-burgundy">{selectedClient.full_name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-slate">{selectedClient.email}</p>
                                    {selectedClient.date_of_birth && (
                                        <>
                                            <span className="text-border-grey">•</span>
                                            <p className="text-sm font-bold text-gold">{calculateAge(selectedClient.date_of_birth)} years old</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-3">
                                <h4 className="text-sm font-bold text-burgundy/70 mb-1">About</h4>
                                {selectedClient.bio
                                    ? <p className="text-sm text-slate leading-relaxed italic">"{selectedClient.bio}"</p>
                                    : <p className="text-sm text-slate italic">No bio provided.</p>
                                }
                            </div>
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
                                    <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-2">
                                        <h4 className="text-sm font-bold text-burgundy/70 mb-1">Medical Conditions</h4>
                                        <p className="text-sm text-slate italic">None reported.</p>
                                    </div>
                                );
                            })()}
                            <button
                                onClick={() => setSelectedClient(null)}
                                className="w-full mt-4 py-3 bg-forest text-white rounded-xl font-bold hover:brightness-110 transition-colors"
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
