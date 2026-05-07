import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getManilaTodayStr } from '@/lib/timezone'
import StudioScheduleCalendar from '@/components/dashboard/StudioScheduleCalendar'
import Link from 'next/link'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'
import { startOfWeek, format, addWeeks } from 'date-fns'
import BranchPageSelector from '@/components/dashboard/BranchPageSelector'
import { getCachedStudio, getCachedUser } from '@/lib/studio/data'
import { ScheduleService } from '@/lib/services/schedule'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StudioSchedulePage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const outletId = typeof searchParams.outletId === 'string' ? searchParams.outletId : undefined
    
    const user = await getCachedUser()
    if (!user) redirect('/login')
    const supabase = await createClient()

    // 1. Fetch User's Studio (Handles both owner and staff)
    const studio = await getCachedStudio()
    if (!studio) redirect('/studio')

    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : getManilaTodayStr()
    const [year, month, day] = dateParam.split('-').map(Number)
    const currentDate = new Date(year, month - 1, day)

    const windowStart = addWeeks(currentDate, -1)
    const windowEnd = addWeeks(currentDate, 4)
    const windowStartStr = format(windowStart, 'yyyy-MM-dd')
    const windowEndStr = format(windowEnd, 'yyyy-MM-dd')

    // 2. Fetch Centralized Schedule Context
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
        <div className="min-h-screen p-8 lg:p-12 bg-zinc-50/50">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <Link
                        href={outletId ? `/studio?outletId=${outletId}` : '/studio'}
                        className="inline-flex items-center gap-3 text-[10px] font-black text-zinc-400 hover:text-indigo-600 uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-zinc-100 shadow-sm mb-6">
                            <CalendarIcon className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Schedule Management</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-tight">
                            Studio <span className="text-zinc-300">Calendar</span>
                        </h1>
                        
                        <div className="mt-8 flex justify-center">
                            <BranchPageSelector 
                                outlets={outlets || []} 
                                currentOutletId={outletId}
                                isGlobalAllowed={true}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 bg-white">
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
