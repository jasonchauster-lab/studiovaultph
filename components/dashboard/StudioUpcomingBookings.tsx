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
            <div className="py-8 text-center bg-off-white rounded-[8px] border border-dashed border-border-grey flex flex-col items-center justify-center">
                <Calendar className="w-10 h-10 text-slate/20 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-charcoal mb-1">Quiet Week</h3>
                <p className="text-xs text-slate max-w-[200px] mx-auto">No upcoming bookings for the next 7 days.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {(bookings || []).map((booking: any) => {
                const slotData = Array.isArray(booking.slots) ? booking.slots[0] : (booking.slots || {})
                const payout = booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0)
                const equipment = booking.price_breakdown?.equipment || booking.equipment || 'Session'
                const qty = booking.price_breakdown?.quantity || 1

                return (
                    <div key={booking.id} className="p-4 border border-border-grey/40 bg-white rounded-xl hover:bg-off-white transition-all shadow-tight group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-center gap-3">
                                    <Link href={`/instructors/${booking.instructor_id}`} className="w-10 h-10 rounded-full overflow-hidden border border-white bg-white shadow-sm shrink-0 hover:scale-105 transition-transform">
                                        <img
                                            src={booking.instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`}
                                            alt="Instructor"
                                            className="w-full h-full object-cover"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-1">
                                            <Link href={`/instructors/${booking.instructor_id}`} className="text-sm font-bold text-charcoal truncate hover:text-forest transition-colors">
                                                {booking.instructor?.full_name || 'N/A'}
                                            </Link>
                                            <div className="text-right shrink-0">
                                                <p className="text-[14px] font-bold text-charcoal leading-none">₱{payout.toLocaleString()}</p>
                                                <p className="text-[8px] text-slate uppercase font-bold tracking-[0.2em] mt-1">Studio Fee</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate font-bold uppercase tracking-tighter mt-1">
                                            <Calendar className="w-3 h-3 text-forest" />
                                            <span>{formatManilaDateStr(slotData.date)} • {formatTo12Hour(slotData.start_time)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/40 space-y-3">
                            <div
                                className="flex items-center gap-2 cursor-pointer group/client"
                                onClick={() => setSelectedClient(booking.client)}
                            >
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-white shrink-0 border border-white shadow-sm group-hover/client:scale-110 transition-transform">
                                    <img src={booking.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-[11px] text-slate truncate flex-1 group-hover/client:text-forest transition-colors tracking-wide">
                                    Client: <span className="font-bold text-charcoal">{booking.client?.full_name || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] pt-1">
                                <div className="flex items-center gap-2">
                                    <Box className="w-3.5 h-3.5 text-forest" />
                                    <span className="font-bold text-charcoal truncate max-w-[100px] uppercase tracking-tighter">
                                        {qty} x {equipment}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={clsx(
                                        "status-pill-earth shrink-0",
                                        ['approved', 'completed'].includes(booking.status?.toLowerCase())
                                            ? "status-pill-green"
                                            : "status-pill-yellow"
                                    )}>
                                        {['approved', 'completed'].includes(booking.status?.toLowerCase()) ? 'Confirmed' : 'Pending'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCancellingBooking(booking)}
                                            className="w-7 h-7 bg-off-white text-red-600 border border-border-grey rounded-full hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-tight"
                                            title="Cancel Booking"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <StudioChatButton
                                            bookingId={booking.id}
                                            currentUserId={currentUserId}
                                            partnerId={booking.instructor_id}
                                            partnerName={booking.instructor?.full_name || 'Instructor'}
                                            label=""
                                        />
                                    </div>
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal/40 animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="earth-card w-full max-w-sm overflow-hidden p-8 relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-charcoal/20 hover:text-charcoal transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-4 mb-8 text-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-cloud scale-110">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">{selectedClient.full_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-slate font-bold uppercase tracking-widest">{selectedClient.email}</p>
                                {selectedClient.date_of_birth && (
                                    <>
                                        <span className="text-slate/20">•</span>
                                        <p className="text-[10px] uppercase font-bold text-forest tracking-widest">{calculateAge(selectedClient.date_of_birth)} years</p>
                                    </>
                                )}
                            </div>
                        </div>
                        {selectedClient.medical_conditions ? (
                            <div className="bg-red-50 p-5 rounded-lg border border-red-200">
                                <h4 className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Medical Conditions</h4>
                                <p className="text-xs text-red-900 leading-relaxed font-medium">{selectedClient.medical_conditions}</p>
                            </div>
                        ) : (
                            <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                                <h4 className="text-[10px] font-bold text-green-800 uppercase tracking-widest mb-1">Health Status</h4>
                                <p className="text-xs text-green-900 font-medium">Clear / No conditions reported.</p>
                            </div>
                        )}
                        <button onClick={() => setSelectedClient(null)} className="w-full mt-8 py-3.5 bg-off-white text-charcoal border border-border-grey rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-tight">Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}
