import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import StudioRentalList from '@/components/dashboard/StudioRentalList'

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
                slots (
                    date,
                    start_time,
                    end_time,
                    equipment,
                    studios (
                        id,
                        name,
                        location,
                        address,
                        owner_id,
                        logo_url
                    )
                ),
                instructor:profiles!instructor_id (
                    id,
                    full_name,
                    avatar_url
                ),
                client:profiles!client_id (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .in('slot_id', slotIds)
            .in('status', ['approved', 'completed', 'cancelled'])
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

                {/* Card List */}
                <StudioRentalList bookings={bookings || []} currentUserId={user.id} />
            </div >
        </div >
    )
}
