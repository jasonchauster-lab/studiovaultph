import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Plus, ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import StudioRentalList from '@/components/dashboard/StudioRentalList'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'

import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import { getCachedStudio, getCachedUser } from '@/lib/studio/data'

export default async function StudioHistoryPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const range = searchParams.range as string | undefined
    const supabase = await createClient()

    const user = await getCachedUser()
    if (!user) redirect('/login')

    // 1. Get Studio ID (supports both owner and staff)
    const studio = await getCachedStudio()

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
        // Show all by default (RPC handles null as unlimited)
        startDate = undefined
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

    const actions = (
        <div className="flex items-center gap-3">
            <Link
                href="/studio/schedule"
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2D3282] rounded-lg text-[11px] font-bold uppercase tracking-widest text-white hover:bg-indigo-900 transition-all shadow-md active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Add Session
            </Link>
        </div>
    )

    return (
        <div className="min-h-screen p-8 lg:p-12 bg-[#F9F9F9]">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-3 px-3 py-1 bg-white rounded-full border border-zinc-100 shadow-sm mb-4">
                            <Clock className="w-3.5 h-3.5 text-[#2D3282]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Operations</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-tight">
                            Booking <span className="text-zinc-300">History</span>
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <DateRangeFilters />
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-[2.5rem] shadow-cloud border border-zinc-100 overflow-hidden">
                    <div className="p-8 lg:p-10">
                        <StudioRentalList bookings={formattedBookings || []} currentUserId={user.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
