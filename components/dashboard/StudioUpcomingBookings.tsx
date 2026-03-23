'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, Clock, X, AlertCircle, Box, UserCheck } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import CancelBookingModal from './CancelBookingModal'
import { cancelBookingByStudio } from '@/app/(dashboard)/studio/booking-actions'
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'
import StudioChatButton from './StudioChatButton'
import Avatar from '@/components/shared/Avatar'


interface StudioUpcomingBookingsProps {
    bookings: any[]
    currentUserId: string
}

export default function StudioUpcomingBookings({ bookings: initialBookings, currentUserId }: StudioUpcomingBookingsProps) {
    const [bookings, setBookings] = useState(initialBookings)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])
    
    const now = useMemo(() => isMounted ? new Date() : new Date(0), [isMounted])

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
            <div className="py-12 px-6 text-center bg-off-white/50 rounded-2xl border-2 border-dashed border-border-grey/50 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-tight ring-1 ring-border-grey/10">
                    <Calendar className="w-8 h-8 text-forest/20" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-charcoal uppercase tracking-[0.2em]">Quiet Period</h3>
                    <p className="text-[11px] text-slate font-medium max-w-[180px] mx-auto leading-relaxed opacity-70">
                        No upcoming bookings scheduled for the next 7 days.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {(bookings || []).map((booking: any) => {
                const slotData = Array.isArray(booking.slots) ? booking.slots[0] : (booking.slots || {})
                const payout = booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0)
                const equipment = booking.price_breakdown?.equipment || booking.equipment || 'Session'
                const qty = booking.price_breakdown?.quantity || 1

                return (
                    <div key={booking.id} className="p-5 sm:p-6 border border-border-grey/50 bg-white rounded-2xl hover:shadow-card hover:-translate-y-1 transition-all duration-500 group relative ring-1 ring-border-grey/10">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
                            <div className="flex items-center gap-4 min-w-0">
                                <Link href={`/instructors/${booking.instructor_id}`} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-off-white shadow-tight shrink-0 hover:scale-110 transition-transform duration-500 ring-1 ring-border-grey/20">
                                    <Avatar 
                                        src={booking.instructor?.avatar_url} 
                                        fallbackName={booking.instructor?.full_name} 
                                        size={48} 
                                    />

                                </Link>
                                <div className="space-y-0.5 min-w-0">
                                    <Link href={`/instructors/${booking.instructor_id}`} className="text-sm font-black text-charcoal hover:text-forest transition-colors uppercase tracking-tight block leading-tight">
                                        {booking.instructor?.full_name || 'N/A'}
                                    </Link>
                                    <div className="flex items-start gap-2 text-xs text-slate font-bold uppercase tracking-wider opacity-60">
                                        <Clock className="w-3 h-3 text-forest shrink-0 mt-0.5" />
                                        <span className="">{formatManilaDateStr(slotData.date)} • {formatTo12Hour(slotData.start_time)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                                <p className="text-base font-black text-charcoal leading-none tracking-tighter">₱{payout.toLocaleString()}</p>
                                <p className="text-[9px] text-slate uppercase font-black tracking-[0.2em] mt-1 opacity-50">Studio Fee</p>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-border-grey/30 space-y-5">
                            <div
                                className="flex items-center gap-2.5 cursor-pointer group/client"
                                onClick={() => setSelectedClient(booking.client)}
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-off-white shrink-0 border border-white shadow-tight ring-1 ring-border-grey/10 group-hover/client:scale-110 transition-transform duration-500">
                                    <Avatar 
                                        src={booking.client?.avatar_url} 
                                        fallbackName={booking.client?.full_name} 
                                        size={32} 
                                    />

                                </div>
                                <div className="text-[11px] text-slate font-bold tracking-wide break-words flex items-center gap-3 group/client">
                                    <div className="flex-1">
                                        Client: <span className="font-black text-charcoal">{booking.client?.full_name || 'N/A'}</span>
                                    </div>
                                    {booking.client_id && (
                                        <StudioChatButton
                                            bookingId={booking.id}
                                            currentUserId={currentUserId}
                                            partnerId={booking.client_id}
                                            partnerName={booking.client?.full_name || 'Client'}
                                            label="CHAT WITH CLIENT"
                                            variant="antigravity"
                                            iconType="client"
                                            className="!h-7 !px-2.5 opacity-60 hover:opacity-100"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col @[300px]:flex-row @[300px]:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 bg-off-white/50 px-3 py-1.5 rounded-full border border-border-grey/20 w-fit">
                                    <Box className="w-4 h-4 text-forest opacity-50" />
                                    <span className="text-[10px] sm:text-xs font-black text-charcoal uppercase tracking-wider">
                                        {qty} x {equipment}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 self-end @[300px]:self-auto">
                                    <span className={clsx(
                                        "status-pill-earth px-2.5 py-1 flex items-center gap-1.5 text-[10px] sm:text-xs",
                                        ['approved', 'completed'].includes(booking.status?.toLowerCase())
                                            ? "status-pill-green shadow-tight"
                                            : "status-pill-yellow shadow-tight"
                                    )}>
                                        <div className={clsx("w-1 h-1 rounded-full", ['approved', 'completed'].includes(booking.status?.toLowerCase()) ? "bg-green-500" : "bg-yellow-500")} />
                                        {['approved', 'completed'].includes(booking.status?.toLowerCase()) ? 'Confirmed' : 'Pending'}
                                    </span>
                                    <div className="flex gap-1.5 items-center">
                                        <button
                                            onClick={() => setCancellingBooking(booking)}
                                            className="w-8 h-8 bg-white text-red-600 border border-border-grey/50 rounded-full hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-tight active:scale-90"
                                            title="Cancel Booking"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                        <StudioChatButton
                                            bookingId={booking.id}
                                            currentUserId={currentUserId}
                                            partnerId={booking.instructor_id}
                                            partnerName={booking.instructor?.full_name || 'Instructor'}
                                            label=""
                                            iconType="instructor"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Subtle background highlight */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-forest/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
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
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-charcoal/50 hover:text-charcoal transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-4 mb-8 text-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-cloud scale-110">
                                <Avatar 
                                    src={selectedClient.avatar_url} 
                                    fallbackName={selectedClient.full_name} 
                                    size={96} 
                                />

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
