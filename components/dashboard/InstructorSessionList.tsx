'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, MapPin, Box, X, AlertCircle, Clock, Navigation, Star, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import ReviewModal from '@/components/reviews/ReviewModal'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import CancelBookingModal from './CancelBookingModal'
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions'
import { getStudioProfile } from '@/app/(dashboard)/instructors/actions'

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
    const [selectedStudio, setSelectedStudio] = useState<any>(null)
    const [studioDetails, setStudioDetails] = useState<any>(null)
    const [loadingStudio, setLoadingStudio] = useState(false)
    const [resetKey, setResetKey] = useState(0)

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
    const [reviewTarget, setReviewTarget] = useState<{
        booking: any,
        revieweeId: string,
        revieweeName: string
    } | null>(null)

    // Implement scroll lock
    useEffect(() => {
        if (selectedClient || cancellingBooking || reviewTarget || selectedStudio) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedClient, cancellingBooking, reviewTarget, selectedStudio]);

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
        <div className="space-y-16 sm:space-y-24 pb-32">
            <div className="sm:earth-card sm:p-4 w-full sm:w-auto sm:inline-block bg-transparent sm:bg-white overflow-visible mb-6">
                <BookingFilter key={resetKey} onFilterChange={setFilters} />
            </div>

            {/* Active Sessions List */}
            <section>
                <div className="px-6 sm:px-0 flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-2">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Calendar className="w-5 h-5 sm:w-6 h-6 text-forest shrink-0" />
                        <div className="flex flex-col">
                            <h2 className="text-2xl sm:text-3xl font-serif text-charcoal tracking-tighter leading-none">My Sessions</h2>
                            <div className="text-[8px] sm:text-[9px] font-black text-[#43302E]/40 uppercase tracking-[0.3em] mt-1.5">{activeBookings.length} SESSIONS FOUND</div>
                        </div>
                    </div>
                </div>

                {activeBookings.length === 0 ? (
                    <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-border-grey/50 mx-6 sm:mx-0 px-6 shadow-tight relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-forest/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gold/5 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl pointer-events-none" />
                        
                        <div className="w-14 h-14 bg-charcoal/5 rounded-full flex items-center justify-center mb-6 relative">
                            <Calendar className="w-6 h-6 text-charcoal/30" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-serif text-charcoal mb-2 tracking-tight">No sessions found for this period.</h3>
                        <p className="text-[11px] sm:text-xs text-charcoal/50 max-w-[280px] mb-8 leading-relaxed font-bold">Try adjusting your filters or find a studio to book a new availability slot.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full sm:w-auto">
                            {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                <button 
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="w-full sm:w-auto px-8 py-3 bg-charcoal text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-125 transition-all shadow-md active:scale-95"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                href="/instructors"
                                className="w-full sm:w-auto px-8 py-3 bg-forest text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-md active:scale-95 text-center"
                            >
                                Find a Studio / Add Slot
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {activeBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="earth-card p-4 pb-6 sm:p-6 sm:pb-8 border border-border-grey bg-white hover:bg-off-white transition-all duration-300 shadow-tight group relative mx-4 sm:mx-0">
                                    {/* Row 1: Date & Time Header (Mobile) */}
                                    <div className="flex items-center gap-2 mb-3 sm:hidden">
                                        <div className="flex items-center gap-2 px-2 py-1 bg-forest/5 rounded border border-forest/10 w-full">
                                            <Calendar className="w-3 h-3 text-forest/40" />
                                            <span className="text-[10px] font-black text-forest/80 uppercase tracking-widest">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                <span className="mx-2 text-forest/20">•</span>
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                            {/* Date Block (Desktop Only) */}
                                            <div className="hidden sm:flex flex-col items-center justify-center bg-forest/5 rounded-lg w-16 shrink-0 py-2 border border-forest/10">
                                                <span className="text-[9px] font-black text-forest uppercase tracking-widest leading-none mb-1">
                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                                </span>
                                                <span className="text-lg font-serif text-charcoal leading-none">
                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { day: 'numeric' })}
                                                </span>
                                            </div>

                                            {/* Consolidated Session Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5">
                                                {/* Desktop Session Header */}
                                                <div className="hidden sm:flex items-center gap-2 text-[11px] font-black uppercase text-charcoal/60 tracking-widest flex-wrap">
                                                    <span>{getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                    <span className="text-charcoal/20">•</span>
                                                    <button onClick={() => handleStudioClick(studio)} className="text-sm font-bold text-charcoal/90 truncate hover:text-charcoal transition-colors hover:underline underline-offset-2">
                                                        {studio?.name || "Studio"}
                                                    </button>
                                                    {studio?.location && (
                                                        <>
                                                            <span className="text-charcoal/20">•</span>
                                                            <span className="text-[10px] font-black text-slate uppercase tracking-wider truncate">
                                                                {studio.location}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Mobile Session Info (Vertical Stack) */}
                                                <div className="flex flex-col gap-1 sm:hidden text-left">
                                                    <button onClick={() => handleStudioClick(studio)} className="text-sm font-bold text-charcoal/90 text-left hover:text-charcoal transition-colors">
                                                        {studio?.name || "Studio"}
                                                    </button>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3 h-3 text-forest" />
                                                        <span className="text-[9px] font-black text-charcoal/70 uppercase tracking-wider">{studio?.location || "N/A"}</span>
                                                    </div>
                                                </div>
                                                
                                                {client && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 sm:mt-0.5">
                                                        <button onClick={() => setSelectedClient(client)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0">
                                                            <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="hidden sm:block w-6 h-6 rounded-full border border-border-grey shrink-0 object-cover" />
                                                            <span className="text-sm font-bold text-charcoal sm:truncate">{client.full_name}</span>
                                                        </button>
                                                        
                                                        <div className="flex items-center gap-2">
                                                            {client.medical_conditions && (
                                                                <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[6.5px] sm:text-[7px] font-black uppercase rounded border border-red-200 animate-pulse flex items-center gap-1 tracking-widest shrink-0">
                                                                    <AlertCircle className="w-2.5 h-2.5" /> <span className="hidden sm:inline">MED</span>
                                                                </span>
                                                            )}

                                                            <span className="hidden sm:inline-block text-[8.5px] font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap">
                                                                {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                                    ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                                    : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons (Desktop Only) */}
                                            <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-auto pl-2">
                                                {booking.status === 'approved' && getSlotDateTime(slot?.date, slot?.start_time) > now && (
                                                    <button
                                                        onClick={() => setCancellingBooking(booking)}
                                                        className="w-8 h-8 bg-off-white text-red-600 border border-border-grey rounded-full hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-tight"
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

                                        {/* Row 3: Actions & Tags (Mobile) */}
                                        <div className="flex sm:hidden items-center justify-between pt-3 mt-1 border-t border-border-grey">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7.5px] font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap">
                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                        ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {booking.status === 'approved' && getSlotDateTime(slot?.date, slot?.start_time) > now && (
                                                    <button
                                                        onClick={() => setCancellingBooking(booking)}
                                                        className="h-7 px-3 bg-off-white text-red-600 border border-border-grey rounded text-[7.5px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-tight"
                                                    >
                                                        CANCEL
                                                    </button>
                                                )}
                                                {client && client.id !== currentUserId && (
                                                    <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={client.id} partnerName={client.full_name || 'Client'} label="CHAT" variant="antigravity" />
                                                )}
                                            </div>
                                        </div>
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
                                <div key={booking.id} className="glass-card p-4 pb-6 sm:p-6 sm:pb-8 border border-white/60 bg-white/20 hover:bg-white/40 transition-all duration-700 shadow-sm group relative mx-4 sm:mx-0">
                                    {/* Row 1: Date & Time Header (Mobile) */}
                                    <div className="flex items-center gap-2 mb-3 sm:hidden">
                                        <div className="flex items-center gap-2 px-2 py-1 bg-charcoal/5 rounded border border-charcoal/10 w-full">
                                            <Calendar className="w-3 h-3 text-charcoal/40" />
                                            <span className="text-[10px] font-black text-charcoal/80 uppercase tracking-widest">
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                <span className="mx-2 text-charcoal/20">•</span>
                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                            {/* Date Block (Desktop Only) */}
                                            <div className="hidden sm:flex flex-col items-center justify-center bg-charcoal/5 rounded-lg w-16 shrink-0 py-2 border border-charcoal/10">
                                                <span className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest leading-none mb-1">
                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                                </span>
                                                <span className="text-lg font-serif text-charcoal/80 leading-none">
                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { day: 'numeric' })}
                                                </span>
                                            </div>

                                            {/* Consolidated Session Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5">
                                                {/* Desktop Session Header */}
                                                <div className="hidden sm:flex items-center gap-2 text-[11px] font-black uppercase text-charcoal/60 tracking-widest flex-wrap">
                                                    <span>{getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                    <span className="text-charcoal/20">•</span>
                                                    <button onClick={() => handleStudioClick(studio)} className="text-sm font-bold text-charcoal/90 truncate hover:text-charcoal transition-colors hover:underline underline-offset-2">
                                                        {studio?.name || "Studio"}
                                                    </button>
                                                    {studio?.location && (
                                                        <>
                                                            <span className="text-charcoal/20">•</span>
                                                            <span className="text-[10px] font-black text-charcoal/60 uppercase tracking-wider truncate">
                                                                {studio.location}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Mobile Session Info (Vertical Stack) */}
                                                <div className="flex flex-col gap-1 sm:hidden">
                                                    <button onClick={() => handleStudioClick(studio)} className="text-sm font-bold text-charcoal/90 text-left hover:text-charcoal transition-colors">
                                                        {studio?.name || "Studio"}
                                                    </button>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3 h-3 text-charcoal/40" />
                                                        <span className="text-[9px] font-black text-charcoal/80 uppercase tracking-wider">{studio?.location || "N/A"}</span>
                                                    </div>
                                                </div>
                                                
                                                {client && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 sm:mt-0.5">
                                                        <button onClick={() => setSelectedClient(client)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity min-w-0">
                                                            <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="hidden sm:block w-6 h-6 rounded-full border border-white shrink-0 object-cover opacity-80" />
                                                            <span className="text-sm font-bold text-charcoal sm:truncate">{client.full_name}</span>
                                                        </button>

                                                        <span className="hidden sm:inline-block text-[8.5px] font-black text-charcoal/50 uppercase tracking-widest bg-charcoal/5 px-1.5 py-0.5 rounded border border-charcoal/10 whitespace-nowrap">
                                                            {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                                ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                                : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons (Desktop Only) */}
                                            <div className="hidden sm:flex flex-col items-end justify-center gap-1.5 shrink-0 ml-auto pl-2">
                                                {booking.price_breakdown?.instructor_fee && (
                                                    <div className="px-3 py-1 bg-forest/5 border border-forest/10 rounded flex items-center gap-1.5">
                                                        <span className="text-[8px] font-black text-forest/50 uppercase tracking-widest">Earned</span>
                                                        <span className="text-[12px] font-black text-forest tracking-tighter">₱{booking.price_breakdown.instructor_fee.toLocaleString()}</span>
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
                                                            className="h-8 bg-charcoal text-white px-4 rounded text-[8px] font-black uppercase tracking-widest hover:brightness-[1.2] transition-all shadow-sm active:scale-95"
                                                        >
                                                            LEAVE FEEDBACK
                                                        </button>
                                                    ) : (
                                                        <span className="text-[8px] text-sage font-black uppercase tracking-widest bg-sage/5 px-3 py-1.5 rounded border border-sage/10">SUBMITTED</span>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 3: Earnings & Action (Mobile) */}
                                        <div className="flex sm:hidden items-stretch justify-between gap-3 pt-4 mt-2 border-t border-white/60">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[7.5px] font-black text-charcoal/40 uppercase tracking-widest">Equip:</span>
                                                    <span className="text-[7.5px] font-bold text-charcoal/70 uppercase tracking-widest px-1.5 py-0.5 bg-charcoal/5 rounded border border-charcoal/10 whitespace-nowrap">
                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                            ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                            : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'} (${booking.quantity || 1})`)}
                                                    </span>
                                                </div>
                                                {booking.price_breakdown?.instructor_fee && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[7.5px] font-black text-forest/40 uppercase tracking-widest">Earnings:</span>
                                                        <span className="text-[9px] font-black text-forest tracking-tighter">₱{booking.price_breakdown.instructor_fee.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-end justify-end flex-1">
                                                {booking.status === 'completed' && (
                                                    !booking.instructor_reviewed_studio ? (
                                                        <button
                                                            onClick={() => setReviewTarget({
                                                                booking,
                                                                revieweeId: studio?.owner_id || '',
                                                                revieweeName: studio?.name || 'Studio'
                                                            })}
                                                            className="w-full h-8 bg-charcoal text-white px-4 rounded text-[8px] font-black uppercase tracking-widest hover:brightness-[1.2] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                                        >
                                                            LEAVE FEEDBACK
                                                        </button>
                                                    ) : (
                                                        <span className="text-[7.5px] text-sage font-black uppercase tracking-widest bg-sage/5 px-3 py-1.5 rounded border border-sage/10 whitespace-nowrap">SUBMITTED</span>
                                                    )
                                                )}
                                            </div>
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

            {/* Studio Profile Modal */}
            {selectedStudio && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => { setSelectedStudio(null); setStudioDetails(null) }}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedStudio(null); setStudioDetails(null) }} className="absolute top-4 right-4 z-10 text-charcoal/40 hover:text-charcoal transition-colors"><X className="w-5 h-5" /></button>

                        <div className="overflow-y-auto flex-1 p-6">
                            {/* Header */}
                            <div className="flex flex-col items-center mt-2 mb-5 text-center">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                    {studioDetails?.studio?.logo_url || selectedStudio?.logo_url ? (
                                        <img src={studioDetails?.studio?.logo_url || selectedStudio.logo_url} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-charcoal/5 text-charcoal/20 text-2xl font-serif">
                                            {(studioDetails?.studio?.name || selectedStudio.name || 'S')[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    <h3 className="text-xl font-serif text-charcoal">{selectedStudio.name}</h3>
                                    {studioDetails?.studio?.verified && (
                                        <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                                    )}
                                </div>
                                {(studioDetails?.studio?.location || selectedStudio.location) && (
                                    <p className="text-xs text-charcoal/50 mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {studioDetails?.studio?.location || selectedStudio.location}
                                    </p>
                                )}
                                {!loadingStudio && studioDetails && (
                                    <div className="flex items-center gap-1 mt-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(studioDetails.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-charcoal/20'}`} />
                                        ))}
                                        {studioDetails.totalCount > 0 && (
                                            <span className="text-xs text-charcoal/40 ml-1">({studioDetails.totalCount})</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {loadingStudio && (
                                <div className="flex items-center justify-center py-8 text-charcoal/40 text-sm">Loading studio info...</div>
                            )}

                            {!loadingStudio && studioDetails && (
                                <>
                                    {studioDetails.studio?.bio && (
                                        <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50 mb-3">
                                            <h4 className="text-sm font-bold text-charcoal/70 mb-1">About</h4>
                                            <p className="text-sm text-charcoal/60 leading-relaxed italic">"{studioDetails.studio.bio}"</p>
                                        </div>
                                    )}

                                    {studioDetails.studio?.space_photos_urls?.length > 0 && (
                                        <div className="mb-3">
                                            <h4 className="text-sm font-bold text-charcoal/70 mb-2">The Studio</h4>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {studioDetails.studio.space_photos_urls.slice(0, 6).map((img: string, i: number) => (
                                                    <div key={i} className="aspect-square bg-cream-100 overflow-hidden rounded-lg">
                                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {studioDetails.reviews?.length > 0 && (
                                        <div className="mb-2">
                                            <h4 className="text-sm font-bold text-charcoal/70 mb-2 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400" /> Member Reviews</h4>
                                            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                                {studioDetails.reviews.slice(0, 5).map((r: any) => {
                                                    const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
                                                    return (
                                                        <div key={r.id} className="bg-cream-50 rounded-xl p-3 border border-cream-100/50">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <img
                                                                    src={reviewer?.avatar_url
                                                                        ? `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${reviewer.avatar_url}`
                                                                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230`}
                                                                    className="w-6 h-6 rounded-full object-cover border border-cream-200"
                                                                    alt=""
                                                                />
                                                                <span className="text-xs font-semibold text-charcoal/70">{reviewer?.full_name || 'Anonymous'}</span>
                                                                <div className="flex items-center gap-0.5 ml-auto">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-charcoal/20'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {r.comment && <p className="text-xs text-charcoal/50 leading-relaxed italic">"{r.comment}"</p>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {!studioDetails.reviews?.length && !studioDetails.studio?.bio && !studioDetails.studio?.space_photos_urls?.length && (
                                        <p className="text-sm text-charcoal/40 italic text-center py-4">No additional studio info available.</p>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-cream-100 flex gap-2">
                            <Link
                                href={`/studios/${selectedStudio.id}`}
                                target="_blank"
                                className="flex-1 py-2.5 text-center bg-charcoal/5 text-charcoal/70 rounded-xl font-bold text-sm hover:bg-charcoal/10 transition-colors"
                            >
                                View Full Profile
                            </Link>
                            <button
                                onClick={() => { setSelectedStudio(null); setStudioDetails(null) }}
                                className="flex-1 py-2.5 bg-charcoal text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
