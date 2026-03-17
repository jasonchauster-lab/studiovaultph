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
    }).sort((a: any, b: any) => {
        const slotA = getFirst(a.slots)
        const slotB = getFirst(b.slots)
        if (!slotA || !slotB) return 0
        const dateA = getSlotDateTime(slotA.date, slotA.start_time).getTime()
        const dateB = getSlotDateTime(slotB.date, slotB.start_time).getTime()
        return dateB - dateA // Date descending
    }), [filteredBookings, now]);

    // Grouping helper
    const groupBookingsByDate = (bookingsList: any[]) => {
        const groups: { [key: string]: any[] } = {}
        bookingsList.forEach(b => {
            const slot = getFirst(b.slots)
            if (!slot?.date) return
            if (!groups[slot.date]) groups[slot.date] = []
            groups[slot.date].push(b)
        })
        return Object.keys(groups).sort((a, b) => {
            // Sort dates based on whether they are future or past
            return new Date(a).getTime() - new Date(b).getTime()
        }).map(date => ({
            date,
            bookings: groups[date]
        }))
    }

    const activeGroups = useMemo(() => groupBookingsByDate(activeBookings), [activeBookings])
    const historicalGroups = useMemo(() => {
        // Sort historical groups by date descending
        const groups = groupBookingsByDate(historicalBookings)
        return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [historicalBookings])

    return (
        <div className="space-y-10 pb-48">
            <div className="px-4 sm:px-0">
                <div className="sm:earth-card sm:p-4 w-full sm:w-auto sm:inline-block bg-transparent sm:bg-white overflow-visible mb-6 sm:mb-8">
                    <BookingFilter key={resetKey} onFilterChange={setFilters} />
                </div>
            </div>

            {/* Active Sessions List */}
            <section>
                <div className="px-6 sm:px-0 flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-12 gap-2">
                    <div className="flex items-start gap-3 sm:gap-4 h-full">
                        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-forest/5 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-forest/10">
                            <Calendar className="w-4 h-4 sm:w-6 h-6 text-forest" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h2 className="text-xl sm:text-4xl font-serif text-charcoal tracking-tight leading-none">Upcoming Sessions</h2>
                            <div className="text-[7.5px] sm:text-[9px] font-black text-forest/60 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                <span className="w-1 h-1 bg-forest rounded-full animate-pulse" />
                                {activeBookings.length} {activeBookings.length === 1 ? 'Engagement' : 'Engagements'} Found
                            </div>
                        </div>
                    </div>
                </div>

                {activeBookings.length === 0 ? (
                    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center bg-white/50 backdrop-blur-sm rounded-[2.5rem] border border-border-grey/30 mx-4 sm:mx-0 px-6 sm:px-8 shadow-tight relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-forest/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[100px] pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gold/5 rounded-full translate-x-1/2 translate-y-1/2 blur-[100px] pointer-events-none" />
                        
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-charcoal/5 rounded-[1.75rem] sm:rounded-[2rem] flex items-center justify-center mb-6 sm:mb-8 relative border border-charcoal/5">
                            <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-charcoal/20" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-forest/10 rounded-full flex items-center justify-center animate-bounce">
                                <div className="w-1.5 h-1.5 sm:w-2 h-2 bg-forest rounded-full" />
                            </div>
                        </div>
                        <h3 className="text-xl sm:text-4xl font-serif text-charcoal mb-3 sm:mb-4 tracking-tight">No active schedule yet.</h3>
                        <p className="text-[10px] sm:text-sm text-charcoal/40 max-w-[280px] sm:max-w-[320px] mb-8 sm:mb-10 leading-relaxed font-black uppercase tracking-widest">
                            Sync your availability or find a studio node to begin your session registry.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full sm:w-auto">
                            {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                <button 
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="w-full sm:w-auto px-10 py-4 bg-white text-forest border border-forest/20 text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl hover:bg-forest/5 transition-all active:scale-95 shadow-tight"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                href="/instructor/schedule"
                                className="w-full sm:w-auto px-12 py-5 bg-forest text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl hover:brightness-110 transition-all shadow-tight active:scale-95 text-center flex items-center justify-center gap-3"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                FIND STUDIO / ADD SLOT
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {activeGroups.map((group) => (
                            <div key={group.date} className="relative">
                                {/* Date Header */}
                                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl px-4 py-3 mb-4 rounded-[1.25rem] border border-charcoal/5 flex items-center justify-between mx-4 sm:mx-0 shadow-sm ring-1 ring-charcoal/[0.02]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-forest/5 flex items-center justify-center">
                                            <Calendar className="w-3 h-3 text-forest/60" />
                                        </div>
                                        <span className="text-[9px] font-black text-charcoal uppercase tracking-[0.25em]">
                                            {new Date(group.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-forest/20" />
                                        <span className="text-[8px] font-black text-charcoal/30 uppercase tracking-[0.15em]">{group.bookings.length} {group.bookings.length === 1 ? 'Session' : 'Sessions'}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {group.bookings.map((booking: any) => {
                                        const slot = getFirst(booking.slots)
                                        const studio = getFirst(slot?.studios)
                                        const client = getFirst(booking.client)

                                        return (
                                            <div key={booking.id} className="earth-card p-3.5 sm:p-5 bg-white hover:bg-off-white transition-all duration-300 shadow-tight group relative mx-4 sm:mx-0 rounded-[1.75rem] border-l-[3px] border-l-forest overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-forest/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none group-hover:bg-forest/10 transition-colors" />
                                                
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative z-10">
                                                    {/* Time Indicator */}
                                                    <div className="flex items-center justify-between sm:justify-center sm:bg-forest/5 sm:rounded-[1.5rem] sm:w-20 sm:h-20 sm:shrink-0 sm:border sm:border-forest/10">
                                                        <div className="flex items-center gap-2.5 sm:flex-col sm:items-center sm:gap-1">
                                                            <div className="flex sm:hidden items-center justify-center w-7 h-7 rounded-lg bg-forest/10">
                                                                <Clock className="w-3 h-3 text-forest" />
                                                            </div>
                                                            <div className="flex flex-col sm:items-center">
                                                                <span className="text-[15px] sm:text-lg font-serif text-charcoal leading-none tracking-tighter">
                                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </span>
                                                                <span className="text-[7px] sm:text-[8px] font-black text-forest/60 uppercase tracking-[0.2em] mt-1 sm:mt-1">START</span>
                                                            </div>
                                                        </div>

                                                        {/* Mobile Actions - moved here for better mobile density */}
                                                        <div className="flex sm:hidden items-center gap-2 shrink-0">
                                                            {booking.status === 'approved' && getSlotDateTime(slot?.date, slot?.start_time) > now && (
                                                                <button
                                                                    onClick={() => setCancellingBooking(booking)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100/50 active:scale-95 transition-transform"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            {client && client.id !== currentUserId && (
                                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={client.id} partnerName={client.full_name || 'Client'} label="" variant="antigravity" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Session Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center justify-between">
                                                                <button onClick={() => handleStudioClick(studio)} className="text-[17px] sm:text-xl font-serif text-charcoal hover:text-forest transition-colors text-left tracking-tight">
                                                                    {studio?.name || "Studio Node"}
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 text-charcoal/30">
                                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] truncate">{studio?.location || "REGISTRY N/A"}</span>
                                                            </div>

                                                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-grey/30">
                                                                {client && (
                                                                    <button onClick={() => setSelectedClient(client)} className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0 flex-1">
                                                                        <div className="w-6 h-6 rounded-lg border border-forest/10 p-0.5 shrink-0">
                                                                            <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-full h-full rounded-lg object-cover" />
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-charcoal/60 uppercase tracking-[0.15em] truncate">{client.full_name}</span>
                                                                    </button>
                                                                )}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="px-2 py-0.5 bg-forest/5 text-forest/50 text-[7px] font-black uppercase tracking-[0.15em] rounded-lg border border-forest/5 flex items-center gap-1">
                                                                        <Box className="w-2 h-2" />
                                                                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                                            ? `${slot.equipment[0]}`
                                                                            : (`${booking.price_breakdown?.equipment || booking.equipment || 'Session'}`)}
                                                                        <span className="opacity-40">({booking.quantity || 1})</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Actions */}
                                                    <div className="hidden sm:flex items-center gap-2 ml-auto">
                                                        {booking.status === 'approved' && getSlotDateTime(slot?.date, slot?.start_time) > now && (
                                                            <button
                                                                onClick={() => setCancellingBooking(booking)}
                                                                className="h-10 px-4 bg-off-white text-red-600 border border-border-grey rounded-xl hover:bg-red-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-[0.2em] shadow-tight"
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
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Past Sessions List */}
            {historicalBookings.length > 0 && (
                <section>
                    <div className="px-6 sm:px-0 flex items-center justify-between mb-6 sm:mb-12">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-charcoal/5 rounded-[1.25rem] flex items-center justify-center shrink-0 border border-charcoal/10">
                            <Clock className="w-4 h-4 sm:w-6 h-6 text-charcoal/40" />
                        </div>
                        <h2 className="text-xl sm:text-3xl font-serif text-charcoal/40 tracking-tight">Archive Registry</h2>
                    </div>
                </div>

                    <div className="space-y-10">
                        {historicalGroups.map((group) => (
                            <div key={group.date} className="relative">
                                {/* Date Header */}
                                <div className="sticky top-0 z-20 bg-charcoal/[0.03] backdrop-blur-xl px-4 py-3 mb-4 rounded-[1.25rem] border border-charcoal/5 flex items-center justify-between mx-4 sm:mx-0 ring-1 ring-charcoal/[0.02]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-charcoal/5 flex items-center justify-center">
                                            <Clock className="w-3 h-3 text-charcoal/30" />
                                        </div>
                                        <span className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.25em]">
                                            {new Date(group.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-charcoal/10" />
                                        <span className="text-[8px] font-black text-charcoal/20 uppercase tracking-[0.15em]">{group.bookings.length} {group.bookings.length === 1 ? 'Legacy' : 'Legacies'}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {group.bookings.map((booking: any) => {
                                        const slot = getFirst(booking.slots)
                                        const studio = getFirst(slot?.studios)
                                        const client = getFirst(booking.client)

                                        return (
                                            <div key={booking.id} className="glass-card p-3.5 sm:p-5 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-700 shadow-sm group relative mx-4 sm:mx-0 rounded-[1.75rem] overflow-hidden grayscale-[0.5] hover:grayscale-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 relative z-10">
                                                    {/* Time & Earnings */}
                                                    <div className="flex items-center justify-between sm:flex-col sm:justify-center sm:bg-charcoal/[0.03] sm:rounded-[1.5rem] sm:w-24 sm:h-24 sm:shrink-0 sm:border sm:border-charcoal/5">
                                                        <div className="flex flex-col sm:items-center">
                                                            <span className="text-[13px] sm:text-base font-serif text-charcoal/40 leading-none tracking-tight">
                                                                {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </span>
                                                            <span className="text-[7px] font-black text-charcoal/20 uppercase tracking-[0.15em] mt-1.5">RECORDED</span>
                                                        </div>
                                                        {booking.price_breakdown?.instructor_fee && (
                                                            <div className="flex flex-col items-end sm:items-center sm:mt-3">
                                                                <span className="text-[13px] sm:text-base font-black text-sage/60 tracking-tighter">₱{booking.price_breakdown.instructor_fee.toLocaleString()}</span>
                                                                <span className="text-[7px] font-black text-sage/30 uppercase tracking-[0.2em]">VALUED</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Session Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-col gap-0.5">
                                                            <button onClick={() => handleStudioClick(studio)} className="text-[15px] sm:text-lg font-serif text-charcoal/40 hover:text-charcoal transition-colors text-left tracking-tight">
                                                                {studio?.name || "Historical Node"}
                                                            </button>
                                                            
                                                            <div className="flex items-center gap-2 text-charcoal/20">
                                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] truncate">{studio?.location || "ARCHIVE N/A"}</span>
                                                            </div>

                                                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-charcoal/5">
                                                                {client && (
                                                                    <button onClick={() => setSelectedClient(client)} className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0 flex-1">
                                                                        <div className="w-6 h-6 rounded-lg border border-charcoal/5 p-0.5 shrink-0 opacity-40">
                                                                            <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-full h-full rounded-lg object-cover" />
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-charcoal/30 uppercase tracking-[0.15em] truncate">{client.full_name}</span>
                                                                    </button>
                                                                )}
                                                                {booking.status === 'completed' && !booking.instructor_reviewed_studio && (
                                                                    <button
                                                                        onClick={() => setReviewTarget({
                                                                            booking,
                                                                            revieweeId: studio?.owner_id || '',
                                                                            revieweeName: studio?.name || 'Studio'
                                                                        })}
                                                                        className="h-8 px-5 bg-sage/[0.08] text-sage border border-sage/20 rounded-xl text-[9px] font-black uppercase tracking-[0.25em] hover:bg-sage hover:text-white transition-all shadow-sm active:scale-95"
                                                                    >
                                                                        FEEDBACK
                                                                    </button>
                                                                )}
                                                                {booking.instructor_reviewed_studio && (
                                                                    <span className="text-[8px] text-charcoal/30 font-black uppercase tracking-[0.25em] bg-charcoal/[0.03] px-3 py-1.5 rounded-xl border border-charcoal/5">SUBMITTED</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
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
                                        <div className="w-full h-full flex items-center justify-center bg-charcoal/5 text-charcoal/50 text-2xl font-serif">
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
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(studioDetails.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-charcoal/50'}`} />
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
                                                                        ? (reviewer.avatar_url.startsWith('http') ? reviewer.avatar_url : `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${reviewer.avatar_url}`)
                                                                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230`}
                                                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230` }}
                                                                    className="w-6 h-6 rounded-full object-cover border border-cream-200"
                                                                    alt=""
                                                                />
                                                                <span className="text-xs font-semibold text-charcoal/70">{reviewer?.full_name || 'Anonymous'}</span>
                                                                <div className="flex items-center gap-0.5 ml-auto">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-charcoal/50'}`} />
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
                                className="flex-1 py-2.5 bg-forest text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all"
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
                                <h4 className="text-[9px] font-black text-charcoal/50 uppercase tracking-[0.4em] mb-3">BIO</h4>
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
                            className="w-full py-6 bg-forest text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95"
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
