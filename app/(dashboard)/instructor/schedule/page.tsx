import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getManilaTodayStr } from '@/lib/timezone'
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function InstructorSchedulePage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : getManilaTodayStr()
    const currentDate = new Date(dateParam)

    // Fetch existing availability
    const { data: availability } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

    return (
        <div className="min-h-screen p-8 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/20 hover:text-gold uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-5xl font-serif text-charcoal tracking-tighter mb-4">My Schedule</h1>
                    <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em]">Set your weekly availability so customers can book you.</p>
                </div>

                <div className="overflow-hidden rounded-[2.5rem] shadow-cloud border border-white/60">
                    <InstructorScheduleCalendar availability={availability || []} currentDate={currentDate} />
                </div>
            </div>
        </div>
    )
}
