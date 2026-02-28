'use client'

import { useState } from 'react'
import { Calendar, MapPin, Clock, MessageCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'
import ChatWindow from '@/components/dashboard/ChatWindow'
import { cancelBooking } from '@/app/(dashboard)/customer/actions'

interface BookingListProps {
    bookings: any[]
    userId: string
}

export default function BookingList({ bookings, userId }: BookingListProps) {
    const [selectedBooking, setSelectedBooking] = useState<string | null>(null)

    const upcomingBookings = bookings.filter(b => new Date(b.slots.start_time) > new Date())

    // Helper to check expiration (12 hours after end time)
    const isChatExpired = (booking: any) => {
        const endTime = new Date(booking.slots.end_time)
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000)
        return new Date() > expirationTime
    }

    const handleChatClick = (bookingId: string) => {
        setSelectedBooking(bookingId)
    }

    const [cancellingId, setCancellingId] = useState<string | null>(null)

    const handleCancel = async (booking: any) => {
        const startTime = new Date(booking.slots.start_time).getTime()
        const now = new Date().getTime()
        const hoursUntilStart = (startTime - now) / (1000 * 60 * 60)

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
        <>
            <div className="space-y-4">
                {upcomingBookings.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-cream-200">
                        <p className="text-charcoal-500">No upcoming sessions booked.</p>
                    </div>
                ) : (
                    upcomingBookings.map((booking) => (
                        <div key={booking.id} className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center justify-center bg-cream-100 w-16 h-16 rounded-lg text-charcoal-900">
                                    <span className="text-xs font-bold uppercase">{new Date(booking.slots.start_time).toLocaleString('default', { month: 'short' })}</span>
                                    <span className="text-xl font-serif">{new Date(booking.slots.start_time).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-charcoal-900 text-lg mb-1">{booking.slots.studios.name}</h3>
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-charcoal-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {new Date(booking.slots.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {booking.slots.studios.location}
                                        </span>
                                    </div>
                                    <p className="text-sm text-charcoal-600 mt-2">
                                        Valid w/ <span className="font-medium">{booking.profiles?.full_name || 'Instructor'}</span>
                                    </p>
                                    {booking.status === 'rejected' && booking.rejection_reason && (
                                        <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded-md border border-red-100">
                                            <strong>Reason:</strong> {booking.rejection_reason}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {booking.status !== 'rejected' && (
                                    <button
                                        onClick={() => handleChatClick(booking.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-charcoal-900 rounded-lg hover:bg-cream-200 transition-colors text-sm font-medium"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Chat
                                    </button>
                                )}
                                <span className={clsx(
                                    "px-3 py-1 text-xs font-medium rounded-full uppercase tracking-wider",
                                    booking.status === 'approved' ? "bg-green-100 text-green-700" :
                                        booking.status === 'rejected' || booking.status === 'cancelled' ? "bg-red-100 text-red-700" :
                                            "bg-yellow-100 text-yellow-700"
                                )}>
                                    {booking.status}
                                </span>

                                {booking.status === 'approved' && new Date(booking.slots.start_time) > new Date() && (
                                    <button
                                        onClick={() => handleCancel(booking)}
                                        disabled={cancellingId === booking.id}
                                        className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                                        title="Cancel Booking"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        {cancellingId === booking.id ? '...' : 'Cancel'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

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
        </>
    )
}
