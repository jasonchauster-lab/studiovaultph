import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, DollarSign, User } from 'lucide-react'

export default async function StudioHistoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Get Studio ID
    const { data: studio } = await supabase
        .from('studios')
        .select('id, hourly_rate')
        .eq('owner_id', user.id)
        .single()

    if (!studio) {
        return <div className="p-8">Studio not found.</div>
    }

    // 2. Get all slot IDs belonging to this studio
    const { data: studioSlots } = await supabase
        .from('slots')
        .select('id')
        .eq('studio_id', studio.id)

    const slotIds = studioSlots?.map(s => s.id) ?? []

    // 3. Fetch Bookings for those specific slots
    const { data: bookings, error } = slotIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from('bookings')
            .select(`
                *,
                instructor:profiles!instructor_id(full_name, contact_number),
                slots(
                    start_time,
                    end_time,
                    equipment
                )
            `)
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Rental History</h1>
                <p className="text-charcoal-600">View past sessions and earnings history.</p>
            </div>

            <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-charcoal-600">
                        <thead className="bg-cream-50 text-charcoal-900 font-medium border-b border-cream-200">
                            <tr>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Instructor</th>
                                <th className="px-6 py-4">Equipment</th>
                                <th className="px-6 py-4 text-right">Earnings</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {!bookings || bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-charcoal-500">
                                        No past bookings found.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking: any) => {
                                    const start = new Date(booking.slots.start_time)
                                    const end = new Date(booking.slots.end_time)
                                    const studioFee = booking.price_breakdown?.studio_fee || 0;
                                    const qty = booking.price_breakdown?.quantity || 1;
                                    const equipmentType = booking.price_breakdown?.equipment || booking.equipment || 'Unknown';

                                    return (
                                        <tr key={booking.id} className="hover:bg-cream-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-charcoal-900">
                                                        {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-xs text-charcoal-500 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-charcoal-400" />
                                                    <span className="text-charcoal-900">{booking.instructor?.full_name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-charcoal-900 font-medium">{equipmentType}</span>
                                                    <span className="text-xs text-charcoal-500">Qty: {qty}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-charcoal-900">
                                                ₱{studioFee.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === 'confirmed' || booking.status === 'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
