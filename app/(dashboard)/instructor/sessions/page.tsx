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
        <div className="px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto space-y-10 sm:space-y-16 py-6 sm:py-12">
            <div className="relative">
                <Link
                    href="/instructor"
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-forest text-white text-[9px] font-black uppercase tracking-[0.25em] rounded-xl transition-all mb-8 shadow-tight hover:brightness-110 active:scale-95"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    DASHBOARD
                </Link>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl sm:text-5xl font-serif text-charcoal tracking-tighter">My Sessions</h1>
                    <p className="text-[9px] sm:text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] max-w-xs sm:max-w-none">
                        Comprehensive registry of past and future engagements.
                    </p>
                </div>
            </div>

            <div className="glass-card p-1 relative overflow-hidden bg-white/10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />
                <InstructorSessionList bookings={bookings || []} currentUserId={user.id} />
            </div>
        </div>
    )
}
