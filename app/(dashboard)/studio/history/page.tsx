import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Clock, CalendarX2, PlusCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_STYLES: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-600',
    expired: 'bg-cream-100 text-charcoal-500',
}

export default async function StudioHistoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 1. Get Studio ID
    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!studio) {
        return <div className="p-8">Studio not found.</div>
    }

    // 2. Get all slot IDs for this studio
    const { data: studioSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studio.id)

    const slotIds = studioSlots?.map(s => s.id) ?? []

    // 3. Fetch bookings with instructor details (including avatar)
    const { data: bookings } = slotIds.length === 0
        ? { data: [] }
        : await supabase
            .from('bookings')
            .select(`
                *,
                instructor:profiles!instructor_id(full_name, avatar_url),
                slots(
                    start_time,
                    end_time,
                    equipment
                )
            `)
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-cream-50 p-6 sm:p-10">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-charcoal-900 mb-1">Rental History</h1>
                        <p className="text-charcoal-600 text-sm">Past sessions and earnings for your studio.</p>
                    </div>
                    <Link
                        href="/studio"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-gold text-white text-sm font-semibold rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Availability Slot
                    </Link>
                </div>

                {/* Table card */}
                <div className="bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
                    {!bookings || bookings.length === 0 ? (
                        /* ── Empty State ── */
                        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-5">
                                <CalendarX2 className="w-8 h-8 text-charcoal-300" />
                            </div>
                            <h3 className="text-lg font-serif text-charcoal-900 mb-2">Your history is empty.</h3>
                            <p className="text-charcoal-500 text-sm max-w-sm mb-6">
                                Start monetizing your idle reformers by adding availability slots — instructors can book them instantly.
                            </p>
                            <Link
                                href="/studio"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-gold text-white font-semibold rounded-lg shadow hover:brightness-110 active:scale-95 transition-all"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add Your First Slot
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-charcoal-600">
                                <thead className="bg-cream-50 border-b border-cream-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-charcoal-500">Date / Time</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-charcoal-500">Instructor</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-charcoal-500">Equipment</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-charcoal-500">Duration</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-charcoal-500 text-right">Earnings</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-charcoal-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cream-100">
                                    {bookings.map((booking: any) => {
                                        const start = new Date(booking.slots?.start_time)
                                        const end = new Date(booking.slots?.end_time)
                                        const durationMins = Math.round((end.getTime() - start.getTime()) / 60000)
                                        const durationStr = durationMins >= 60
                                            ? `${Math.floor(durationMins / 60)}h${durationMins % 60 ? ` ${durationMins % 60}m` : ''}`
                                            : `${durationMins}m`

                                        const studioFee = booking.price_breakdown?.studio_fee ?? 0
                                        const qty = booking.price_breakdown?.quantity ?? 1
                                        const equipmentType = booking.price_breakdown?.equipment || (booking.slots?.equipment?.[0]) || '—'
                                        const instructor = Array.isArray(booking.instructor) ? booking.instructor[0] : booking.instructor
                                        const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-cream-100 text-charcoal-500'

                                        return (
                                            <tr key={booking.id} className="hover:bg-cream-50/60 transition-colors">
                                                {/* Date / Time */}
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-charcoal-900">
                                                        {start.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="text-xs text-charcoal-500 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {start.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}
                                                    </div>
                                                </td>

                                                {/* Instructor */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-cream-100 border border-cream-200 shrink-0">
                                                            <img
                                                                src={instructor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor?.full_name || 'instructor')}`}
                                                                alt={instructor?.full_name || 'Instructor'}
                                                                width={32}
                                                                height={32}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor?.full_name || 'instructor')}`;
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-charcoal-900 font-medium">
                                                            {instructor?.full_name || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Equipment */}
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 bg-cream-100 text-charcoal-700 text-xs font-semibold rounded-full">
                                                        {equipmentType}
                                                    </span>
                                                    {qty > 1 && (
                                                        <span className="ml-1.5 text-xs text-charcoal-400">×{qty}</span>
                                                    )}
                                                </td>

                                                {/* Duration */}
                                                <td className="px-6 py-4 text-charcoal-700 font-medium">
                                                    {durationStr}
                                                </td>

                                                {/* Earnings */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-semibold text-charcoal-900 font-serif">
                                                        ₱{Number(studioFee).toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle}`}>
                                                        {booking.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
