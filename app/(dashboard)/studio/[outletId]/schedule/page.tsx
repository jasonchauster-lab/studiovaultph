import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getManilaTodayStr, toManilaDateStr } from '@/lib/timezone'
import StudioScheduleCalendar from '@/components/dashboard/StudioScheduleCalendar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns'
import { getCachedStudio } from '@/lib/studio/data'
import { ScheduleService } from '@/lib/services/schedule'

type Params = Promise<{ outletId: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StudioSchedulePage(props: {
    params: Params
    searchParams: SearchParams
}) {
    const params = await props.params
    const searchParams = await props.searchParams
    const outletId = params.outletId
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    // 1. Fetch User's Studio (Handles both owner and staff)
    const studio = await getCachedStudio()
    if (!studio) redirect('/studio')

    // 2. Fetch the specific Outlet
    const { data: outlet } = await supabase
        .from('outlets')
        .select('*')
        .eq('id', outletId)
        .eq('studio_id', studio.id)
        .single()

    if (!outlet) redirect('/studio')
    
    const myStudio = studio

    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : getManilaTodayStr()
    const [year, month, day] = dateParam.split('-').map(Number)
    const currentDate = new Date(year, month - 1, day)

    const windowStart = addWeeks(currentDate, -1)
    const windowEnd = addWeeks(currentDate, 4)
    const windowStartStr = format(windowStart, 'yyyy-MM-dd')
    const windowEndStr = format(windowEnd, 'yyyy-MM-dd')

    // 3. Fetch Centralized Schedule Context
    const {
        slots,
        outlets,
        services,
        staffMembers,
        packagesCount,
        membershipsCount
    } = await ScheduleService.getScheduleContext(studio.id, {
        outletId,
        windowStart: windowStartStr,
        windowEnd: windowEndStr
    })

    const activeOutlet = outletId ? outlets?.find((o: any) => o.id === outletId) : null
    const instructors = ScheduleService.getInstructorsList(studio, staffMembers)
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
                        href={`/studio/${outletId}`}
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/50 hover:text-[#2D3282] uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-5xl font-black text-zinc-900 tracking-tightest font-atelier leading-tight">
                                {outlet.name} <span className="text-zinc-300 font-light">Schedule</span>
                            </h1>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-2">Manage slots, instructors, and equipment for this location.</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2.5rem] shadow-cloud border border-zinc-100 bg-white">
                    <StudioScheduleCalendar
                        studioId={studio.id}
                        outletId={outletId}
                        outlets={outlets || []}
                        slots={slots || []}
                        currentDate={currentDate}
                        dayStrings={dayStrings}
                        availableEquipment={studio.equipment || []}
                        inventory={(studio.inventory as any) || {}}
                        services={services || []}
                        instructors={instructors}
                        packagesCount={packagesCount || 0}
                        membershipsCount={membershipsCount || 0}
                        openingTime={activeOutlet?.opening_time || studio.opening_time || '06:00:00'}
                        closingTime={activeOutlet?.closing_time || studio.closing_time || '22:00:00'}
                        marketplaceStatus={studio.marketplace_status}
                    />
                </div>
            </div>
        </div>
    )
}
