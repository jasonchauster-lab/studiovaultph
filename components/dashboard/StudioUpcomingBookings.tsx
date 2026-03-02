'use client'

import { useState } from 'react'
import { Calendar, Clock, X, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import CancelBookingModal from './CancelBookingModal'
import { cancelBookingByStudio } from '@/app/(dashboard)/studio/actions'
import { formatManilaTime } from '@/lib/timezone'
import StudioChatButton from './StudioChatButton'

interface StudioUpcomingBookingsProps {
    bookings: any[]
    currentUserId: string
}

export default function StudioUpcomingBookings({ bookings: initialBookings, currentUserId }: StudioUpcomingBookingsProps) {
    const [bookings, setBookings] = useState(initialBookings)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }

        const result = await cancelBookingByStudio(cancellingBooking.id, reason)
        if (result.success) {
            // Remove from list or update status
            setBookings(prev => prev.filter(b => b.id !== cancellingBooking.id))
        }
        return result
    }

    if (bookings.length === 0) {
        return (
            <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-cream-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-cream-200">
                    <Calendar className="w-8 h-8 text-rose-gold opacity-30" />
                </div>
                <p className="text-sm text-charcoal-500 font-medium italic">No upcoming bookings for the next 7 days.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {bookings.map((booking: any) => {
                const slotData = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
                const start = slotData?.start_time ? new Date(slotData.start_time) : new Date()
                const payout = booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0)
                const equipment = booking.price_breakdown?.equipment || booking.equipment || 'Session'
                const qty = booking.price_breakdown?.quantity || 1

                return (
                    <div key={booking.id} className="border border-cream-100 rounded-xl p-4 bg-cream-50/30 hover:bg-cream-50 transition-colors shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                    <img
                                        src={booking.instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`}
                                        alt="Instructor"
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-charcoal-900 leading-none mb-1">{booking.instructor?.full_name || 'N/A'}</p>
                                    <p className="text-[10px] text-charcoal-500 uppercase font-bold tracking-tighter">Instructor</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-charcoal-900 leading-none">₱{payout.toLocaleString()}</p>
                                <p className="text-[8px] text-charcoal-400 uppercase font-bold tracking-widest mt-1">Earnings</p>
                            </div>
                        </div>

                        <div className="space-y-2 p-3 bg-white/50 rounded-lg border border-cream-100 mb-4">
                            <div className="flex items-center gap-2 text-charcoal-600 text-[11px]">
                                <div className="w-4 h-4 rounded-full overflow-hidden border border-cream-200">
                                    <img
                                        src={booking.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.client?.full_name || 'client')}`}
                                        alt="Client"
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <span>Client: {booking.client?.full_name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-charcoal-900 text-[11px] font-medium">
                                <Calendar className="w-3 h-3 text-rose-gold" />
                                <span>{start.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })} at {formatManilaTime(slotData.start_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-charcoal-900 text-[11px] font-medium">
                                <Clock className="w-3 h-3 text-rose-gold" />
                                <span>{qty} x {equipment}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <div className={clsx(
                                "text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-md border",
                                ['approved', 'completed'].includes(booking.status?.toLowerCase())
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                                {['approved', 'completed'].includes(booking.status?.toLowerCase()) ? 'Confirmed' : 'Pending'}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCancellingBooking(booking)}
                                    className="text-[10px] font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-all flex items-center gap-1.5"
                                >
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                                <StudioChatButton
                                    booking={booking}
                                    currentUserId={currentUserId}
                                />
                            </div>
                        </div>
                    </div>
                )
            })}

            <CancelBookingModal
                isOpen={!!cancellingBooking}
                onClose={() => setCancellingBooking(null)}
                onConfirm={handleCancelConfirm}
                title="Cancel Session"
                description="Are you sure you want to cancel this session? A 100% refund will be issued to the client immediately. The instructor will also be notified."
                penaltyNotice={
                    (() => {
                        if (!cancellingBooking) return null
                        const slotData = Array.isArray(cancellingBooking.slots) ? cancellingBooking.slots[0] : cancellingBooking.slots
                        const startTime = new Date(slotData.start_time)
                        const now = new Date()
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
        </div>
    )
}
