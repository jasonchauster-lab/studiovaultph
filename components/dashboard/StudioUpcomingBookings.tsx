'use client'

import { useState } from 'react'
import { Calendar, Clock, X, AlertCircle, Box } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import CancelBookingModal from './CancelBookingModal'
import { cancelBookingByStudio } from '@/app/(dashboard)/studio/actions'
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'
import StudioChatButton from './StudioChatButton'

interface StudioUpcomingBookingsProps {
    bookings: any[]
    currentUserId: string
}

export default function StudioUpcomingBookings({ bookings: initialBookings, currentUserId }: StudioUpcomingBookingsProps) {
    const [bookings, setBookings] = useState(initialBookings)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [selectedClient, setSelectedClient] = useState<any>(null)

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
                const payout = booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0)
                const equipment = booking.price_breakdown?.equipment || booking.equipment || 'Session'
                const qty = booking.price_breakdown?.quantity || 1

                return (
                    <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3 w-full">
                                        <Link href={`/instructors/${booking.instructor_id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                            <img
                                                src={booking.instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`}
                                                alt="Instructor"
                                                className="w-full h-full object-cover"
                                            />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <Link href={`/instructors/${booking.instructor_id}`} className="text-sm font-bold text-charcoal-900 truncate hover:text-rose-gold transition-colors">
                                                    {booking.instructor?.full_name || 'N/A'}
                                                </Link>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-bold text-charcoal-900 leading-none">₱{payout.toLocaleString()}</p>
                                                    <p className="text-[9px] text-charcoal-500 uppercase font-bold tracking-widest mt-0.5">Earnings</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-charcoal-500 font-medium mt-0.5">
                                                <Calendar className="w-3 h-3 text-rose-gold" />
                                                <span>{formatManilaDateStr(slotData.date)} at {formatTo12Hour(slotData.start_time)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-cream-200/50 space-y-2">
                            <div
                                className="flex items-center gap-2 cursor-pointer group/client"
                                onClick={() => setSelectedClient(booking.client)}
                            >
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 group-hover/client:border-rose-gold transition-colors">
                                    <img src={booking.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-xs text-charcoal-600 truncate flex-1 group-hover/client:text-charcoal-900 transition-colors">
                                    Client: <span className="font-semibold text-charcoal-900 group-hover/client:text-rose-gold transition-colors">{booking.client?.full_name || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-cream-200/50">
                            <div className="flex items-center gap-2">
                                <Box className="w-3.5 h-3.5 text-charcoal-400" />
                                <span className="font-semibold text-charcoal-700 truncate max-w-[120px]">
                                    {qty} x {equipment}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={clsx(
                                    "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0",
                                    ['approved', 'completed'].includes(booking.status?.toLowerCase())
                                        ? "bg-green-100/50 text-green-700 border-green-200"
                                        : "bg-amber-100/50 text-amber-700 border-amber-200"
                                )}>
                                    {['approved', 'completed'].includes(booking.status?.toLowerCase()) ? 'Confirmed' : 'Pending'}
                                </span>
                                <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setCancellingBooking(booking)}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-all flex items-center gap-1"
                                        title="Cancel"
                                    >
                                        <X className="w-3 h-3" />
                                        <span>Cancel</span>
                                    </button>
                                    <StudioChatButton
                                        bookingId={booking.id}
                                        currentUserId={currentUserId}
                                        partnerId={booking.instructor_id}
                                        partnerName={booking.instructor?.full_name || 'Instructor'}
                                        label="Message Instructor"
                                    />
                                </div>
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
                        // Combine date and time to create a reliable Manila-pinned Date object for the calculation
                        const startTime = new Date(`${slotData.date}T${slotData.start_time}+08:00`)
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

            {selectedClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-2 mb-6 text-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold text-charcoal-900">{selectedClient.full_name}</h3>
                            <p className="text-sm text-charcoal-500">{selectedClient.email}</p>
                        </div>
                        {selectedClient.medical_conditions ? (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Medical Conditions</h4>
                                <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedClient.medical_conditions}</p>
                            </div>
                        ) : (
                            <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50">
                                <h4 className="text-sm font-bold text-charcoal-700 mb-1">Medical Conditions</h4>
                                <p className="text-sm text-charcoal-500">None reported.</p>
                            </div>
                        )}
                        <button onClick={() => setSelectedClient(null)} className="w-full mt-6 py-2.5 bg-cream-100 text-charcoal-900 rounded-xl font-bold hover:bg-cream-200 transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}
