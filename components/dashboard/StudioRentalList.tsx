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
import { cancelBookingByStudio } from '@/app/(dashboard)/studio/booking-actions'
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
        <div className="space-y-12">
            <div className="flex items-center justify-between gap-4">
                <BookingFilter key={resetKey} onFilterChange={setFilters} />
                {(filters.status !== 'all' || filters.dateRange.from || filters.dateRange.to) && (
                    <button 
                        onClick={() => setResetKey(prev => prev + 1)}
                        className="px-4 py-2 bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200 transition-all border border-zinc-200"
                    >
                        Reset
                    </button>
                )}
            </div>

            <div className="space-y-12">
                {sortedDates.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-6 border border-zinc-100">
                            <CalendarX2 className="w-8 h-8 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">No sessions found</h3>
                        <p className="text-[11px] text-zinc-400 max-w-[260px] leading-relaxed uppercase tracking-widest font-bold">Try adjusting your filters or checking a different date range.</p>
                    </div>
                ) : (
                    sortedDates.map((dateKey) => {
                        const dayBookings = groupedBookings[dateKey]
                        const dateObj = new Date(`${dateKey}T00:00:00+08:00`)
                        
                        return (
                            <div key={dateKey} className="space-y-6">
                                {/* Modern Date Header */}
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center bg-zinc-900 text-white rounded-2xl w-14 h-14 shrink-0 shadow-lg shadow-zinc-200">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                                            {dateObj.toLocaleDateString('en-PH', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-black leading-none mt-0.5">
                                            {dateObj.toLocaleDateString('en-PH', { day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">
                                                {dateObj.toLocaleDateString('en-PH', { weekday: 'long' })}
                                            </h2>
                                            <div className="h-px flex-1 bg-zinc-100" />
                                            <span className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
                                                {dayBookings.length} {dayBookings.length === 1 ? 'SESSION' : 'SESSIONS'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                description="Are you sure you want to cancel this session? A 100% refund will be issued to the client immediately."
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
                            return `Late Cancellation Fee: ₱${studioFee.toLocaleString()} will be charged.`
                        }
                        return null
                    })() || undefined
                }
            />

            <InstructorPreviewModal 
                instructor={selectedInstructor}
                details={instructorDetails}
                loading={loadingInstructor}
                onClose={() => { setSelectedInstructor(null); setInstructorDetails(null) }}
            />

            {selectedClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-zinc-100 shadow-sm">
                                <Avatar 
                                    src={selectedClient.avatar_url} 
                                    fallbackName={selectedClient.full_name} 
                                    size={96} 
                                />
                            </div>
                            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{selectedClient.full_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{selectedClient.email}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">About Client</h4>
                                <p className="text-sm text-zinc-600 leading-relaxed italic">{selectedClient.bio || 'No bio provided.'}</p>
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

                                return (
                                    <div className={clsx("p-5 rounded-2xl border", displayConditions ? "bg-red-50 border-red-100" : "bg-zinc-50 border-zinc-100")}>
                                        <h4 className={clsx("text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2", displayConditions ? "text-red-800" : "text-zinc-400")}>
                                            <AlertCircle className="w-3.5 h-3.5" /> Medical Conditions
                                        </h4>
                                        <p className={clsx("text-sm leading-relaxed", displayConditions ? "text-red-700" : "text-zinc-500 italic")}>
                                            {displayConditions || 'None reported.'}
                                        </p>
                                    </div>
                                )
                            })()}
                        </div>

                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full mt-8 py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                        >
                            Close Details
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
                "bg-white rounded-3xl border border-zinc-100 p-5 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50/20 transition-all duration-300 group relative",
                isCancelled && "opacity-60 grayscale-[0.3]"
            )}
        >
            {/* Status Ribbon */}
            <div className={clsx(
                'absolute top-0 right-8 h-1 w-12 rounded-b-full',
                booking.status === 'completed' && booking.funds_unlocked ? 'bg-indigo-500' :
                booking.status === 'completed' ? 'bg-amber-400' :
                booking.status === 'approved' ? 'bg-emerald-400' :
                'bg-red-400'
            )} />

            <div className="space-y-5">
                {/* Time & Earnings */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-300" />
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                            {start.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                    {['completed', 'approved'].includes(booking.status) && (
                        <div className="text-right">
                            <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Earnings</p>
                            <p className="text-sm font-black text-zinc-900">₱{Number(studioFee || 0).toLocaleString()}</p>
                        </div>
                    )}
                </div>

                {/* Client Info */}
                {client && (
                    <button onClick={() => onClientClick(client)} className="flex items-center gap-3 w-full text-left group/client">
                        <div className="relative w-10 h-10 rounded-2xl overflow-hidden shrink-0 border border-zinc-100">
                            <Avatar 
                                src={client.avatar_url} 
                                fallbackName={client.full_name} 
                                size={40} 
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-zinc-900 truncate group-hover/client:text-indigo-600 transition-colors tracking-tight">{client.full_name}</h4>
                            <div className="flex items-center gap-2">
                                <span className={clsx(
                                    "text-[8px] font-black uppercase tracking-widest",
                                    booking.status === 'completed' ? "text-indigo-500" :
                                    booking.status === 'approved' ? "text-emerald-500" : "text-red-500"
                                )}>
                                    {booking.status === 'completed' ? (booking.funds_unlocked ? 'Payout Ready' : 'Funds Held') : booking.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        {client?.medical_conditions && (
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Medical Alert" />
                        )}
                    </button>
                )}

                {/* Meta Info */}
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-50">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Instructor</span>
                        <button onClick={() => onInstructorClick(instructor)} className="text-[10px] font-black text-zinc-900 hover:text-indigo-600 transition-colors">
                            {instructor?.full_name || 'Unassigned'}
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Session</span>
                        <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                            {Array.isArray(slot?.equipment) && slot.equipment.length > 0 ? slot.equipment[0] : 'Standard'} ({booking.quantity}x)
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                    {instructor && instructor.id !== currentUserId && (
                        <StudioChatButton
                            bookingId={booking.id}
                            currentUserId={currentUserId}
                            partnerId={instructor.id}
                            partnerName={instructor.full_name || 'Instructor'}
                            label="Message Staff"
                            variant="antigravity"
                            className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-zinc-800 transition-all text-center"
                        />
                    )}
                    {booking.status === 'approved' && start > now && (
                        <button
                            onClick={() => onCancelClick(booking)}
                            className="px-4 py-2 bg-white text-red-500 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})
