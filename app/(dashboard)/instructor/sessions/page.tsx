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
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-16">
            <div className="relative">
                <Link
                    href="/instructor"
                    className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/20 hover:text-gold uppercase tracking-[0.3em] transition-all mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    BACK TO DASHBOARD
                </Link>
                <h1 className="text-5xl font-serif text-charcoal tracking-tighter mb-4">My Sessions</h1>
                <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em]">Comprehensive registry of past and future engagements.</p>
            </div>

            <div className="glass-card p-1 relative overflow-hidden bg-white/10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />
                <InstructorSessionList bookings={bookings || []} currentUserId={user.id} />
            </div>
        </div>
    )
}
