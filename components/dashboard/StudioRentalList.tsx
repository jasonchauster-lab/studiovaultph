'use client'

import { useState } from 'react'
import { CalendarX2, PlusCircle, MapPin, Box } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import StudioChatButton from '@/components/dashboard/StudioChatButton'
import BookingFilter, { FilterState } from '@/components/dashboard/BookingFilter'

interface StudioRentalListProps {
    bookings: any[]
    currentUserId: string
}

export default function StudioRentalList({ bookings, currentUserId }: StudioRentalListProps) {
    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        dateRange: { from: null, to: null }
    })

    const getFirst = (v: any) => Array.isArray(v) ? v[0] : v

    const getSlotDateTime = (date: string, time: string) => {
        return new Date(`${date}T${time}+08:00`)
    }

    const now = new Date()

    // 1. Filter ALL bookings based on local state
    const baseFilteredBookings = bookings.filter((b) => {
        const slot = getFirst(b.slots)
        if (!slot) return false

        // Status Filter
        if (filters.status !== 'all') {
            if (b.status !== filters.status) return false
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
    const upcomingBookings = baseFilteredBookings.filter(b => {
        const slot = getFirst(b.slots)
        return (b.status === 'approved' || b.status === 'pending') &&
            getSlotDateTime(slot.date, slot.start_time) > now
    })
    const pastBookings = baseFilteredBookings.filter(b => {
        const slot = getFirst(b.slots)
        return b.status === 'completed' ||
            b.status === 'cancelled' ||
            (b.status === 'approved' && getSlotDateTime(slot.date, slot.start_time) <= now)
    })

    const filteredBookings = [...upcomingBookings, ...pastBookings].sort((a, b) => {
        const slotA = getFirst(a.slots)
        const slotB = getFirst(b.slots)
        const dateA = getSlotDateTime(slotA.date, slotA.start_time).getTime()
        const dateB = getSlotDateTime(slotB.date, slotB.start_time).getTime()
        return dateB - dateA // Sort descending by date
    })

    return (
        <div className="space-y-6">
            <BookingFilter onFilterChange={setFilters} />

            <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                    /* ── Empty State ── */
                    <div className="bg-white border border-cream-200 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 px-8 text-center">
                        <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-5">
                            <CalendarX2 className="w-8 h-8 text-charcoal-300" />
                        </div>
                        <h3 className="text-lg font-serif text-charcoal-900 mb-2">
                            {bookings.length > 0 ? "No history matches your filters." : "Your history is empty."}
                        </h3>
                        <p className="text-charcoal-500 text-sm max-w-sm mb-6">
                            {bookings.length > 0 ? "Try adjusting the status or dates." : "Start monetizing your idle reformers by adding availability slots — instructors can book them instantly."}
                        </p>
                        {bookings.length === 0 && (
                            <Link
                                href="/studio"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-gold text-white font-semibold rounded-lg shadow hover:brightness-110 active:scale-95 transition-all"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Your First Slot
                            </Link>
                        )}
                    </div>
                ) : (
                    filteredBookings.map((booking: any) => {
                        const slot = getFirst(booking.slots)
                        const studioData = getFirst(slot?.studios)
                        const instructor = getFirst(booking.instructor)
                        const client = getFirst(booking.client)

                        const start = new Date(`${slot?.date}T${slot?.start_time}+08:00`)

                        const studioFee = booking.price_breakdown?.studio_fee ?? 0
                        const instructorFee = (booking.price_breakdown as any)?.instructor_fee ?? 0
                        const serviceFee = (booking.price_breakdown as any)?.service_fee ?? 0
                        const fullTotal = booking.total_price ?? ((studioFee + instructorFee + serviceFee) || 0)

                        return (
                            <div key={booking.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col gap-1 w-full">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3 w-full">
                                                <Link href={`/instructors/${instructor?.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                    <img
                                                        src={instructor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor?.full_name || 'I')}&background=F5F2EB&color=2C3230`}
                                                        alt={instructor?.full_name || "Instructor"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex flex-col gap-1 items-start min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <Link href={`/instructors/${instructor?.id}`} className="text-sm font-bold text-charcoal-900 truncate hover:text-rose-gold transition-colors">
                                                                    {instructor?.full_name || "Instructor"}
                                                                </Link>
                                                                {client && (
                                                                    <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-cream-200">
                                                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-cream-100 bg-white shrink-0">
                                                                            <img
                                                                                src={client.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.full_name || 'C')}&background=F5F2EB&color=2C3230`}
                                                                                alt={client.full_name || "Client"}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <span className="text-[11px] font-medium text-charcoal-500">
                                                                            Student: <span className="font-bold text-charcoal-700">{client.full_name}</span>
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className={clsx(
                                                                'px-2 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider border shrink-0',
                                                                booking.status === 'completed'
                                                                    ? (booking.funds_unlocked ? 'bg-green-100/50 text-green-700 border-green-200' : 'bg-amber-100/50 text-amber-700 border-amber-200') :
                                                                    booking.status === 'approved' ? 'bg-blue-100/50 text-blue-700 border-blue-200' :
                                                                        booking.status === 'cancelled' ? 'bg-red-100/50 text-red-700 border-red-200' :
                                                                            booking.status === 'pending' ? 'bg-amber-100/50 text-amber-700 border-amber-200' :
                                                                                'bg-charcoal-100/50 text-charcoal-600 border-cream-200'
                                                            )}>
                                                                {booking.status === 'completed'
                                                                    ? (booking.funds_unlocked ? 'Funds Unlocked' : 'Funds Held (24h)') :
                                                                    booking.status === 'approved' ? 'Approved' :
                                                                        booking.status === 'cancelled' ? 'Cancelled' :
                                                                            booking.status === 'pending' ? 'Pending' :
                                                                                booking.status}
                                                            </span>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[13px] font-bold text-charcoal-900 leading-none">
                                                                {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-[11px] text-charcoal-500 font-medium mt-1">
                                                                {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-end justify-between text-xs mt-3 pt-3 border-t border-cream-200/50 gap-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-charcoal-400 shrink-0 mt-0.5" />
                                            <span className="font-semibold text-charcoal-700 leading-tight">
                                                {studioData?.location || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Box className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                                            <span className="font-semibold text-charcoal-700">
                                                {Array.isArray(slot?.equipment) && slot.equipment.length > 0
                                                    ? `${slot.equipment[0]} (${booking.quantity || 1})`
                                                    : (`${booking.price_breakdown?.equipment || booking.equipment || 'Standard Space'} (${booking.quantity || 1})`)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={clsx(
                                                "font-bold text-[13px] px-2 py-0.5 rounded border",
                                                ['completed', 'approved'].includes(booking.status)
                                                    ? "text-green-700 border-green-200 bg-green-50"
                                                    : "text-charcoal-500 border-cream-200 bg-cream-100"
                                            )}>
                                                Earnings: ₱{['completed', 'approved'].includes(booking.status) ? Number(studioFee || booking.total_price || 0).toLocaleString() : '0'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {instructor && instructor.id !== currentUserId && (
                                            <StudioChatButton bookingId={booking.id} currentUserId={currentUserId} partnerId={instructor.id} partnerName={instructor.full_name || 'Instructor'} label="Message Instructor" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
