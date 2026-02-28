'use client'

import { useState, useEffect } from 'react'
import { getPartnerBookings } from '@/app/(dashboard)/admin/actions'
import { X, Clock, CalendarX2, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    confirmed: 'bg-green-100 text-green-700',
    admin_approved: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-600',
    expired: 'bg-cream-100 text-charcoal-500',
    rejected: 'bg-red-100 text-red-600',
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
                "fixed inset-0 z-[9999] transition-opacity duration-300 ease-in-out",
                isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            style={{ transform: 'translateZ(0)' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-md transition-opacity z-0"
                onClick={onClose}
            />

            <div className={clsx(
                "absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out z-10",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}
                style={{ willChange: 'transform' }}
            >
                {/* Header */}
                <div className="px-6 py-5 bg-white border-b border-cream-200 flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                        <h2 className="text-xl font-serif font-bold text-charcoal-900 truncate">Bookings Summary</h2>
                        <p className="text-sm text-charcoal-500 font-medium truncate mt-0.5">
                            {partnerName} • <span className="capitalize">{partnerType === 'profile' ? 'Instructor' : 'Studio'}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-cream-100 rounded-full transition-colors text-charcoal-400 hover:text-charcoal-900"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-rose-gold animate-spin" />
                            <p className="text-sm text-charcoal-500">Loading bookings...</p>
                        </div>
                    ) : (
                        <>
                            {/* Active Bookings */}
                            <BookingSection title="Active Bookings" bookings={bookings.active} />

                            {/* Past Bookings */}
                            <BookingSection title="Past Bookings" bookings={bookings.past} />
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-400 mb-4">{title}</h3>
                <div className="bg-white border border-dashed border-cream-300 rounded-xl py-10 flex flex-col items-center justify-center text-center px-6">
                    <CalendarX2 className="w-8 h-8 text-charcoal-200 mb-2" />
                    <p className="text-sm text-charcoal-400">No {title.toLowerCase()} found.</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-charcoal-400 mb-4">{title}</h3>
            <div className="bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-charcoal-600">
                        <thead className="bg-cream-50 border-b border-cream-200">
                            <tr>
                                <th className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal-500">Date / Time</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal-500">Studio / Instructor</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-wider text-charcoal-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {bookings.map((booking: any) => {
                                const start = new Date(booking.slots?.start_time)
                                const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-cream-100 text-charcoal-500'

                                return (
                                    <tr key={booking.id} className="hover:bg-cream-50/60 transition-colors">
                                        {/* Date / Time */}
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-charcoal-900 border-l-2 border-rose-gold pl-2">
                                                {start.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-charcoal-500 flex items-center gap-1 mt-1 pl-2">
                                                <Clock className="w-3 h-3 text-rose-gold/60" />
                                                {start.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}
                                            </div>
                                        </td>

                                        {/* Studio / Instructor */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-cream-200 bg-cream-100">
                                                    <img
                                                        src={booking.instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`}
                                                        alt={booking.instructor?.full_name || 'Instructor'}
                                                        width={24}
                                                        height={24}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.instructor?.full_name || 'instructor')}`;
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-charcoal-900 truncate">
                                                        {booking.slots?.studios?.name || 'Unknown Studio'}
                                                    </p>
                                                    <p className="text-[10px] text-charcoal-400 truncate">
                                                        With {booking.instructor?.full_name || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <span className={clsx("inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", statusStyle)}>
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
