'use client'

import { useState } from 'react'
import { Calendar, MapPin, Clock, MessageCircle, XCircle, Box } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import ChatWindow from '@/components/dashboard/ChatWindow'
import MessageCountBadge from '@/components/dashboard/MessageCountBadge'
import { cancelBooking } from '@/app/(dashboard)/customer/actions'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import ReviewModal from '@/components/reviews/ReviewModal'
import CancelBookingModal from '@/components/dashboard/CancelBookingModal'

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

    const getSlotDateTime = (date: string | undefined, time: string | undefined) => {
        if (!date || !time) return new Date(0)
        return new Date(`${date}T${time}+08:00`)
    }

    const now = new Date()

    // 1. Filter ALL bookings first
    const filteredBookings = bookings.filter((b) => {
        const slotDateStr = b.slots?.date // YYYY-MM-DD
        const slotTimeStr = b.slots?.start_time

        // Status Filter
        if (filters.status !== 'all') {
            if (filters.status === 'cancelled') {
                if (!['cancelled_refunded', 'cancelled_charged'].includes(b.status)) return false
            } else if (b.status !== filters.status) return false
        }

        // Date Filter
        if (filters.dateRange.from || filters.dateRange.to) {
            const slotDateTime = getSlotDateTime(slotDateStr, slotTimeStr)
            if (filters.dateRange.from && slotDateTime < filters.dateRange.from) return false
            if (filters.dateRange.to && slotDateTime > filters.dateRange.to) return false
        }

        return true
    })

    // 2. Split filtered bookings into upcoming/past
    // Upcoming: Approved, Pending, or Submitted bookings in the future
    const upcomingBookings = filteredBookings.filter(b =>
        ['approved', 'pending', 'submitted'].includes(b.status) && getSlotDateTime(b.slots?.date, b.slots?.start_time) > now
    )
    // Past: Completed, Cancelled, Rejected, or Expired, or any that passed
    const pastBookings = filteredBookings.filter(b =>
        ['completed', 'cancelled_refunded', 'cancelled_charged', 'rejected', 'expired'].includes(b.status) ||
        (['approved', 'pending', 'submitted', 'cancelled'].includes(b.status) && getSlotDateTime(b.slots?.date, b.slots?.start_time) <= now)
    )

    // Helper to check expiration (12 hours after end time)
    const isChatExpired = (booking: any) => {
        const endTime = getSlotDateTime(booking.slots?.date, booking.slots?.end_time)
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000)
        return now > expirationTime
    }

    const handleChatClick = (bookingId: string) => {
        setSelectedBooking(bookingId)
    }

    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)

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

    return (
        <div className="space-y-8">
            <BookingFilter onFilterChange={setFilters} />

            <section>
                <div className="space-y-4">
                    {upcomingBookings.length === 0 ? (
                        <div className="earth-card py-12 text-center">
                            <p className="text-slate">No upcoming sessions booked.</p>
                        </div>
                    ) : (
                        upcomingBookings.map((booking) => (
                            <div key={booking.id} className="earth-card p-6 bg-white hover:translate-y-[-2px] transition-all duration-300 shadow-tight group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-4 w-full">
                                                <Link href={`/studios/${booking.studios?.id || booking.slots?.studios?.id}`} className="w-12 h-12 rounded-lg overflow-hidden border border-border-grey bg-white shadow-tight shrink-0 hover:scale-105 transition-transform">
                                                    <img
                                                        src={booking.studios?.logo_url || booking.slots?.studios?.logo_url || "/logo.png"}
                                                        alt={booking.studios?.name || booking.slots?.studios?.name || "Studio"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex flex-col gap-1 items-start min-w-0">
                                                            <Link href={`/studios/${booking.studios?.id || booking.slots?.studios?.id}`} className="text-base font-bold text-charcoal truncate w-full hover:text-forest transition-colors">
                                                                {booking.studios?.name || booking.slots?.studios?.name || "Studio"}
                                                            </Link>
                                                            <span className={clsx(
                                                                "status-pill-earth",
                                                                booking.status === 'approved' ? "status-pill-green" :
                                                                    ['pending', 'submitted'].includes(booking.status) ? "status-pill-yellow" :
                                                                        ['rejected', 'cancelled', 'cancelled_refunded', 'cancelled_charged', 'expired'].includes(booking.status) ? "status-pill-red" :
                                                                            "bg-off-white text-slate border-border-grey"
                                                            )}>
                                                                {booking.status === 'approved' ? 'Confirmed' : booking.status}
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
                                        <Link href={`/instructors/${booking.instructor_id}`} className="w-7 h-7 rounded-full overflow-hidden bg-off-white shrink-0 border border-border-grey group-hover/inst:border-forest transition-colors">
                                            <img src={booking.instructor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.instructor?.full_name || 'I')}&background=FAFAFA&color=1F2937`} className="w-full h-full object-cover" />
                                        </Link>
                                        <div className="text-sm text-slate truncate flex-1">
                                            Instructor: <Link href={`/instructors/${booking.instructor_id}`} className="font-bold text-charcoal hover:text-forest transition-colors">{booking.instructor?.full_name || booking.profiles?.full_name || 'N/A'}</Link>
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
                                            <MapPin className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                                            <span className="font-bold text-charcoal leading-tight">
                                                {booking.studios?.location || booking.slots?.studios?.location || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <Box className="w-4 h-4 text-forest shrink-0" />
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
                                                onClick={() => handleChatClick(booking.id)}
                                                className="px-3 py-2 bg-white text-charcoal border border-border-grey rounded-lg hover:bg-forest hover:text-white hover:border-forest transition-all flex items-center gap-2 shadow-tight relative group/btn"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold">Chat</span>
                                                <MessageCountBadge bookingId={booking.id} currentUserId={userId} partnerId={booking.instructor_id} isOpen={selectedBooking === booking.id} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Past List */}
            {pastBookings.length > 0 && (
                <section>
                    <h2 className="text-xl font-serif text-charcoal mb-6">Session History</h2>
                    <div className="space-y-4">
                        {pastBookings.map((booking: any) => (
                            <div key={booking.id} className="earth-card p-5 bg-white flex justify-between items-center sm:flex-row flex-col gap-4 shadow-tight">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="text-slate text-sm shrink-0 font-medium">
                                        {getSlotDateTime(booking.slots?.date, booking.slots?.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="font-bold text-charcoal">
                                        {booking.studios?.name || booking.slots?.studios?.name || "Studio"}
                                        <span className="mx-2 text-border-grey font-normal">•</span>
                                        <span className="text-slate font-medium">
                                            {booking.instructor?.full_name || booking.profiles?.full_name || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end w-full sm:w-auto gap-3">
                                    {/* Show Leave Review button only for completed sessions or passed approved sessions */}
                                    {(() => {
                                        const slotEnd = getSlotDateTime(booking.slots?.date, booking.slots?.end_time)
                                        const isPast = slotEnd < now
                                        const canReview = booking.status === 'completed' || (booking.status === 'approved' && isPast)

                                        if (!canReview) return null

                                        const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
                                        const studio = getFirst(booking.slots?.studios)
                                        const instructor = getFirst(booking.instructor)

                                        const reviewedInstructor = booking.customer_reviewed_instructor || booking.customer_reviewed
                                        const reviewedStudio = booking.customer_reviewed_studio
                                        const hasStudioOwner = !!studio?.owner_id

                                        return (
                                            <div className="flex items-center gap-2">
                                                {!reviewedInstructor ? (
                                                    <button
                                                        onClick={() => setReviewTarget({
                                                            booking,
                                                            type: 'instructor',
                                                            revieweeId: booking.instructor_id,
                                                            revieweeName: instructor?.full_name || 'Instructor',
                                                            context: 'Instructor'
                                                        })}
                                                        className="px-3 py-1 bg-off-white text-charcoal text-[10px] font-bold rounded-full border border-border-grey hover:bg-forest hover:text-white hover:border-forest transition-all shadow-tight"
                                                    >
                                                        Review Instructor
                                                    </button>
                                                ) : (
                                                    <span className="status-pill-earth status-pill-green">Instructor ✓</span>
                                                )}

                                                {hasStudioOwner && (!reviewedStudio ? (
                                                    <button
                                                        onClick={() => setReviewTarget({
                                                            booking,
                                                            type: 'studio',
                                                            revieweeId: studio.owner_id,
                                                            revieweeName: studio.name || 'Studio',
                                                            context: 'Studio'
                                                        })}
                                                        className="px-3 py-1 bg-off-white text-charcoal text-[10px] font-bold rounded-full border border-border-grey hover:bg-forest hover:text-white hover:border-forest transition-all shadow-tight"
                                                    >
                                                        Review Studio
                                                    </button>
                                                ) : (
                                                    <span className="status-pill-earth status-pill-green">Studio ✓</span>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                    <span className={clsx(
                                        "status-pill-earth",
                                        booking.status === 'completed' || booking.status === 'approved' ? "status-pill-green" :
                                            ['pending', 'submitted'].includes(booking.status) ? "status-pill-yellow" :
                                                ['cancelled', 'cancelled_refunded', 'cancelled_charged', 'rejected', 'expired'].includes(booking.status) ? "status-pill-red" :
                                                    "bg-off-white text-slate border-border-grey"
                                    )}>
                                        {booking.status === 'completed' ? 'Completed' :
                                            booking.status === 'approved' ? 'Completed' :
                                                ['pending', 'submitted'].includes(booking.status) ? 'Pending' :
                                                    ['rejected', 'expired'].includes(booking.status) ? booking.status :
                                                        'Cancelled'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
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
                        window.location.reload() // Refresh to update status
                    }}
                />
            )}
        </div>
    )
}
