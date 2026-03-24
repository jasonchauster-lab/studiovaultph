'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Calendar, MapPin, Box, X, AlertCircle, Clock, Navigation, Award, UserCheck } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import Avatar from '@/components/shared/Avatar'

import ReviewModal from '@/components/reviews/ReviewModal'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import CancelBookingModal from './CancelBookingModal'
import StudioPreviewModal from './StudioPreviewModal'
import { cancelBookingByInstructor, checkInClient } from '@/app/(dashboard)/instructor/booking-actions'
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
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [selectedStudio, setSelectedStudio] = useState<any>(null)
    const [studioDetails, setStudioDetails] = useState<any>(null)
    const [loadingStudio, setLoadingStudio] = useState(false)
    const [resetKey, setResetKey] = useState(0)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])
    const [reviewTarget, setReviewTarget] = useState<{
        booking: any,
        revieweeId: string,
        revieweeName: string
    } | null>(null)

    const handleStudioClick = async (studio: any) => {
        if (!studio?.id) return
        setSelectedStudio(studio)
        setStudioDetails(null)
        setLoadingStudio(true)
        try {
            const data = await getStudioProfile(studio.id)
            setStudioDetails(data)
        } finally {
            setLoadingInstructor(false)
        }
    }

    const { setLoadingInstructor } = { setLoadingInstructor: setLoadingStudio }; // Alias fix for consistency with copy-paste from other files

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

    const now = useMemo(() => isMounted ? new Date() : new Date(0), [isMounted])

    // 1. Memoized base filtering
    const baseFilteredBookings = useMemo(() => {
        return bookings.filter((b: any) => {
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
    }, [bookings, filters]);

    // 2. Memoized grouping and sorting (Unified list like Studio)
    const { sortedDates, groupedBookings } = useMemo(() => {
        const grouped: Record<string, any[]> = {}
        
        const sorted = [...baseFilteredBookings].sort((a, b) => {
            const slotA = getFirst(a.slots)
            const slotB = getFirst(b.slots)
            if (!slotA || !slotB) return 0
            const dateA = getSlotDateTime(slotA.date, slotA.start_time).getTime()
            const dateB = getSlotDateTime(slotB.date, slotB.start_time).getTime()
            return dateB - dateA
        })

        sorted.forEach(booking => {
            const slot = getFirst(booking.slots)
            if (!slot) return
            const dateKey = slot.date
            if (!grouped[dateKey]) {
                grouped[dateKey] = []
            }
            grouped[dateKey].push(booking)
        })

        const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
        return { sortedDates: dates, groupedBookings: grouped }
    }, [baseFilteredBookings]);

    return (
        <div className="space-y-8 pb-48">
            <div className="px-4 sm:px-0">
                <BookingFilter key={resetKey} onFilterChange={setFilters} />
            </div>

            <div className="space-y-10">
                {sortedDates.length === 0 ? (
                    <div className="min-h-[220px] py-12 flex flex-col items-center justify-center text-center bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-charcoal/10 mx-4 sm:mx-0 px-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-forest/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[100px] pointer-events-none" />
                        <div className="w-14 h-14 bg-forest/5 rounded-full flex items-center justify-center mb-5 ring-1 ring-forest/10">
                            <Calendar className="w-7 h-7 text-forest/40" />
                        </div>
                        <h3 className="text-base font-serif font-bold text-charcoal-900 mb-2">No sessions found</h3>
                        <p className="text-[11px] text-charcoal/50 max-w-[240px] mb-8 leading-relaxed">Try adjusting your filters or adding a new availability slot.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                            {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                <button 
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="px-5 py-2.5 bg-off-white text-charcoal/60 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-forest/5 transition-all border border-border-grey shadow-sm"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                href="/instructor/schedule"
                                className="px-5 py-2.5 bg-forest text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-tight"
                            >
                                Add Slot
                            </Link>
                        </div>
                    </div>
                ) : (
                    sortedDates.map((dateKey) => {
                        const dayBookings = groupedBookings[dateKey]
                        const dateObj = new Date(`${dateKey}T00:00:00+08:00`)
                        
                        return (
                            <div key={dateKey} className="space-y-4">
                                {/* Sticky Date Header (Studio Style) */}
                                <div className="sticky top-0 z-20 py-3 bg-cream-50/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center bg-forest text-white rounded-2xl w-12 h-12 shrink-0 shadow-lg shadow-forest/20 transition-transform">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none opacity-70">
                                                {isMounted && dateObj.toLocaleDateString('en-PH', { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-serif font-bold leading-none mt-1">
                                                {isMounted && dateObj.toLocaleDateString('en-PH', { day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">
                                                    {isMounted && dateObj.toLocaleDateString('en-PH', { weekday: 'long' })}
                                                </h2>
                                                <div className="h-px flex-1 bg-gradient-to-r from-charcoal/10 via-charcoal/5 to-transparent" />
                                                <span className="text-[8px] text-charcoal/30 font-bold uppercase tracking-widest bg-charcoal/5 px-2 py-0.5 rounded-full shrink-0">
                                                    {dayBookings.length} {dayBookings.length === 1 ? 'SESSION' : 'SESSIONS'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {dayBookings.map((booking: any) => (
                                        <SessionCard
                                            key={booking.id}
                                            booking={booking}
                                            currentUserId={currentUserId}
                                            onStudioClick={handleStudioClick}
                                            onClientClick={setSelectedClient}
                                            onCancelClick={setCancellingBooking}
                                            onReviewClick={setReviewTarget}
                                            now={now}
                                            isMounted={isMounted}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

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
                            const studioFee = Number(cancellingBooking.price_breakdown?.studio_fee || 0)
                            return `LATE TERMINATION PENALTY: ₱${studioFee.toLocaleString()} will be liquidated from your vault to reconcile the studio allocation.`
                        }
                        return null
                    })() || undefined
                }
            />

            {/* Studio Profile Modal */}
            <StudioPreviewModal 
                studio={selectedStudio}
                details={studioDetails}
                loading={loadingStudio}
                onClose={() => { setSelectedStudio(null); setStudioDetails(null) }}
            />

            {/* Client Medical Modal (Studio Style) */}
            {selectedClient && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-charcoal/20 hover:text-charcoal transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-2 mb-6 text-center">
                            <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                <Avatar 
                                    src={selectedClient.avatar_url} 
                                    fallbackName={selectedClient.full_name} 
                                    size={80} 
                                />
                            </div>
                            <h3 className="text-xl font-serif text-charcoal">{selectedClient.full_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-slate">{selectedClient.email}</p>
                                {selectedClient.date_of_birth && (
                                    <>
                                        <span className="text-border-grey">•</span>
                                        <p className="text-sm font-bold text-forest">{calculateAge(selectedClient.date_of_birth)} years old</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-3">
                            <h4 className="text-sm font-bold text-charcoal/40 mb-1 uppercase tracking-widest text-[10px]">About</h4>
                            {selectedClient.bio
                                ? <p className="text-sm text-slate leading-relaxed italic">"{selectedClient.bio}"</p>
                                : <p className="text-sm text-slate italic">No bio provided.</p>
                            }
                        </div>
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
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-2">
                                    <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest"><AlertCircle className="w-3 h-3" /> Medical Conditions</h4>
                                    <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">{displayConditions}</p>
                                </div>
                            ) : (
                                <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-2">
                                    <h4 className="text-sm font-bold text-charcoal/40 mb-1 uppercase tracking-widest text-[10px]">Medical Conditions</h4>
                                    <p className="text-sm text-slate italic">None reported.</p>
                                </div>
                            );
                        })()}
                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full mt-4 py-3 bg-forest text-white rounded-xl font-bold hover:brightness-110 transition-colors uppercase tracking-widest text-[10px]"
                        >
                            Close
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

const SessionCard = memo(({ booking, currentUserId, onStudioClick, onClientClick, onCancelClick, onReviewClick, now, isMounted }: any) => {
    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
    
    const slot = getFirst(booking.slots)
    const studio = getFirst(slot?.studios)
    const client = getFirst(booking.client)
    const start = new Date(`${slot?.date}T${slot?.start_time}+08:00`)
    const instructorFee = booking.price_breakdown?.instructor_fee ?? 0
    const isCancelled = !['completed', 'approved'].includes(booking.status)

    return (
        <div
            className={clsx(
                "atelier-card overflow-hidden group relative mx-4 sm:mx-0 bg-white",
                isCancelled && "opacity-60 grayscale-[0.3]"
            )}
        >
            {/* Top accent for status */}
            <div className={clsx(
                'h-0.5 w-full',
                booking.status === 'completed' ? 'bg-[#5C8A42]' :
                booking.status === 'approved' ? 'bg-blue-400' :
                'bg-red-300'
            )} />

            <div className="p-3.5">
                {/* Row 1: Time + Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-forest/40" />
                        <span className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest">
                            {isMounted && start.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {['completed', 'approved'].includes(booking.status) && (
                            <div className="flex items-baseline gap-1 bg-forest/5 px-2 py-0.5 rounded-full border border-forest/10">
                                <span className="text-[8px] font-black text-forest/40 uppercase tracking-widest">EARNED</span>
                                <span className="text-[10px] font-black text-forest">₱{Number(instructorFee).toLocaleString()}</span>
                            </div>
                        )}
                        <span className={clsx(
                            'px-2 py-0.5 text-[9px] font-bold uppercase rounded-full tracking-widest border inline-flex items-center gap-1 shrink-0',
                            booking.status === 'completed' ? 'border-[#b8d49a] text-forest bg-sage/20' :
                            booking.status === 'approved' ? 'bg-blue-100/70 text-blue-700 border-blue-200' :
                            'bg-red-100/70 text-red-600 border-red-200'
                        )}>
                            {booking.status === 'completed' && <Award className="w-2 h-2" />}
                            {booking.status === 'approved' ? (start > now ? 'Upcoming' : 'Ongoing') : 
                             booking.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                    </div>
                </div>

                {/* Row 2: Client Name (Prominent) */}
                {client && (
                    <button onClick={() => onClientClick(client)} className="flex items-center gap-2 hover:opacity-75 transition-opacity mb-2.5 min-w-0 group/client">
                        <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-charcoal/5">
                            <Avatar 
                                src={client.avatar_url} 
                                fallbackName={client.full_name} 
                                size={24} 
                            />
                        </div>
                        <span className="text-sm font-bold text-charcoal-900 truncate group-hover/client:text-forest transition-colors">{client.full_name}</span>
                        {client?.medical_conditions && (
                            <span className="ml-1 px-1.5 py-0.5 bg-red-50 text-red-500 text-[8px] font-black uppercase rounded border border-red-100 flex items-center gap-0.5 tracking-widest shrink-0">
                                <AlertCircle className="w-2 h-2" /> MEDICAL
                            </span>
                        )}
                    </button>
                )}

                {/* Row 3: Studio + Equipment */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
                    <button onClick={() => onStudioClick(studio)} className="text-[10px] font-semibold text-charcoal/50 hover:text-forest transition-colors flex items-center gap-1 group/studio">
                        <span className="opacity-60">studio:</span>
                        <span className="font-bold text-charcoal/70 group-hover/studio:text-forest">{studio?.name || "Studio Node"}</span>
                    </button>
                    <span className="text-charcoal/20 text-[10px]">·</span>
                    <span className="text-[10px] font-bold text-charcoal/50 uppercase tracking-wider bg-off-white px-1.5 py-0.5 rounded border border-border-grey/30">
                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                            ? slot.equipment[0]
                            : (booking.price_breakdown?.equipment || booking.equipment || 'Session')}
                        <span className="font-medium opacity-50 ml-0.5">({booking.quantity || 1}x)</span>
                    </span>
                </div>

                {/* Row 4: Actions */}
                <div className="flex items-center gap-2">
                    {/* Check In Action (Instructor Specific) */}
                    {booking.status === 'approved' && !booking.client_checked_in_at && (
                        <button
                            onClick={async () => {
                                if (confirm('Check in this client?')) {
                                    await checkInClient(booking.id)
                                }
                            }}
                            className="h-8 px-3 bg-forest text-white border border-forest rounded-lg hover:brightness-110 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95"
                        >
                            CHECK IN
                        </button>
                    )}
                    {booking.client_checked_in_at && (
                        <div className="h-8 px-3 flex items-center bg-forest/10 text-forest border border-forest/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            <UserCheck className="w-3 h-3 mr-1.5" />
                            CHECKED IN
                        </div>
                    )}

                    {/* Chat with Client */}
                    {client && client.id !== currentUserId && (
                        <StudioChatButton 
                            bookingId={booking.id} 
                            currentUserId={currentUserId} 
                            partnerId={client.id} 
                            partnerName={client.full_name || 'Client'} 
                            label="CHAT" 
                            variant="antigravity" 
                            iconType="client"
                            className="!h-8 !px-3 !bg-white !border-border-grey !text-[10px] !font-bold"
                        />
                    )}

                    {/* Feedback (Review Studio) */}
                    {booking.status === 'completed' && !booking.instructor_reviewed_studio && (
                        <button
                            onClick={() => onReviewClick({
                                booking,
                                revieweeId: studio?.owner_id || '',
                                revieweeName: studio?.name || 'Studio'
                            })}
                            className="h-8 px-3 bg-white text-forest border border-forest/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-forest/5 transition-all shadow-sm active:scale-95"
                        >
                            FEEDBACK
                        </button>
                    )}

                    {/* Cancel Action */}
                    {booking.status === 'approved' && start > now && (
                        <button
                            onClick={() => onCancelClick(booking)}
                            className="h-8 px-3 bg-off-white text-red-500 border border-red-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                            title="Cancel Session"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})
