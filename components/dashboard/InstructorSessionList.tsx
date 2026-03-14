'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, MapPin, Box, X, AlertCircle, Clock, Navigation } from 'lucide-react'
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
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [reviewTarget, setReviewTarget] = useState<{
        booking: any,
        revieweeId: string,
        revieweeName: string
    } | null>(null)

    // Implement scroll lock
    useEffect(() => {
        if (selectedClient || cancellingBooking || reviewTarget) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedClient, cancellingBooking, reviewTarget]);

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }
        const result = await cancelBookingByInstructor(cancellingBooking.id, reason)
        return result
    }

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v

    const getSlotDateTime = (date: string, time: string) => {
        if (!date || !time) return new Date(0)
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

    const getSlotEndDateTime = (date: string, time: string) => {
        if (!date || !time) return new Date(0)
        return new Date(`${date}T${time}+08:00`)
    }

    const now = new Date()

    // 1. Filter ALL bookings based on local state
    const filteredBookings = useMemo(() => bookings.filter((b: any) => {
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
    }), [bookings, filters]);

    // 2. Split filtered bookings into active/past
    // "Active" includes anything today (even if started) or in the future that is approved
    const activeBookings = useMemo(() => filteredBookings.filter((b: any) => {
        const slot = getFirst(b.slots)
        if (!slot) return false
        const endDateTime = getSlotEndDateTime(slot.date, slot.end_time || slot.start_time)
        return b.status === 'approved' && endDateTime > now
    }), [filteredBookings, now]);

    const historicalBookings = useMemo(() => filteredBookings.filter((b: any) => {
        const slot = getFirst(b.slots)
        if (!slot) return false
        const endDateTime = getSlotEndDateTime(slot.date, slot.end_time || slot.start_time)
        return (b.status !== 'approved' || endDateTime <= now)
    }), [filteredBookings, now]);

    return (
        <div className="space-y-12 sm:space-y-20">
            <div className="sm:earth-card sm:p-4 w-full sm:w-auto sm:inline-block bg-transparent sm:bg-white overflow-visible">
                <BookingFilter onFilterChange={setFilters} />
            </div>

            {/* Active Sessions List */}
            <section>
                <div className="px-6 sm:px-0 flex items-center justify-between mb-8 sm:mb-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Calendar className="w-5 h-5 sm:w-6 h-6 text-forest" />
                        <h2 className="text-2xl sm:text-3xl font-serif text-charcoal tracking-tighter">My Sessions</h2>
                    </div>
                    <div className="text-[8px] sm:text-[9px] font-black text-charcoal/20 uppercase tracking-[0.4em]">{activeBookings.length} SESSIONS FOUND</div>
                </div>

                {activeBookings.length === 0 ? (
                    <div className="min-h-[80px] py-4 flex items-center justify-center text-center earth-card border-dashed bg-off-white mx-6 sm:mx-0">
                        <p className="text-[10px] font-black text-slate uppercase tracking-[0.4em]">No active sessions found.</p>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {activeBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="earth-card p-4 sm:p-6 border border-border-grey bg-white hover:bg-off-white transition-all duration-300 shadow-tight group relative mx-4 sm:mx-0">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        {/* Date Block */}
                                        <div className="flex flex-col items-center justify-center bg-forest/5 rounded-lg w-12 sm:w-16 shrink-0 py-1.5 sm:py-2 border border-forest/10">
                                            <span className="text-[7px] sm:text-[9px] font-black text-forest uppercase tracking-widest leading-none mb-0.5 sm:mb-1">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                            </span>
                                            <span className="text-sm sm:text-lg font-serif text-charcoal leading-none">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { day: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Consolidated Session Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-black uppercase text-charcoal/60 tracking-widest flex-wrap">
                                                <span>{getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                <span className="text-charcoal/20">•</span>
                                                <Link href={`/studios/${studio?.id}`} className="text-sm font-bold text-charcoal/90 truncate hover:text-charcoal transition-colors">
                                                    {studio?.name || "Studio"}
                                                </Link>
                                                {studio?.location && (
                                                    <>
                                                        <span className="text-charcoal/20 hidden sm:inline">•</span>
                                                        <span className="text-[9px] sm:text-[10px] font-black text-slate uppercase tracking-wider truncate hidden sm:inline">
                                                            {studio.location}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {client && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <button onClick={() => setSelectedClient(client)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0">
                                                        <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-border-grey shrink-0 object-cover" />
                                                        <span className="text-sm font-bold text-charcoal/90 truncate">{client.full_name}</span>
                                                    </button>
                                                    
                                                    {client.medical_conditions && (
                                                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[6px] sm:text-[7px] font-black uppercase rounded border border-red-200 animate-pulse flex items-center gap-1 tracking-widest shrink-0">
                                                            <AlertCircle className="w-2.5 h-2.5" /> <span className="hidden sm:inline">MED</span>
                                                        </span>
                                                    )}

                                                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap hidden sm:inline-block">
                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                            ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                            : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons Right-Aligned */}
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-center gap-1.5 shrink-0 ml-auto pl-2">
                                            {booking.status === 'approved' && getSlotDateTime(slot?.date, slot?.start_time) > now && (
                                                <button
                                                    onClick={() => setCancellingBooking(booking)}
                                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-off-white text-red-600 border border-border-grey rounded-full hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-tight"
                                                    title="Cancel Session"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {client && client.id !== currentUserId && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={client.id} partnerName={client.full_name || 'Client'} label="CHAT" variant="antigravity" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile Equipment Tag (if hidden above) & Location */}
                                    <div className="mt-3 pt-3 border-t border-border-grey flex items-center justify-between gap-2.5 sm:hidden">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="w-3 h-3 text-forest shrink-0" />
                                            <span className="text-[9px] font-black text-slate uppercase tracking-wider truncate">{studio?.location || "N/A"}</span>
                                            
                                            {booking.status === 'approved' && (
                                                <a
                                                    href={studio?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((studio?.name || "") + " " + (studio?.location || ""))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-2 text-[8px] font-black text-forest uppercase tracking-widest hover:underline whitespace-nowrap flex items-center gap-0.5"
                                                >
                                                    <Navigation className="w-2.5 h-2.5" /> Map
                                                </a>
                                            )}
                                        </div>

                                        {client && (
                                            <span className="sm:hidden text-[7.5px] shrink-0 font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap">
                                                {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                    ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                    : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Past Sessions List */}
            {historicalBookings.length > 0 && (
                <section>
                    <div className="px-6 sm:px-0 flex items-center justify-between mb-6 sm:mb-10">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <Clock className="w-5 h-5 sm:w-6 h-6 text-charcoal/40" />
                            <h2 className="text-xl sm:text-3xl font-serif text-charcoal/80 tracking-tighter">Past Sessions</h2>
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        {historicalBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="glass-card p-4 sm:p-6 border border-white/60 bg-white/20 hover:bg-white/40 transition-all duration-700 shadow-sm group relative mx-4 sm:mx-0">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        {/* Date Block */}
                                        <div className="flex flex-col items-center justify-center bg-charcoal/5 rounded-lg w-12 sm:w-16 shrink-0 py-1.5 sm:py-2 border border-charcoal/10">
                                            <span className="text-[7px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                            </span>
                                            <span className="text-sm sm:text-lg font-serif text-charcoal/80 leading-none">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { day: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Consolidated Session Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5">
                                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-black uppercase text-charcoal/60 tracking-widest flex-wrap">
                                                <span>{getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                <span className="text-charcoal/20">•</span>
                                                <Link href={`/studios/${studio?.id}`} className="text-sm font-bold text-charcoal/90 truncate hover:text-charcoal transition-colors">
                                                    {studio?.name || "Studio"}
                                                </Link>
                                                {studio?.location && (
                                                    <>
                                                        <span className="text-charcoal/20 hidden sm:inline">•</span>
                                                        <span className="text-[9px] sm:text-[10px] font-black text-charcoal/60 uppercase tracking-wider truncate hidden sm:inline">
                                                            {studio.location}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {client && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white shrink-0 object-cover opacity-80" />
                                                    <span className="text-sm font-bold text-charcoal/90 truncate">{client.full_name}</span>

                                                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap hidden sm:inline-block">
                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                            ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                            : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons Right-Aligned */}
                                        <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 ml-auto pl-2">
                                            {booking.price_breakdown?.instructor_fee && (
                                                <div className="px-2 sm:px-3 py-1 bg-forest/5 border border-forest/10 rounded flex items-center gap-1.5">
                                                    <span className="text-[7px] sm:text-[8px] font-black text-forest/50 uppercase tracking-widest hidden sm:inline-block">Earned</span>
                                                    <span className="text-[10px] sm:text-[12px] font-black text-forest tracking-tighter">₱{booking.price_breakdown.instructor_fee.toLocaleString()}</span>
                                                </div>
                                            )}
                                            
                                            {booking.status === 'completed' && (
                                                !booking.instructor_reviewed_studio ? (
                                                    <button
                                                        onClick={() => setReviewTarget({
                                                            booking,
                                                            revieweeId: studio?.owner_id || '',
                                                            revieweeName: studio?.name || 'Studio'
                                                        })}
                                                        className="h-7 sm:h-8 bg-charcoal text-white px-3 sm:px-4 rounded text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest hover:brightness-[1.2] transition-all shadow-sm active:scale-95"
                                                    >
                                                        LEAVE FEEDBACK
                                                    </button>
                                                ) : (
                                                    <span className="text-[7.5px] sm:text-[8px] text-sage font-black uppercase tracking-widest bg-sage/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded border border-sage/10 hidden sm:inline-block">SUBMITTED</span>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile Equipment Tag (if hidden above) & Location */}
                                    <div className="mt-3 pt-3 border-t border-white/60 flex items-center justify-between gap-2.5 sm:hidden">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="w-3 h-3 text-charcoal/40 shrink-0" />
                                            <span className="text-[9px] sm:text-[10px] font-black text-charcoal/50 uppercase tracking-wider truncate">{studio?.location || "N/A"}</span>
                                        </div>

                                        {client && (
                                            <span className="sm:hidden text-[7.5px] shrink-0 font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap">
                                                {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                    ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                    : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                            </span>
                                        )}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter mb-2">{selectedClient.full_name}</h3>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em]">{selectedClient.email}</p>
                                {selectedClient.date_of_birth && (
                                    <div className="inline-block px-3 py-1 bg-forest/5 rounded-full border border-forest/10 mt-2">
                                        <p className="text-[9px] font-black text-forest uppercase tracking-[0.2em]">{calculateAge(selectedClient.date_of_birth)} YEARS OLD</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedClient.bio && (
                            <div className="bg-white/40 p-6 rounded-[2rem] border border-white/60 mb-6 relative z-10">
                                <h4 className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-3">BIO</h4>
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
                                    <div className="bg-red-50 p-8 rounded-lg border border-red-200 relative z-10">
                                        <h4 className="text-[10px] font-black text-red-800 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4" /> PHYSICAL CONDITIONS
                                        </h4>
                                        <p className="text-[11px] text-red-900 font-black uppercase tracking-[0.2em] leading-relaxed">{displayConditions}</p>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 p-8 rounded-lg border border-green-200 relative z-10">
                                        <h4 className="text-[10px] font-black text-forest uppercase tracking-[0.4em] mb-2">HEALTH STATUS</h4>
                                        <p className="text-[10px] text-forest/40 uppercase tracking-[0.2em] italic">No reported conditions.</p>
                                    </div>
                                );
                            })()}
                        </div>

                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full py-6 bg-charcoal text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95"
                        >
                            CLOSE
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
