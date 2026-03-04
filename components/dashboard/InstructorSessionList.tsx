'use client'

import { useState } from 'react'
import { Calendar, MapPin, Box, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import InstructorLeaveReviewButton from '@/components/reviews/InstructorLeaveReviewButton'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'

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

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v

    const getSlotDateTime = (date: string, time: string) => {
        return new Date(`${date}T${time}+08:00`)
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
        <div className="space-y-8">
            <BookingFilter onFilterChange={setFilters} />

            {/* Upcoming List */}
            <section>
                <h2 className="text-xl font-serif text-charcoal-900 mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-charcoal-500" />
                    Upcoming Sessions
                </h2>
                {upcomingBookings.length === 0 ? (
                    <p className="text-charcoal-400 text-sm">No upcoming sessions.</p>
                ) : (
                    <div className="space-y-3">
                        {upcomingBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3 w-full">
                                                    <Link href={`/studios/${studio?.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                        <img
                                                            src={studio?.logo_url || "/logo.png"}
                                                            alt={studio?.name || "Studio"}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex flex-col gap-1 items-start min-w-0">
                                                                <Link href={`/studios/${studio?.id}`} className="text-sm font-bold text-charcoal-900 truncate w-full hover:text-rose-gold transition-colors">
                                                                    {studio?.name || "Studio"}
                                                                </Link>
                                                                <span className={clsx(
                                                                    "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0",
                                                                    booking.status === 'approved' ? "bg-green-100/50 text-green-700 border-green-200" :
                                                                        "bg-red-100/50 text-red-700 border-red-200"
                                                                )}>
                                                                    {booking.status === 'approved' ? 'Confirmed' : 'Cancelled'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-[13px] font-bold text-charcoal-900 leading-none">
                                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {client && client.id !== currentUserId && (
                                        <div className="pt-3 border-t border-cream-200/50 space-y-2">
                                            <div className="flex items-center gap-2 group/inst">
                                                <button onClick={() => setSelectedClient(client)} className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 hover:border-rose-gold transition-colors">
                                                    <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                </button>
                                                <div className="text-xs text-charcoal-600 truncate flex-1 flex items-center gap-2 group-hover/inst:text-charcoal-900 transition-colors">
                                                    Client: <button onClick={() => setSelectedClient(client)} className="font-semibold text-charcoal-900 hover:text-rose-gold transition-colors">{client.full_name || 'N/A'}</button>
                                                    {client.medical_conditions && (
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded border border-red-200 animate-pulse flex items-center gap-0.5">
                                                            <AlertCircle className="w-2.5 h-2.5" />
                                                            Customer has medical condition
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                                <span className="font-semibold text-charcoal-700 leading-tight">
                                                    {studio?.location || "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                                <span className="font-semibold text-charcoal-700">
                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                        ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Standard Session'} (${booking.quantity || 1})`)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {client && client.id !== currentUserId && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={client.id} partnerName={client.full_name || 'Client'} label="Message Client" />
                                            )}
                                            {studio && studio.owner_id && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={studio.owner_id} partnerName={studio.name || 'Studio'} label="Message Studio" />
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
                <section>
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6">Past Sessions</h2>
                    <div className="space-y-4">
                        {pastBookings.map((booking: any) => {
                            const slot = getFirst(booking.slots)
                            const studio = getFirst(slot?.studios)
                            const client = getFirst(booking.client)

                            return (
                                <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3 w-full">
                                                    <Link href={`/studios/${studio?.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                        <img
                                                            src={studio?.logo_url || "/logo.png"}
                                                            alt={studio?.name || "Studio"}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex flex-col gap-1 items-start min-w-0">
                                                                <Link href={`/studios/${studio?.id}`} className="text-sm font-bold text-charcoal-900 truncate w-full hover:text-rose-gold transition-colors">
                                                                    {studio?.name || "Studio"}
                                                                </Link>
                                                                <span className={clsx(
                                                                    'px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0',
                                                                    booking.status === 'completed'
                                                                        ? (booking.funds_unlocked ? 'bg-green-100/50 text-green-700 border-green-200' : 'bg-amber-100/50 text-amber-700 border-amber-200') :
                                                                        booking.status === 'approved' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                                                            'bg-red-100/50 text-red-700 border-red-200'
                                                                )}>
                                                                    {['completed', 'approved'].includes(booking.status)
                                                                        ? (booking.status === 'completed'
                                                                            ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held (24h)')
                                                                            : 'Approved')
                                                                        : 'Cancelled'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className="text-[13px] font-bold text-charcoal-900 leading-none">
                                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </p>
                                                                <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                    {getSlotDateTime(slot?.date, slot?.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {client && client.id !== currentUserId && (
                                        <div className="pt-3 border-t border-cream-200/50 space-y-2">
                                            <div className="flex items-center gap-2 group/inst">
                                                <button onClick={() => setSelectedClient(client)} className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 hover:border-rose-gold transition-colors">
                                                    <img src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                </button>
                                                <div className="text-xs text-charcoal-600 truncate flex-1 flex items-center gap-2 group-hover/inst:text-charcoal-900 transition-colors">
                                                    Client: <button onClick={() => setSelectedClient(client)} className="font-semibold text-charcoal-900 hover:text-rose-gold transition-colors">{client.full_name || 'N/A'}</button>
                                                    {client.medical_conditions && (
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded border border-red-200 animate-pulse flex items-center gap-0.5">
                                                            <AlertCircle className="w-2.5 h-2.5" />
                                                            Customer has medical condition
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                                <span className="font-semibold text-charcoal-700 leading-tight">
                                                    {studio?.location || "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                                <span className="font-semibold text-charcoal-700">
                                                    {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                        ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                        : (`${booking.price_breakdown?.equipment || booking.equipment || 'Standard Session'} (${booking.quantity || 1})`)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {client && client.id !== currentUserId && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={client.id} partnerName={client.full_name || 'Client'} label="Message Client" />
                                            )}
                                            {studio && studio.owner_id && (
                                                <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={studio.owner_id} partnerName={studio.name || 'Studio'} label="Message Studio" />
                                            )}
                                            {booking.status === 'completed' && (
                                                <InstructorLeaveReviewButton
                                                    booking={booking}
                                                    currentUserId={currentUserId}
                                                    studioOwnerId={studio?.owner_id ?? null}
                                                    studioName={studio?.name ?? 'Studio'}
                                                    clientId={client?.id ?? null}
                                                    clientName={client?.full_name ?? 'Client'}
                                                    hideClientReview={client?.id === currentUserId}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}
            {/* Client Medical Modal */}
            {selectedClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900 transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-2 mb-6 text-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200 bg-cream-50">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-xl font-serif text-charcoal-900">{selectedClient.full_name}</h3>
                            <p className="text-sm text-charcoal-500">{selectedClient.email}</p>
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
                                <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50 mb-2">
                                    <h4 className="text-sm font-bold text-charcoal-700 mb-1">Medical Conditions</h4>
                                    <p className="text-sm text-charcoal-500 italic">None reported.</p>
                                </div>
                            );
                        })()}
                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full mt-4 py-3 bg-charcoal-900 text-white rounded-xl font-bold hover:bg-charcoal-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
