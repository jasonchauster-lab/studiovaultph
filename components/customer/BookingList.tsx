'use client'

import { useState } from 'react'
import { Calendar, MapPin, Clock, MessageCircle, XCircle, Box, Navigation, X, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import ChatWindow from '@/components/dashboard/ChatWindow'
import MessageCountBadge from '@/components/dashboard/MessageCountBadge'
import { cancelBooking } from '@/app/(dashboard)/customer/actions'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import ReviewModal from '@/components/reviews/ReviewModal'
import CancelBookingModal from '@/components/dashboard/CancelBookingModal'
import StudioPreviewModal from '@/components/dashboard/StudioPreviewModal'
import InstructorPreviewModal from '@/components/dashboard/InstructorPreviewModal'
import { getInstructorProfile, getStudioProfile } from '@/app/(dashboard)/instructors/actions'

interface BookingListProps {
    bookings: any[]
    userId: string
}

export default function BookingList({ bookings, userId }: BookingListProps) {
    const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        dateRange: { from: null, to: null }
    })
    const [reviewTarget, setReviewTarget] = useState<{
        booking: any,
        type: 'instructor' | 'studio',
        revieweeId: string,
        revieweeName: string,
        context: string
    } | null>(null)
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [resetKey, setResetKey] = useState(0)

    // Instructor modal state
    const [selectedInstructor, setSelectedInstructor] = useState<any>(null)
    const [instructorDetails, setInstructorDetails] = useState<any>(null)
    const [loadingInstructor, setLoadingInstructor] = useState(false)

    // Studio modal state
    const [selectedStudio, setSelectedStudio] = useState<any>(null)
    const [studioDetails, setStudioDetails] = useState<any>(null)
    const [loadingStudio, setLoadingStudio] = useState(false)

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

    const handleStudioClick = async (studio: any) => {
        if (!studio?.id) return
        setSelectedStudio(studio)
        setStudioDetails(null)
        setLoadingStudio(true)
        try {
            const data = await getStudioProfile(studio.id)
            setStudioDetails(data)
        } finally {
            setLoadingStudio(false)
        }
    }

    const getSlotDateTime = (date: string | undefined, time: string | undefined) => {
        if (!date || !time) return new Date(0)
        return new Date(`${date}T${time}+08:00`)
    }

    const now = new Date()

    const filteredBookings = bookings.filter((b) => {
        const slotDateStr = b.slots?.date
        const slotTimeStr = b.slots?.start_time

        if (filters.status !== 'all') {
            if (filters.status === 'cancelled') {
                if (!['cancelled_refunded', 'cancelled_charged'].includes(b.status)) return false
            } else if (b.status !== filters.status) return false
        }

        if (filters.dateRange.from || filters.dateRange.to) {
            const slotDateTime = getSlotDateTime(slotDateStr, slotTimeStr)
            if (filters.dateRange.from && slotDateTime < filters.dateRange.from) return false
            if (filters.dateRange.to && slotDateTime > filters.dateRange.to) return false
        }

        return true
    })

    const upcomingBookings = filteredBookings.filter(b =>
        ['approved', 'pending', 'submitted'].includes(b.status) && getSlotDateTime(b.slots?.date, b.slots?.start_time) > now
    )
    const pastBookings = filteredBookings.filter(b =>
        ['completed', 'cancelled_refunded', 'cancelled_charged', 'rejected', 'expired'].includes(b.status) ||
        (['approved', 'pending', 'submitted', 'cancelled'].includes(b.status) && getSlotDateTime(b.slots?.date, b.slots?.start_time) <= now)
    ).sort((a: any, b: any) => {
        const dateA = getSlotDateTime(a.slots?.date, a.slots?.start_time).getTime()
        const dateB = getSlotDateTime(b.slots?.date, b.slots?.start_time).getTime()
        return dateB - dateA // Sort descending
    })

    const groupedPastBookings = pastBookings.reduce((groups: Record<string, any[]>, booking: any) => {
        const date = getSlotDateTime(booking.slots?.date, booking.slots?.start_time)
        const monthYear = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        if (!groups[monthYear]) {
            groups[monthYear] = []
        }
        groups[monthYear].push(booking)
        return groups
    }, {})

    const isChatExpired = (booking: any) => {
        const endTime = getSlotDateTime(booking.slots?.date, booking.slots?.end_time)
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000)
        return now > expirationTime
    }

    const getStatusLabel = (status: string, isPast: boolean) => {
        switch (status) {
            case 'approved':
                return isPast ? 'Completed' : 'Confirmed'
            case 'completed':
                return 'Completed'
            case 'pending':
            case 'submitted':
                return 'Awaiting Confirmation'
            case 'rejected':
                return 'Not Accepted'
            case 'expired':
                return 'No-Show'
            case 'cancelled':
            case 'cancelled_refunded':
            case 'cancelled_charged':
                return 'Cancelled'
            default:
                return status
        }
    }

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }
        setCancellingId(cancellingBooking.id)
        const res = await cancelBooking(cancellingBooking.id, reason)
        setCancellingId(null)
        setCancellingBooking(null)
        return res
    }

    const activeBooking = bookings.find(b => b.id === selectedBooking)
    const recipientName = activeBooking?.profiles?.full_name || 'Instructor'

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v

    return (
        <div className="space-y-8">
            <BookingFilter key={resetKey} onFilterChange={setFilters} />

            <section>
                <div className="space-y-4">
                    {upcomingBookings.length === 0 ? (
                        <div className="min-h-[220px] py-12 flex flex-col items-center justify-center text-center earth-card border-dashed bg-white/40 backdrop-blur-sm mx-0 px-4">
                            <div className="w-14 h-14 bg-forest/5 rounded-full flex items-center justify-center mb-6 shadow-tight">
                                <Calendar className="w-7 h-7 text-forest/20" />
                            </div>
                            <h3 className="text-sm font-bold text-burgundy mb-2">No upcoming sessions booked.</h3>
                            <p className="text-[11px] text-slate/70 max-w-[240px] mb-8 leading-relaxed">Try adjusting your filters or browse instructors to book your next class.</p>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-[200px] sm:max-w-none justify-center">
                                {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                    <button 
                                        onClick={() => setResetKey(prev => prev + 1)}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-white text-forest text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-forest/5 transition-all shadow-tight border border-forest/10"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                <Link
                                    href="/customer"
                                    className="w-full sm:w-auto px-6 py-2.5 bg-forest text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-tight"
                                >
                                    Browse Instructors
                                </Link>
                            </div>
                        </div>
                    ) : (
                        upcomingBookings.map((booking) => {
                            const studio = getFirst(booking.studios) || getFirst(booking.slots?.studios)
                            const instructor = getFirst(booking.instructor)
                            const isPending = ['pending', 'submitted'].includes(booking.status)
                            return (
                                <div key={booking.id} className={clsx(
                                    "earth-card p-6 transition-all duration-300 shadow-tight group relative overflow-hidden",
                                    isPending ? "bg-amber-50/30 border-amber-100" : "bg-white hover:translate-y-[-2px]"
                                )}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-4 w-full">
                                                    <button onClick={() => handleStudioClick(studio)} className="w-12 h-12 rounded-lg overflow-hidden border border-border-grey bg-white shadow-tight shrink-0 hover:scale-105 transition-transform">
                                                        <img
                                                            src={studio?.logo_url || "/logo2.jpg"}
                                                            alt={studio?.name || "Studio"}
                                                            className="w-full h-full object-cover mix-blend-multiply"
                                                        />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex flex-col gap-1 items-start min-w-0">
                                                                <button onClick={() => handleStudioClick(studio)} className="text-base font-bold text-burgundy truncate w-full hover:text-sage transition-colors text-left">
                                                                    {studio?.name || "Studio"}
                                                                </button>
                                                                <span className={clsx(
                                                                    "status-pill-earth",
                                                                    booking.status === 'approved' ? "status-pill-green" :
                                                                        isPending ? "bg-amber-100 text-amber-900 border-amber-200" :
                                                                            ['rejected', 'cancelled', 'cancelled_refunded', 'cancelled_charged', 'expired'].includes(booking.status) ? "status-pill-red" :
                                                                                "bg-off-white text-slate border-border-grey"
                                                                )}>
                                                                    {getStatusLabel(booking.status, false)}
                                                                </span>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-[14px] font-bold text-charcoal leading-none">
                                                                    {getSlotDateTime(booking.slots?.date, booking.slots?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[12px] text-slate font-medium mt-1">
                                                                    {getSlotDateTime(booking.slots?.date, booking.slots?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border-grey/50 space-y-3">
                                        <div className="flex items-center gap-3 group/inst">
                                            <button onClick={() => handleInstructorClick(instructor)} className="w-7 h-7 rounded-full overflow-hidden bg-off-white shrink-0 border border-border-grey group-hover/inst:border-sage transition-colors">
                                                <img src={instructor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.full_name || 'I')}&background=FAFAFA&color=3C2F2F`} className="w-full h-full object-cover" />
                                            </button>
                                            <div className="text-sm text-slate truncate flex-1">
                                                Instructor: <button onClick={() => handleInstructorClick(instructor)} className="font-bold text-burgundy hover:text-sage transition-colors hover:underline underline-offset-2">{instructor?.full_name || 'N/A'}</button>
                                            </div>
                                        </div>
                                        {booking.status === 'rejected' && booking.rejection_reason && (
                                            <p className="text-[11px] text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-2">
                                                <strong>Reason:</strong> {booking.rejection_reason}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between text-sm mt-4 pt-4 border-t border-border-grey/50 gap-4">
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-start gap-2.5">
                                                <MapPin className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                                                <span className="font-bold text-burgundy leading-tight">
                                                    {studio?.location || "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Box className="w-4 h-4 text-sage shrink-0" />
                                                <span className="font-bold text-slate">
                                                    {Array.isArray(booking.slots?.equipment) && booking.slots.equipment.length > 0
                                                        ? `${booking.slots.equipment[0]} (${booking.quantity || 1})`
                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Standard Session'} (${booking.quantity || 1})`)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5">
                                            {booking.status === 'approved' && getSlotDateTime(booking.slots?.date, booking.slots?.start_time) > now && (
                                                <button
                                                    onClick={() => setCancellingBooking(booking)}
                                                    disabled={cancellingId === booking.id}
                                                    className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-[11px] font-bold border border-red-100 flex items-center gap-2 shadow-tight"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    {cancellingId === booking.id ? '...' : 'Cancel'}
                                                </button>
                                            )}
                                            {booking.status !== 'rejected' && (
                                                <button
                                                    onClick={() => setSelectedBooking(booking.id)}
                                                    className="px-3 py-2 bg-white text-burgundy border border-border-grey rounded-lg hover:bg-sage hover:text-white hover:border-sage transition-all flex items-center gap-2 shadow-tight relative group/btn"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    <span className="text-[11px] font-bold">Chat</span>
                                                    <MessageCountBadge bookingId={booking.id} currentUserId={userId} partnerId={booking.instructor_id} isOpen={selectedBooking === booking.id} />
                                                </button>
                                            )}
                                            {booking.status === 'approved' && getSlotDateTime(booking.slots?.date, booking.slots?.start_time) > now && (
                                                <a
                                                    href={studio?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((studio?.name || "") + " " + (studio?.location || ""))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-2 bg-white text-sage border border-sage/20 rounded-lg hover:bg-sage hover:text-white transition-all flex items-center gap-2 shadow-tight"
                                                >
                                                    <Navigation className="w-3.5 h-3.5" />
                                                    <span className="text-[11px] font-bold">Directions</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>

            {/* Past List with Date Grouping */}
            {pastBookings.length > 0 && (
                <section className="space-y-6">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 sticky top-0 py-6 bg-cream-50/80 backdrop-blur-md z-20 border-b border-charcoal/5">Session History</h2>
                    
                    {(Object.entries(groupedPastBookings) as [string, any[]][]).map(([monthYear, monthBookings]) => (
                        <div key={monthYear} className="space-y-4">
                            <h3 className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.3em] flex items-center gap-3">
                                {monthYear}
                                <div className="h-[1px] flex-1 bg-charcoal/10" />
                            </h3>
                            
                            <div className="space-y-3">
                                {monthBookings.map((booking: any) => {
                                    const studio = getFirst(booking.studios) || getFirst(booking.slots?.studios)
                                    const instructor = getFirst(booking.instructor)
                                    const slotEnd = getSlotDateTime(booking.slots?.date, booking.slots?.end_time)
                                    const isPast = slotEnd < now
                                    const canReview = booking.status === 'completed' || (booking.status === 'approved' && isPast)
                                    
                                    return (
                                        <div key={booking.id} className="earth-card p-4 sm:p-5 bg-white flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-tight hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-charcoal/5 rounded-xl shrink-0 border border-charcoal/5">
                                                    <span className="text-[9px] uppercase font-black text-charcoal/30 leading-none">
                                                        {getSlotDateTime(booking.slots?.date, booking.slots?.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                                    </span>
                                                    <span className="text-lg font-serif text-charcoal-900 leading-none mt-1">
                                                        {getSlotDateTime(booking.slots?.date, booking.slots?.start_time).toLocaleDateString(undefined, { day: 'numeric' })}
                                                    </span>
                                                </div>
                                                
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-col">
                                                        <button onClick={() => handleStudioClick(studio)} className="text-[15px] font-bold text-burgundy hover:text-sage transition-colors text-left truncate leading-tight">
                                                            {studio?.name || "Studio"}
                                                        </button>
                                                        <div className="flex items-center gap-2 mt-1 min-w-0">
                                                            <button onClick={() => handleInstructorClick(instructor)} className="text-[12px] text-slate/70 font-semibold hover:text-forest transition-colors truncate">
                                                                {instructor?.full_name || 'N/A'}
                                                            </button>
                                                            <span className="text-charcoal/10 shrink-0">•</span>
                                                            <span className="text-[11px] text-charcoal/40 font-medium shrink-0">
                                                                {getSlotDateTime(booking.slots?.date, booking.slots?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-charcoal/5">
                                                <div className="flex items-center gap-2">
                                                    {canReview && (
                                                        <>
                                                            {!(booking.customer_reviewed_instructor || booking.customer_reviewed) ? (
                                                                <button
                                                                    onClick={() => setReviewTarget({
                                                                        booking,
                                                                        type: 'instructor',
                                                                        revieweeId: booking.instructor_id,
                                                                        revieweeName: instructor?.full_name || 'Instructor',
                                                                        context: 'Instructor'
                                                                    })}
                                                                    className="px-3 py-1.5 bg-forest text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:brightness-110 transition-all shadow-tight"
                                                                >
                                                                    Review Inst.
                                                                </button>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100 flex items-center gap-1 shadow-sm">
                                                                    <CheckCircle2 className="w-3 h-3" /> Inst.
                                                                </span>
                                                            )}
                                                            {!!studio?.owner_id && (!booking.customer_reviewed_studio ? (
                                                                <button
                                                                    onClick={() => setReviewTarget({
                                                                        booking,
                                                                        type: 'studio',
                                                                        revieweeId: studio.owner_id,
                                                                        revieweeName: studio.name || 'Studio',
                                                                        context: 'Studio'
                                                                    })}
                                                                    className="px-3 py-1.5 bg-forest text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:brightness-110 transition-all shadow-tight"
                                                                >
                                                                    Review Studio
                                                                </button>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100 flex items-center gap-1 shadow-sm">
                                                                    <CheckCircle2 className="w-3 h-3" /> Studio
                                                                </span>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>

                                                <span className={clsx(
                                                    "px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] rounded-full border shrink-0 shadow-sm",
                                                    (booking.status === 'completed' || booking.status === 'approved') ? "bg-green-50 text-green-700 border-green-100" :
                                                        ['pending', 'submitted'].includes(booking.status) ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                            ['cancelled', 'cancelled_refunded', 'cancelled_charged', 'rejected', 'expired'].includes(booking.status) ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                                "bg-off-white text-slate border-border-grey"
                                                )}>
                                                    {getStatusLabel(booking.status, true)}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Chat Modal */}
            {selectedBooking && activeBooking && (
                <ChatWindow
                    bookingId={selectedBooking}
                    currentUserId={userId}
                    recipientId={activeBooking.instructor_id}
                    recipientName={recipientName}
                    isOpen={!!selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    isExpired={isChatExpired(activeBooking)}
                />
            )}

            <CancelBookingModal
                isOpen={!!cancellingBooking}
                onClose={() => setCancellingBooking(null)}
                onConfirm={handleCancelConfirm}
                title="Cancel Booking"
                description={(() => {
                    if (!cancellingBooking) return ""
                    const startTime = getSlotDateTime(cancellingBooking.slots?.date, cancellingBooking.slots?.start_time).getTime()
                    const hoursUntilStart = (startTime - now.getTime()) / (1000 * 60 * 60)
                    return hoursUntilStart >= 24
                        ? "Are you sure you want to cancel? Your refund will be credited to your Wallet Balance."
                        : "Are you sure you want to cancel? This booking is less than 24 hours away and will NOT be refunded."
                })()}
            />

            {/* Instructor Profile Modal */}
            <InstructorPreviewModal 
                instructor={selectedInstructor}
                details={instructorDetails}
                loading={loadingInstructor}
                onClose={() => { setSelectedInstructor(null); setInstructorDetails(null) }}
            />

            {/* Studio Profile Modal */}
            <StudioPreviewModal 
                studio={selectedStudio}
                details={studioDetails}
                loading={loadingStudio}
                onClose={() => { setSelectedStudio(null); setStudioDetails(null) }}
            />

            {/* Review Modal */}
            {reviewTarget && (
                <ReviewModal
                    booking={reviewTarget.booking}
                    currentUserId={userId}
                    isInstructor={false}
                    revieweeId={reviewTarget.revieweeId}
                    revieweeName={reviewTarget.revieweeName}
                    reviewContext={reviewTarget.context}
                    onClose={() => setReviewTarget(null)}
                    onSuccess={() => {
                        setReviewTarget(null)
                        window.location.reload()
                    }}
                />
            )}
        </div>
    )
}
