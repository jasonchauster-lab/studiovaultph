'use client'

import { useState, useEffect } from 'react'
import { getPartnerBookings } from '@/app/(dashboard)/admin/actions'
import { X, Clock, CalendarX2, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
    approved: 'bg-forest/10 text-forest border-forest/20',
    completed: 'bg-stone-100 text-burgundy/60 border-stone-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    cancelled_refunded: 'bg-burgundy/10 text-burgundy border-burgundy/20',
    cancelled_charged: 'bg-burgundy/10 text-burgundy border-burgundy/20',
    expired: 'bg-stone-50 text-stone-400 border-stone-100',
    rejected: 'bg-burgundy/10 text-burgundy border-burgundy/20',
}

type Booking = any

export default function PartnerBookingsDrawer({
    partnerId,
    partnerName,
    partnerType,
    isOpen,
    onClose
}: {
    partnerId: string
    partnerName: string
    partnerType: 'profile' | 'studio'
    isOpen: boolean
    onClose: () => void
}) {
    const [bookings, setBookings] = useState<{ active: Booking[], past: Booking[] }>({ active: [], past: [] })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (isOpen && partnerId) {
            const fetchBookings = async () => {
                setIsLoading(true)
                const result = await getPartnerBookings(partnerId, partnerType)
                if ('error' in result) {
                    console.error(result.error)
                } else {
                    setBookings(result)
                }
                setIsLoading(false)
            }
            fetchBookings()
        }
    }, [isOpen, partnerId, partnerType])

    if (!partnerId) return null

    return (
        <div
            className={clsx(
                "fixed inset-0 z-[9999] transition-opacity duration-500 ease-in-out",
                isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            style={{ transform: 'translateZ(0)' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-burgundy/20 backdrop-blur-xl transition-opacity z-0"
                onClick={onClose}
            />

            <div className={clsx(
                "absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-500 ease-atelier z-10 border-l border-stone-200",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}
                style={{ willChange: 'transform' }}
            >
                {/* Header */}
                <div className="px-8 py-7 bg-white border-b border-stone-100 flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-2xl font-serif text-burgundy tracking-tighter">Operational Log</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em]">
                                {partnerName}
                            </p>
                            <span className="w-1 h-1 bg-stone-200 rounded-full" />
                            <p className="text-[10px] font-black text-forest uppercase tracking-[0.3em]">
                                {partnerType === 'profile' ? 'Instructor' : 'Studio'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="group p-2.5 hover:bg-stone-100 rounded-full transition-all text-stone-400 hover:text-burgundy"
                    >
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-12">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="w-10 h-10 text-forest animate-spin" />
                            <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-[0.4em]">Retrieving Intelligence...</p>
                        </div>
                    ) : (
                        <>
                            {/* Active Bookings */}
                            <BookingSection title="Active Engagements" bookings={bookings.active} />

                            {/* Past Bookings */}
                            <BookingSection title="Historical Records" bookings={bookings.past} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function BookingSection({ title, bookings }: { title: string, bookings: Booking[] }) {
    if (bookings.length === 0) {
        return (
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-burgundy/30">{title}</h3>
                    <div className="h-[1px] flex-1 bg-stone-100" />
                </div>
                <div className="bg-stone-50/50 border border-dashed border-stone-200 rounded-[24px] py-12 flex flex-col items-center justify-center text-center px-6">
                    <CalendarX2 className="w-10 h-10 text-stone-200 mb-4 stroke-[1px]" />
                    <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-widest italic">No matching records detected</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-burgundy/30">{title}</h3>
                <div className="h-[1px] flex-1 bg-stone-100" />
                <span className="text-[9px] font-black text-forest uppercase tracking-widest">{bookings.length} Records</span>
            </div>
            
            <div className="bg-white border border-stone-100 rounded-[28px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-stone-100">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-burgundy/40">Chronology</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-burgundy/40">Associates</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-burgundy/40 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {bookings.map((booking: any) => {
                                const getFirst = (v: any) => Array.isArray(v) ? v[0] : v
                                const slot = getFirst(booking.slots)
                                const start = slot?.date && slot?.start_time
                                    ? new Date(`${slot.date}T${slot.start_time}+08:00`)
                                    : new Date()
                                const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-stone-100 text-stone-500 border-stone-200'

                                return (
                                    <tr key={booking.id} className="hover:bg-stone-50/50 transition-colors group">
                                        {/* Date / Time */}
                                        <td className="px-6 py-5">
                                            <div className="font-serif text-[15px] text-burgundy group-hover:translate-x-1 transition-transform">
                                                {start.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-burgundy/40 flex items-center gap-2 mt-1 font-black uppercase tracking-widest">
                                                <Clock className="w-3 h-3 text-forest/40" />
                                                {start.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </td>

                                        {/* Studio / Instructor */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-stone-100 bg-stone-50 shadow-inner">
                                                    <img
                                                        src={booking.instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`}
                                                        alt={booking.instructor?.full_name || 'Instructor'}
                                                        className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`;
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-serif font-medium text-burgundy truncate">
                                                        {slot?.studios?.name || 'Unknown Studio'}
                                                    </p>
                                                    <p className="text-[9px] font-black text-burgundy/30 uppercase tracking-widest truncate mt-0.5">
                                                        With {booking.instructor?.full_name || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-5 text-right">
                                            <span className={clsx(
                                                "inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all group-hover:shadow",
                                                statusStyle
                                            )}>
                                                {booking.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
