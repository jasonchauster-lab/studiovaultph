'use client'

import { useState, useMemo, memo } from 'react'
import { CalendarX2, X, AlertCircle, Clock, Award, UserCheck } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import Image from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'
import CancelBookingModal from './CancelBookingModal'
import InstructorPreviewModal from './InstructorPreviewModal'
import { cancelBookingByStudio } from '@/app/(dashboard)/studio/actions'
import { getInstructorProfile } from '@/app/(dashboard)/instructors/actions'
import Avatar from '@/components/shared/Avatar'


interface StudioRentalListProps {
    bookings: any[]
    currentUserId: string
}

export default function StudioRentalList({ bookings, currentUserId }: StudioRentalListProps) {
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        dateRange: { from: null, to: null }
    })
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [cancellingBooking, setCancellingBooking] = useState<any>(null)
    const [selectedInstructor, setSelectedInstructor] = useState<any>(null)
    const [instructorDetails, setInstructorDetails] = useState<any>(null)
    const [loadingInstructor, setLoadingInstructor] = useState(false)
    const [resetKey, setResetKey] = useState(0)

    const handleInstructorClick = async (instructor: any) => {
        if (!instructor?.id) return
        setSelectedInstructor(instructor)
        setInstructorDetails(null)
        setLoadingInstructor(true)
        try {
            const data = await getInstructorProfile(instructor.id)
            setInstructorDetails(data)
        } finally {
            setLoadingInstructor(false)
        }
    }

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }
        const result = await cancelBookingByStudio(cancellingBooking.id, reason)
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

    // 1. Memoized base filtering
    const baseFilteredBookings = useMemo(() => {
        return bookings.filter((b) => {
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
    }, [bookings, filters])

    // 2. Memoized grouping and sorting
    const { sortedDates, groupedBookings } = useMemo(() => {
        const grouped: Record<string, any[]> = {}
        
        const sorted = [...baseFilteredBookings].sort((a, b) => {
            const slotA = getFirst(a.slots)
            const slotB = getFirst(b.slots)
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
    }, [baseFilteredBookings])

    return (
        <div className="space-y-8 pb-48">
            <BookingFilter key={resetKey} onFilterChange={setFilters} />

            <div className="space-y-10">
                {sortedDates.length === 0 ? (
                    <div className="min-h-[220px] py-12 flex flex-col items-center justify-center text-center bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-charcoal/10 mx-4 sm:mx-0 px-6">
                        <div className="w-14 h-14 bg-forest/5 rounded-full flex items-center justify-center mb-5 ring-1 ring-forest/10">
                            <CalendarX2 className="w-7 h-7 text-forest/40" />
                        </div>
                        <h3 className="text-base font-serif font-bold text-charcoal-900 mb-2">No sessions found</h3>
                        <p className="text-[11px] text-charcoal/50 max-w-[240px] mb-8 leading-relaxed">Try adjusting your filters or adding a new availability slot to your studio.</p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                                <button 
                                    onClick={() => setResetKey(prev => prev + 1)}
                                    className="px-5 py-2.5 bg-off-white text-charcoal/60 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-forest/5 transition-all border border-border-grey shadow-sm"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <Link
                                href="/studio"
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
                                {/* Sticky Date Header */}
                                <div className="sticky top-0 z-20 py-3 bg-cream-50/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center bg-forest text-white rounded-2xl w-12 h-12 shrink-0 shadow-lg shadow-forest/20 group-hover:scale-105 transition-transform">
                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] leading-none opacity-70">
                                                {dateObj.toLocaleDateString('en-PH', { month: 'short' })}
                                            </span>
                                            <span className="text-lg font-serif font-bold leading-none mt-1">
                                                {dateObj.toLocaleDateString('en-PH', { day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">
                                                    {dateObj.toLocaleDateString('en-PH', { weekday: 'long' })}
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
                                            onInstructorClick={handleInstructorClick}
                                            onClientClick={setSelectedClient}
                                            onCancelClick={setCancellingBooking}
                                            now={now}
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
                title="Cancel Session"
                description="Are you sure you want to cancel this session? A 100% refund will be issued to the client immediately. The instructor will also be notified."
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
                            return `Late Cancellation Displacement Fee: ₱${studioFee.toLocaleString()} will be deducted from your wallet and credited to the instructor.`
                        }
                        return null
                    })() || undefined
                }
            />

            {/* Instructor Profile Modal */}
            <InstructorPreviewModal 
                instructor={selectedInstructor}
                details={instructorDetails}
                loading={loadingInstructor}
                onClose={() => { setSelectedInstructor(null); setInstructorDetails(null) }}
            />

            {/* Client Medical Modal */}
            {selectedClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-burgundy/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-burgundy/40 hover:text-burgundy transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-2 mb-6 text-center">
                            <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                <Avatar 
                                    src={selectedClient.avatar_url} 
                                    fallbackName={selectedClient.full_name} 
                                    size={80} 
                                />
                            </div>
                            <h3 className="text-xl font-serif text-burgundy">{selectedClient.full_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-slate">{selectedClient.email}</p>
                                {selectedClient.date_of_birth && (
                                    <>
                                        <span className="text-border-grey">•</span>
                                        <p className="text-sm font-bold text-gold">{calculateAge(selectedClient.date_of_birth)} years old</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-3">
                            <h4 className="text-sm font-bold text-burgundy/70 mb-1">About</h4>
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
                                    <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Medical Conditions</h4>
                                    <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">{displayConditions}</p>
                                </div>
                            ) : (
                                <div className="bg-pastel-blue p-4 rounded-xl border border-border-grey mb-2">
                                    <h4 className="text-sm font-bold text-burgundy/70 mb-1">Medical Conditions</h4>
                                    <p className="text-sm text-slate italic">None reported.</p>
                                </div>
                            );
                        })()}
                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full mt-4 py-3 bg-forest text-white rounded-xl font-bold hover:brightness-110 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const SessionCard = memo(({ booking, currentUserId, onInstructorClick, onClientClick, onCancelClick, now }: any) => {
    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
    
    const slot = getFirst(booking.slots)
    const instructor = getFirst(booking.instructor)
    const client = getFirst(booking.client)
    const start = new Date(`${slot?.date}T${slot?.start_time}+08:00`)
    const studioFee = booking.price_breakdown?.studio_fee ?? 0
    const isCancelled = !['completed', 'approved'].includes(booking.status)

    return (
        <div
            className={clsx(
                "atelier-card overflow-hidden group relative mx-4 sm:mx-0",
                isCancelled && "opacity-60 grayscale-[0.3]"
            )}
        >
            {/* Top accent for status */}
            <div className={clsx(
                'h-0.5 w-full',
                booking.status === 'completed' && booking.funds_unlocked ? 'bg-[#5C8A42]' :
                booking.status === 'completed' ? 'bg-amber-400' :
                booking.status === 'approved' ? 'bg-blue-400' :
                'bg-red-300'
            )} />

            <div className="p-3.5">
                {/* Row 1: Time + Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-forest/40" />
                        <span className="text-[10px] font-black text-charcoal/60 uppercase tracking-widest">
                            {start.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {['completed', 'approved'].includes(booking.status) && (
                            <div className="flex items-baseline gap-1 bg-forest/5 px-2 py-0.5 rounded-full border border-forest/10">
                                <span className="text-[6px] font-black text-forest/40 uppercase tracking-widest">EARNED</span>
                                <span className="text-[10px] font-black text-forest">₱{Number(studioFee || booking.total_price || 0).toLocaleString()}</span>
                            </div>
                        )}
                        <span className={clsx(
                            'px-2 py-0.5 text-[7px] font-bold uppercase rounded-full tracking-widest border inline-flex items-center gap-1 shrink-0',
                            booking.status === 'completed'
                                ? (booking.funds_unlocked
                                    ? 'border-[#b8d49a] text-forest bg-sage/20'
                                    : 'bg-amber-100/70 text-amber-700 border-amber-200')
                                : booking.status === 'approved' ? 'bg-blue-100/70 text-blue-700 border-blue-200' :
                                    'bg-red-100/70 text-red-600 border-red-200'
                        )}>
                            {booking.status === 'completed' && (
                                booking.funds_unlocked ? <Award className="w-2 h-2" /> : <Clock className="w-2 h-2" />
                            )}
                            {['completed', 'approved'].includes(booking.status)
                                ? (booking.status === 'completed'
                                    ? (booking.funds_unlocked ? 'Unlocked' : 'Funds Held')
                                    : 'Upcoming')
                                : 'Cancelled'}
                        </span>
                    </div>
                </div>

                {/* Row 2: Client Name */}
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
                            <span className="ml-1 px-1.5 py-0.5 bg-red-50 text-red-500 text-[6px] font-black uppercase rounded border border-red-100 flex items-center gap-0.5 tracking-widest shrink-0">
                                <AlertCircle className="w-2 h-2" /> MEDICAL
                            </span>
                        )}
                    </button>
                )}

                {/* Row 3: Instructor + Equipment */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
                    <button onClick={() => onInstructorClick(instructor)} className="text-[10px] font-semibold text-charcoal/50 hover:text-forest transition-colors flex items-center gap-1 group/inst">
                        <span className="opacity-60">instructor:</span>
                        <span className="font-bold text-charcoal/70 group-hover/inst:text-forest">{instructor?.full_name || 'Instructor'}</span>
                    </button>
                    <span className="text-charcoal/20 text-[10px]">·</span>
                    <span className="text-[9px] font-bold text-charcoal/50 uppercase tracking-wider bg-off-white px-1.5 py-0.5 rounded border border-border-grey/30">
                        {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                            ? slot.equipment[0]
                            : (booking.price_breakdown?.equipment || booking.equipment || 'Session')}
                        <span className="font-medium opacity-50 ml-0.5">({booking.quantity || 1}x)</span>
                    </span>
                </div>

                {/* Row 4: Actions */}
                <div className="flex items-center gap-2">

                    {instructor && instructor.id !== currentUserId && (
                        <StudioChatButton
                            bookingId={booking.id}
                            currentUserId={currentUserId}
                            partnerId={instructor.id}
                            partnerName={instructor.full_name || 'Instructor'}
                            label="Message"
                            variant="antigravity"
                            iconType="instructor"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-forest hover:text-white border border-border-grey hover:border-forest transition-all rounded-lg font-bold text-[9px] uppercase tracking-wider text-charcoal-500 shadow-sm active:scale-95"
                        />
                    )}
                    {booking.status === 'approved' && start > now && (
                        <button
                            onClick={() => onCancelClick(booking)}
                            className="px-3 py-1.5 bg-off-white text-red-500 border border-red-100 rounded-lg text-[9px] font-semibold uppercase tracking-wide hover:bg-red-50 transition-all"
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
