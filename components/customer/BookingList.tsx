'use client'

import { useState } from 'react'
import { Calendar, MapPin, Clock, MessageCircle, XCircle, Box } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import ChatWindow from '@/components/dashboard/ChatWindow'
import MessageCountBadge from '@/components/dashboard/MessageCountBadge'
import { cancelBooking } from '@/app/(dashboard)/customer/actions'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import LeaveReviewButton from '@/components/reviews/LeaveReviewButton'

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

    const getSlotDateTime = (date: string, time: string) => {
        return new Date(`${date}T${time}+08:00`)
    }

    const now = new Date()

    // 1. Filter ALL bookings first
    const filteredBookings = bookings.filter((b) => {
        const slotDateStr = b.slots.date // YYYY-MM-DD
        const slotTimeStr = b.slots.start_time

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
    // Upcoming: Approved bookings in the future
    const upcomingBookings = filteredBookings.filter(b =>
        b.status === 'approved' && getSlotDateTime(b.slots.date, b.slots.start_time) > now
    )
    // Past: Completed or Cancelled, or Approved that passed
    const pastBookings = filteredBookings.filter(b =>
        b.status === 'completed' ||
        b.status === 'cancelled_refunded' ||
        b.status === 'cancelled_charged' ||
        (b.status === 'approved' && getSlotDateTime(b.slots.date, b.slots.start_time) <= now)
    )

    // Helper to check expiration (12 hours after end time)
    const isChatExpired = (booking: any) => {
        const endTime = getSlotDateTime(booking.slots.date, booking.slots.end_time)
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000)
        return now > expirationTime
    }

    const handleChatClick = (bookingId: string) => {
        setSelectedBooking(bookingId)
    }

    const [cancellingId, setCancellingId] = useState<string | null>(null)

    const handleCancel = async (booking: any) => {
        const startTime = getSlotDateTime(booking.slots.date, booking.slots.start_time).getTime()
        const currentTime = now.getTime()
        const hoursUntilStart = (startTime - currentTime) / (1000 * 60 * 60)

        const isRefunding = hoursUntilStart >= 24

        const msg = isRefunding
            ? 'Are you sure you want to cancel? Your refund will be credited to your Wallet Balance.'
            : 'Are you sure you want to cancel? This booking is less than 24 hours away and will NOT be refunded.'

        if (!window.confirm(msg)) return

        setCancellingId(booking.id)
        const res = await cancelBooking(booking.id)

        if (res.error) {
            alert(res.error)
        } else {
            alert(res.refunded ? `Cancelled successfully. ₱${res.refundAmount} refunded to Wallet.` : 'Cancelled successfully (No refund).')
        }
        setCancellingId(null)
    }

    const activeBooking = bookings.find(b => b.id === selectedBooking)
    const recipientName = activeBooking?.profiles?.full_name || 'Instructor'

    return (
        <div className="space-y-8">
            <BookingFilter onFilterChange={setFilters} />

            <section>
                <div className="space-y-4">
                    {upcomingBookings.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-cream-200">
                            <p className="text-charcoal-500">No upcoming sessions booked.</p>
                        </div>
                    ) : (
                        upcomingBookings.map((booking) => (
                            <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3 w-full">
                                                <Link href={`/studios/${booking.slots.studios?.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                    <img
                                                        src={booking.slots.studios?.logo_url || "/logo.png"}
                                                        alt={booking.slots.studios?.name || "Studio"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex flex-col gap-1 items-start min-w-0">
                                                            <Link href={`/studios/${booking.slots.studios?.id}`} className="text-sm font-bold text-charcoal-900 truncate w-full hover:text-rose-gold transition-colors">
                                                                {booking.slots.studios?.name || "Studio"}
                                                            </Link>
                                                            <span className={clsx(
                                                                "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0",
                                                                booking.status === 'approved' ? "bg-green-100/50 text-green-700 border-green-200" :
                                                                    booking.status === 'rejected' || booking.status === 'cancelled' ? "bg-red-100/50 text-red-700 border-red-200" :
                                                                        "bg-amber-100/50 text-amber-700 border-amber-200"
                                                            )}>
                                                                {booking.status === 'approved' ? 'Confirmed' : booking.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[13px] font-bold text-charcoal-900 leading-none">
                                                                {getSlotDateTime(booking.slots.date, booking.slots.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                {getSlotDateTime(booking.slots.date, booking.slots.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-cream-200/50 space-y-2">
                                    <div className="flex items-center gap-2 group/inst">
                                        <Link href={`/instructors/${booking.instructor_id}`} className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 hover:border-rose-gold transition-colors">
                                            <img src={booking.instructor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.instructor?.full_name || 'I')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                        </Link>
                                        <div className="text-xs text-charcoal-600 truncate flex-1 group-hover/inst:text-charcoal-900 transition-colors">
                                            Instructor: <Link href={`/instructors/${booking.instructor_id}`} className="font-semibold text-charcoal-900 hover:text-rose-gold transition-colors">{booking.instructor?.full_name || booking.profiles?.full_name || 'N/A'}</Link>
                                        </div>
                                    </div>
                                    {booking.status === 'rejected' && booking.rejection_reason && (
                                        <p className="text-[10px] text-red-600 mt-1 bg-red-50 p-1.5 rounded-md border border-red-100 flex items-center gap-1">
                                            <strong>Reason:</strong> {booking.rejection_reason}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                            <span className="font-semibold text-charcoal-700 leading-tight">
                                                {booking.slots.studios?.location || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                            <span className="font-semibold text-charcoal-700">
                                                {Array.isArray(booking.slots?.equipment) && booking.slots.equipment.length > 0
                                                    ? `${booking.slots.equipment[0]} (${booking.quantity || 1})`
                                                    : (`${booking.price_breakdown?.equipment || booking.equipment || 'Standard Session'} (${booking.quantity || 1})`)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {booking.status === 'approved' && getSlotDateTime(booking.slots.date, booking.slots.start_time) > now && (
                                            <button
                                                onClick={() => handleCancel(booking)}
                                                disabled={cancellingId === booking.id}
                                                className="px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-[10px] font-bold disabled:opacity-50 flex items-center gap-1 border border-red-100"
                                                title="Cancel Booking"
                                            >
                                                <XCircle className="w-3 h-3" />
                                                {cancellingId === booking.id ? '...' : 'Cancel'}
                                            </button>
                                        )}
                                        {booking.status !== 'rejected' && (
                                            <button
                                                onClick={() => handleChatClick(booking.id)}
                                                className="px-2 py-1.5 bg-white text-charcoal-600 border border-cream-200 rounded-lg hover:bg-rose-gold hover:text-white hover:border-rose-gold transition-all flex items-center gap-1 shadow-sm relative group/btn"
                                                title="Message Instructor"
                                            >
                                                <MessageCircle className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">Chat</span>
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
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6">Session History</h2>
                    <div className="space-y-4">
                        {pastBookings.map((booking: any) => (
                            <div key={booking.id} className="bg-white p-4 rounded-xl border border-cream-200 flex justify-between items-center sm:flex-row flex-col gap-4">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="text-charcoal-500 text-sm shrink-0 font-medium">
                                        {getSlotDateTime(booking.slots.date, booking.slots.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="font-bold text-charcoal-800">{booking.slots.studios.name}</div>
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
                                        return (
                                            <LeaveReviewButton
                                                booking={booking}
                                                currentUserId={userId}
                                                studioOwnerId={studio?.owner_id ?? null}
                                                studioName={studio?.name ?? 'Studio'}
                                            />
                                        )
                                    })()}
                                    <span className={clsx(
                                        "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border",
                                        booking.status === 'completed' ? "bg-green-100/50 text-green-700 border-green-200" :
                                            booking.status === 'approved' ? "bg-blue-100/50 text-blue-700 border-blue-200" :
                                                ['cancelled', 'cancelled_refunded'].includes(booking.status) ? "bg-red-100/50 text-red-700 border-red-200" :
                                                    "bg-charcoal-100/50 text-charcoal-600 border-cream-200"
                                    )}>
                                        {booking.status === 'completed' ? 'Completed' :
                                            booking.status === 'approved' ? 'Completed' :
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
        </div>
    )
}
