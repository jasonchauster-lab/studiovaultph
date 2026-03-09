'use client'

import { useState } from 'react'
import { Calendar, MapPin, Box, X, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import ReviewModal from '@/components/reviews/ReviewModal'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import CancelBookingModal from './CancelBookingModal'
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions'

interface InstructorSessionListProps {
    bookings: any[]
    currentUserId: string
}

export default function InstructorSessionList({ bookings, currentUserId }: InstructorSessionListProps) {
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        dateRange: { from: null, to: null }
    })
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [reviewTarget, setReviewTarget] = useState<{
        booking: any,
        revieweeId: string,
        revieweeName: string
    } | null>(null)

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }
        const result = await cancelBookingByInstructor(cancellingBooking.id, reason)
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
    const filteredBookings = bookings.filter((b) => {
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
    const upcomingBookings = filteredBookings.filter(b => {
        const slot = getFirst(b.slots)
        if (!slot) return false
        return b.status === 'approved' && getSlotDateTime(slot.date, slot.start_time) > now
    })

    const pastBookings = filteredBookings.filter(b => {
        const slot = getFirst(b.slots)
        if (!slot) return false
        return (b.status === 'completed' || b.status === 'cancelled_refunded' || b.status === 'cancelled_charged' || (b.status === 'approved' && getSlotDateTime(slot.date, slot.start_time) <= now))
    })

    return (
        <div className="space-y-20">
            <div className="glass-card p-4 inline-block bg-white/20">
                <BookingFilter onFilterChange={setFilters} />
            </div>

            {/* Upcoming List */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <Calendar className="w-6 h-6 text-gold" />
                        <h2 className="text-3xl font-serif text-charcoal tracking-tighter">Upcoming Sessions</h2>
                    </div>
                    <div className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.4em]">{upcomingBookings.length} SESSIONS DETECTED</div>
                </div>

                {upcomingBookings.length === 0 ? (
                    <div className="py-24 text-center glass-card border-dashed bg-white/20">
                        <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em]">No upcoming sessions in the matrix.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {upcomingBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="glass-card p-8 border border-white/60 bg-white/40 hover:bg-white transition-all duration-700 shadow-sm group">
                                    <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                                        <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <Link href={`/studios/${studio?.id}`} className="w-16 h-16 rounded-[20px] overflow-hidden border border-white bg-white shadow-sm shrink-0 hover:scale-105 transition-transform duration-700">
                                                <img
                                                    src={studio?.logo_url || "/logo.png"}
                                                    alt={studio?.name || "Studio"}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link href={`/studios/${studio?.id}`} className="text-[11px] font-black text-charcoal uppercase tracking-[0.2em] hover:text-gold transition-colors">
                                                        {studio?.name || "Studio"}
                                                    </Link>
                                                    <span className={clsx(
                                                        "px-3 py-1 text-[8px] font-black uppercase rounded-md tracking-[0.2em] border shrink-0 shadow-sm",
                                                        booking.status === 'approved' ? "bg-sage/10 text-sage border-sage/20" :
                                                            "bg-red-50/50 text-red-500 border-red-100"
                                                    )}>
                                                        {booking.status === 'approved' ? 'CONFIRMED' : 'CANCELLED'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-gold" />
                                                    <span className="text-[10px] text-charcoal/40 font-black uppercase tracking-[0.2em] truncate">
                                                        {studio?.location || "LOCATION UNKNOWN"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 bg-white/40 p-6 rounded-[2rem] border border-white/60 min-w-[180px] shadow-sm group-hover:bg-white transition-all duration-700">
                                            <p className="text-xl font-serif text-charcoal tracking-tighter leading-tight">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] text-gold font-black mt-2 flex items-center justify-end gap-2 uppercase tracking-[0.2em]">
                                                <Clock className="w-3.5 h-3.5" />
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </p>
                                        </div>
                                    </div>

                                    {client && client.id !== currentUserId && (
                                        <div className="mt-8 pt-8 border-t border-white/60">
                                            <button
                                                onClick={() => setSelectedClient(client)}
                                                className="flex items-center gap-4 group/student transition-all hover:-translate-y-0.5"
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 group-hover/student:scale-110 transition-transform duration-700">
                                                    <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="text-[9px] text-charcoal/20 font-black uppercase tracking-[0.3em] mb-0.5">Primary Participant</span>
                                                    <span className="text-[11px] font-black text-charcoal uppercase tracking-[0.2em] group-hover/student:text-gold transition-colors">{client.full_name || 'N/A'}</span>
                                                </div>
                                                {client.medical_conditions && (
                                                    <span className="ml-4 px-3 py-1 bg-red-50/50 text-red-500 text-[8px] font-black uppercase rounded-full border border-red-100 animate-pulse flex items-center gap-1.5 tracking-widest shadow-sm">
                                                        <AlertCircle className="w-3 h-3" />
                                                        CRITICAL MEDICAL STATUS
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 pt-8 border-t border-white/60 gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-gold" />
                                                <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">
                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                        ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {booking.status === 'approved' && getSlotDateTime(slot?.date, slot?.start_time) > now && (
                                                <button
                                                    onClick={() => setCancellingBooking(booking)}
                                                    className="w-10 h-10 bg-white/40 text-red-300 border border-white/60 rounded-full hover:bg-red-500 hover:text-white transition-all duration-500 flex items-center justify-center shadow-sm"
                                                    title="Cancel Session"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                            {client && client.id !== currentUserId && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={client.id} partnerName={client.full_name || 'Client'} label="MESSAGE CLIENT" variant="antigravity" />
                                            )}
                                            {studio && studio.owner_id && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={studio.owner_id} partnerName={studio.name || 'Studio'} label="MESSAGE STUDIO" variant="antigravity-gold" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Past Sessions List */}
            {pastBookings.length > 0 && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <Clock className="w-6 h-6 text-charcoal/20" />
                            <h2 className="text-3xl font-serif text-charcoal/60 tracking-tighter">Temporal History</h2>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {pastBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="glass-card p-8 border border-white/60 bg-white/20 hover:bg-white/40 transition-all duration-700 shadow-sm opacity-60 hover:opacity-100">
                                    <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                                        <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <Link href={`/studios/${studio?.id}`} className="w-16 h-16 rounded-[20px] overflow-hidden border border-white bg-white/40 shadow-sm shrink-0 grayscale group-hover:grayscale-0 transition-all duration-700">
                                                <img
                                                    src={studio?.logo_url || "/logo.png"}
                                                    alt={studio?.name || "Studio"}
                                                    className="w-full h-full object-cover"
                                                />
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Link href={`/studios/${studio?.id}`} className="text-[11px] font-black text-charcoal/40 uppercase tracking-[0.2em]">
                                                        {studio?.name || "Studio"}
                                                    </Link>
                                                    <span className={clsx(
                                                        'px-3 py-1 text-[8px] font-black uppercase rounded-md tracking-[0.2em] border shrink-0',
                                                        booking.status === 'completed'
                                                            ? (booking.funds_unlocked ? 'bg-sage/10 text-sage border-sage/20 shadow-sm' : 'bg-gold/10 text-gold border-gold/20 shadow-sm') :
                                                            booking.status === 'approved' ? 'bg-white/40 text-charcoal/40 border-white/60' :
                                                                'bg-charcoal/5 text-charcoal/20 border-white/60'
                                                    )}>
                                                        {['completed', 'approved'].includes(booking.status)
                                                            ? (booking.status === 'completed'
                                                                ? (booking.funds_unlocked ? 'TOTAL LIQUIDITY UNLOCKED' : 'VALUATION PENALTY HOLD')
                                                                : 'APPROVED')
                                                            : 'CANCELLED'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3 text-charcoal/20" />
                                                    <span className="text-[10px] text-charcoal/20 font-black uppercase tracking-[0.2em] truncate">
                                                        {studio?.location || "N/A"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0 bg-white/20 p-6 rounded-[2rem] border border-white/60 min-w-[180px]">
                                            <p className="text-xl font-serif text-charcoal/40 tracking-tighter leading-tight">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] text-charcoal/20 font-black mt-2 flex items-center justify-end gap-2 uppercase tracking-[0.2em]">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 pt-8 border-t border-white/60 gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-charcoal/20" />
                                                <span className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.2em]">
                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                        ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                </span>
                                            </div>
                                            {client && (
                                                <div className="flex items-center gap-3">
                                                    <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-6 h-6 rounded-full grayscale opacity-50" />
                                                    <span className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.2em]">{client.full_name}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {booking.status === 'completed' && (
                                                <div className="flex items-center gap-3">
                                                    {!booking.instructor_reviewed_studio ? (
                                                        <button
                                                            onClick={() => setReviewTarget({
                                                                booking,
                                                                revieweeId: studio?.owner_id || '',
                                                                revieweeName: studio?.name || 'Studio'
                                                            })}
                                                            className="h-10 bg-charcoal text-white px-6 rounded-full text-[9px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95"
                                                        >
                                                            LEAVE FEEDBACK
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] text-sage font-black uppercase tracking-[0.3em] bg-sage/5 px-4 py-2 rounded-full border border-sage/20">FEEDBACK SUBMITTED</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            <CancelBookingModal
                isOpen={!!cancellingBooking}
                onClose={() => setCancellingBooking(null)}
                onConfirm={handleCancelConfirm}
                title="Protocol Termination"
                description="Initiating session cancellation. Studio and participant nodes will be synchronised."
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
                            return `LATE TERMINATION PENALTY: ₱${studioFee.toLocaleString()} will be liquidated from your vault to reconcile the studio allocation.`
                        }
                        return null
                    })() || undefined
                }
            />

            {/* Client Detail Modal overhaul */}
            {selectedClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-xl animate-in fade-in duration-700" onClick={() => setSelectedClient(null)}>
                    <div className="glass-card w-full max-w-sm overflow-hidden p-10 relative animate-in zoom-in-95 duration-700 shadow-cloud rounded-[3rem]" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-white shadow-cloud relative z-10">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter mb-2">{selectedClient.full_name}</h3>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.3em]">{selectedClient.email}</p>
                                {selectedClient.date_of_birth && (
                                    <div className="inline-block px-3 py-1 bg-gold/5 rounded-full border border-gold/10 mt-2">
                                        <p className="text-[9px] font-black text-gold uppercase tracking-[0.2em]">{calculateAge(selectedClient.date_of_birth)} YEARS OLD</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedClient.bio && (
                            <div className="bg-white/40 p-6 rounded-[2rem] border border-white/60 mb-6 relative z-10">
                                <h4 className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-3">MANIFESTO</h4>
                                <p className="text-[11px] text-charcoal/60 leading-relaxed italic uppercase tracking-wider">"{selectedClient.bio}"</p>
                            </div>
                        )}

                        <div className="mb-8">
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
                                    <div className="bg-red-50/20 p-8 rounded-[2rem] border border-red-100/50 relative z-10">
                                        <h4 className="text-[10px] font-black text-red-800 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4" /> BIOLOGICAL CONSTRAINTS
                                        </h4>
                                        <p className="text-[11px] text-red-700/80 font-black uppercase tracking-[0.2em] leading-relaxed">{displayConditions}</p>
                                    </div>
                                ) : (
                                    <div className="bg-white/40 p-8 rounded-[2rem] border border-white/60 relative z-10">
                                        <h4 className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-2">HEALTH STATUS</h4>
                                        <p className="text-[10px] text-charcoal/40 uppercase tracking-[0.2em] italic">No reported anomalies.</p>
                                    </div>
                                );
                            })()}
                        </div>

                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full py-6 bg-charcoal text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95"
                        >
                            CLOSE MANIFEST
                        </button>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewTarget && (
                <ReviewModal
                    booking={reviewTarget.booking}
                    currentUserId={currentUserId}
                    isInstructor={true}
                    revieweeId={reviewTarget.revieweeId}
                    revieweeName={reviewTarget.revieweeName}
                    reviewContext="Studio"
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
