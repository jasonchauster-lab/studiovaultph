import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import StudioRentalList from '@/components/dashboard/StudioRentalList'

import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'

export default async function StudioHistoryPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const range = searchParams.range as string | undefined
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

    // --- DATE FILTER LOGIC ---
    let startDate: string | undefined
    let endDate: string | undefined

    if (range && range !== 'all') {
        const now = new Date()
        if (range === '7d') {
            startDate = format(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
            endDate = format(now, 'yyyy-MM-dd')
        } else if (range === '30d') {
            startDate = format(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
            endDate = format(now, 'yyyy-MM-dd')
        } else if (range === 'this-month') {
            startDate = format(startOfMonth(now), 'yyyy-MM-dd')
            endDate = format(endOfMonth(now), 'yyyy-MM-dd')
        } else if (range === 'last-month') {
            const lastMonth = subMonths(now, 1)
            startDate = format(startOfMonth(lastMonth), 'yyyy-MM-dd')
            endDate = format(endOfMonth(lastMonth), 'yyyy-MM-dd')
        }
    } else if (!range) {
        // Default to last 3 months for performance
        startDate = format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd')
    }
    // --- END DATE FILTER LOGIC ---

    // 2. Fetch bookings via RPC
    const { data: bookings, error } = await supabase.rpc('get_studio_rental_history_v2', {
        p_studio_id: studio.id,
        p_start_date: startDate || null,
        p_end_date: endDate || null
    })

    if (error) {
        console.error('Error fetching studio history via RPC:', error)
    }

    // Map RPC table result to the format expected by StudioRentalList
    // (StudioRentalList expects bookings.slots to be an object/array)
    const formattedBookings = (bookings || []).map((b: any) => ({
        ...b,
        slots: {
            date: b.session_date,
            start_time: b.start_time,
            end_time: b.end_time,
            equipment: b.equipment,
            studios: {
                id: studio.id,
                name: b.studio_name
            }
        },
        instructor: b.instructor_id ? {
            id: b.instructor_id,
            full_name: b.instructor_name,
            avatar_url: b.instructor_avatar
        } : null,
        client: {
            id: b.client_id,
            full_name: b.client_name,
            avatar_url: b.client_avatar,
            email: b.client_email,
            medical_conditions: b.client_medical,
            other_medical_condition: b.client_other_medical,
            bio: b.client_bio
        }
    }))

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

                {/* Date Filter */}
                <div className="flex justify-end">
                    <DateRangeFilters />
                </div>

                {/* Card List */}
                <StudioRentalList bookings={formattedBookings || []} currentUserId={user.id} />
            </div >
        </div >
    )
}
