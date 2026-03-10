import { getInstructorEarnings } from '../actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getManilaTodayStr } from '@/lib/timezone'
import InstructorEarningsClient from '@/components/instructor/InstructorEarningsClient'

export default async function EarningsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const range = searchParams.range as string | undefined

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // --- DATE FILTER LOGIC ---
    let startDate: string | undefined
    let endDate: string | undefined

    if (range && range !== 'all') {
        const todayStr = getManilaTodayStr()
        const now = new Date(todayStr)

        if (range === '7d') {
            const d = new Date(now)
            d.setDate(d.getDate() - 7)
            startDate = d.toISOString().split('T')[0]
            endDate = todayStr
        } else if (range === '30d') {
            const d = new Date(now)
            d.setDate(d.getDate() - 30)
            startDate = d.toISOString().split('T')[0]
            endDate = todayStr
        } else if (range === 'this-month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
            endDate = lastDay
        } else if (range === 'this-quarter') {
            const quarter = Math.floor(now.getMonth() / 3)
            startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
            const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0]
            endDate = lastDay
        } else if (range === 'this-year') {
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
            endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        }
    }

    const data = await getInstructorEarnings(startDate, endDate)

    if (data.error) {
        return (
            <div className="p-12 text-center">
                <div className="bg-red-50/20 p-8 rounded-[2rem] border border-red-100 inline-block">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Failed to synchronise earnings data</p>
                    <p className="text-[10px] mt-2">{data.error}</p>
                </div>
            </div>
        )
    }

    return (
        <InstructorEarningsClient data={data} />
    )
}
