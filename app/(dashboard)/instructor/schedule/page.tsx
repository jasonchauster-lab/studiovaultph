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

    const { addWeeks, format } = await import('date-fns')
    const windowStart = addWeeks(currentDate, -4)
    const windowEnd = addWeeks(currentDate, 12) // Fetch 3 months of data for smooth scrolling
    const windowStartStr = format(windowStart, 'yyyy-MM-dd')
    const windowEndStr = format(windowEnd, 'yyyy-MM-dd')

    // Fetch existing availability, profile, and bookings with windowed filtering
    const [availabilityRes, profileRes, bookingsRes] = await Promise.all([
        supabase
            .from('instructor_availability')
            .select('*')
            .eq('instructor_id', user.id)
            .or(`date.is.null,and(date.gte.${windowStartStr},date.lte.${windowEndStr})`)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true }),
        supabase
            .from('profiles')
            .select('id, teaching_equipment, rates, home_base_address')
            .eq('id', user.id)
            .single(),
        supabase
            .from('bookings')
            .select(`
                *,
                slots!inner (date, start_time, end_time, studios (id, name, location, address, logo_url, google_maps_url)),
                client:profiles!client_id (id, full_name, avatar_url, email, date_of_birth, medical_conditions, other_medical_condition, bio)
            `)
            .eq('instructor_id', user.id)
            .gte('slots.date', windowStartStr)
            .lte('slots.date', windowEndStr)
            .in('status', ['approved', 'completed', 'pending', 'cancelled_refunded', 'cancelled_charged', 'rejected'])
            .order('created_at', { ascending: false })
    ])

    const availability = availabilityRes.data
    const profile = profileRes.data
    const bookings = bookingsRes.data || []

    return (
        <div className="min-h-screen p-8 lg:p-12 bg-cream-50/30">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/50 hover:text-forest uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-2xl sm:text-5xl font-serif text-charcoal tracking-tighter mb-4">Instructor Schedule</h1>
                    <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em]">Manage your availability and upcoming student sessions.</p>
                </div>

                <div className="overflow-hidden rounded-[2.5rem] shadow-cloud border border-white/60 bg-white">
                    <InstructorScheduleCalendar
                        availability={availability || []}
                        bookings={bookings}
                        currentUserId={user.id}
                        currentDate={currentDate}
                        instructorProfile={profile}
                    />
                </div>
            </div>
        </div>
    )
}
