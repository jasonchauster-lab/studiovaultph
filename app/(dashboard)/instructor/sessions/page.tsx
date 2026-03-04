import { createClient } from '@/lib/supabase/server'
import { autoCompleteBookings, unlockMaturedFunds, expireAbandonedBookings } from '@/lib/wallet'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import InstructorSessionList from '@/components/dashboard/InstructorSessionList'

export default async function InstructorSessionsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Run financial jobs lazily when page is loaded
    await Promise.allSettled([
        autoCompleteBookings(),
        unlockMaturedFunds(),
        expireAbandonedBookings(),
    ])

    // Fetch instructor's bookings (where they booked a studio slot for themselves)
    const { data: bookings } = await supabase
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
            client:profiles!client_id (
                id,
                full_name,
                avatar_url,
                email,
                medical_conditions
            ),
            instructor:profiles!instructor_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('instructor_id', user.id)
        .in('status', ['approved', 'completed', 'cancelled'])
        .order('created_at', { ascending: false })



    return (
        <div className="min-h-screen bg-cream-50 p-8">
            <div className="max-w-4xl mx-auto space-y-12">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Sessions</h1>
                    <p className="text-charcoal-600">Track studio slots you've booked and leave reviews after sessions.</p>
                </div>

                <InstructorSessionList bookings={bookings || []} currentUserId={user.id} />
            </div>
        </div>
    )
}
