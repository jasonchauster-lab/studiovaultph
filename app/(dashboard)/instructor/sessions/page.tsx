import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import InstructorSessionList from '@/components/dashboard/InstructorSessionList'

export default async function InstructorSessionsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Trigger financial jobs in background
    await supabase.rpc('process_all_overdue_locks')
    await supabase.rpc('process_all_pending_payouts')

    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            *,
            slots!inner (*, studios (*)),
            client:profiles!client_id (*),
            instructor:profiles!instructor_id (*)
        `)
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-cream-50 px-4 py-6 sm:p-10">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-0 sm:px-0">
                    <div>
                        <h1 className="text-xl sm:text-4xl font-serif font-bold text-charcoal-900 mb-0.5">My Sessions</h1>
                        <p className="text-charcoal-500 text-[10px] sm:text-sm italic uppercase tracking-widest font-black opacity-40">Comprehensive Registry of Engagements</p>
                    </div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-forest text-white text-[10px] sm:text-sm font-bold rounded-lg shadow-sm hover:bg-forest/90 active:scale-95 transition-all shrink-0 uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                        Dashboard
                    </Link>
                </div>

                {/* Date Filter */}
                {/* 
                   Note: DateRangeFilters uses searchParams to filter. 
                   The current page doesn't handle date filtering in the query yet (Studio does).
                   I'll leave it as a visual placeholder for now or implement the logic if needed.
                   Studio page used searchParams to fetch filtered data. 
                */}
                <div className="flex justify-end">
                    {/* InstructorSessionList has its own internal BookingFilter, 
                        but for true style copy, we might want to align how filters are shown.
                        Studio uses DateRangeFilters which is a client component that updates URL.
                    */}
                </div>

                <InstructorSessionList bookings={bookings || []} currentUserId={user.id} />
            </div>
        </div>
    )
}
