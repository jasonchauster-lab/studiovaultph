import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getManilaTodayStr, toManilaDateStr } from '@/lib/timezone'
import StudioScheduleCalendar from '@/components/dashboard/StudioScheduleCalendar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StudioSchedulePage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch user's studio
    const { data: studios } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)

    const myStudio = studios?.[0]
    if (!myStudio) redirect('/studio')

    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : getManilaTodayStr()
    const [year, month, day] = dateParam.split('-').map(Number)
    const currentDate = new Date(year, month - 1, day)

    const windowStart = addWeeks(currentDate, -4)
    const windowEnd = addWeeks(currentDate, 12)
    const windowStartStr = format(windowStart, 'yyyy-MM-dd')
    const windowEndStr = format(windowEnd, 'yyyy-MM-dd')

    // Fetch slots within window
    const { data: slots } = await supabase
        .from('slots')
        .select(`
            *,
            bookings(
                id, 
                status, 
                created_at, 
                updated_at, 
                equipment, 
                quantity, 
                price_breakdown,
                client:profiles!client_id(full_name, avatar_url),
                instructor:profiles!instructor_id(full_name, avatar_url)
            )
        `)
        .eq('studio_id', myStudio.id)
        .gte('date', windowStartStr)
        .lte('date', windowEndStr)

    // Calculate dayStrings for the current week (StudioScheduleCalendar might use it)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const dayStrings: string[] = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        dayStrings.push(format(d, 'yyyy-MM-dd'))
    }

    return (
        <div className="min-h-screen p-8 lg:p-12 bg-cream-50/30">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href="/studio"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/50 hover:text-forest uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-5xl font-serif text-charcoal tracking-tighter mb-4">Studio Schedule</h1>
                            <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em]">Manage slots, instructors, and equipment availability.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2.5rem] shadow-cloud border border-white/60 bg-white">
                    <StudioScheduleCalendar
                        studioId={myStudio.id}
                        slots={slots || []}
                        currentDate={currentDate}
                        dayStrings={dayStrings}
                        availableEquipment={myStudio.equipment || []}
                    />
                </div>
            </div>
        </div>
    )
}
