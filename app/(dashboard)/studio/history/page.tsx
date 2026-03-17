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
                    avatar_url,
                    email,
                    medical_conditions,
                    other_medical_condition,
                    bio
                )
            `)
            .in('slot_id', slotIds)
            .in('status', ['approved', 'completed', 'cancelled_refunded', 'cancelled_charged'])
            .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-cream-50 px-4 py-6 sm:p-10">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-0 sm:px-0">
                    <div>
                        <h1 className="text-xl sm:text-4xl font-serif font-bold text-charcoal-900 mb-0.5">Rental History</h1>
                        <p className="text-charcoal-500 text-[10px] sm:text-sm">Past sessions and earnings for your studio.</p>
                    </div>
                    <Link
                        href="/studio"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-forest text-white text-[10px] sm:text-sm font-bold rounded-lg shadow-sm hover:bg-forest/90 active:scale-95 transition-all shrink-0"
                    >
                        <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Add Slot</span>
                        <span className="sm:hidden">Slot</span>
                    </Link>
                </div>

                {/* Card List */}
                <StudioRentalList bookings={bookings || []} currentUserId={user.id} />
            </div >
        </div >
    )
}
