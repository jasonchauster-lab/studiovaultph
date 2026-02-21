import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function InstructorSchedulePage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const dateParam = typeof searchParams.date === 'string' ? searchParams.date : new Date().toISOString().split('T')[0]
    const currentDate = new Date(dateParam)

    // Fetch existing availability
    const { data: availability } = await supabase
        .from('instructor_availability')
        .select('*')
        .eq('instructor_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

    return (
        <div className="min-h-screen bg-cream-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Schedule</h1>
                    <p className="text-charcoal-600">Set your weekly availability so customers can book you.</p>
                </div>

                <div className="bg-white overflow-hidden">
                    <InstructorScheduleCalendar availability={availability || []} currentDate={currentDate} />
                </div>
            </div>
        </div>
    )
}
