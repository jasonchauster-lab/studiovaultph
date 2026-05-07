import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { BarChart3, TrendingUp, Users, Calendar, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { startOfWeek, subWeeks, subDays, format, isAfter, isBefore, parseISO } from 'date-fns'

type Params = Promise<{ outletId: string }>

export default async function OutletReportsPage(props: {
    params: Params
}) {
    const params = await props.params
    const outletId = params.outletId
    const supabase = await createClient()

    // 1. Get Current User & Studio context
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 2. Fetch the specific Outlet
    const { data: outlet } = await supabase
        .from('outlets')
        .select(`
            *,
            studio:studios(*)
        `)
        .eq('id', outletId)
        .single()

    if (!outlet) redirect('/studio')
    
    const myStudio = outlet.studio

    // 3. Fetch Data for Analysis (Last 60 days)
    const sixtyDaysAgo = subDays(new Date(), 60).toISOString()
    
    // We filter bookings that belong to slots in this outlet
    // Note: In a production app, we would ideally have outlet_id on the bookings table.
    // Here we fetch all studio bookings and filter in memory to keep it simple, 
    // or we could use an inner join filter if supported.
    const { data: bookings } = await supabase
        .from('bookings')
        .select(`
            id, 
            status, 
            created_at, 
            client_id, 
            price_breakdown,
            slots!inner (
                date,
                session_type,
                pax_capacity,
                outlet_id
            )
        `)
        .eq('slots.outlet_id', outletId)
        .neq('status', 'cancelled')
        .gte('created_at', sixtyDaysAgo)

    // 4. Analytics Aggregation (Scoped to Outlet)
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    
    const weeks = Array.from({ length: 7 }, (_, i) => {
        const start = startOfWeek(subWeeks(now, 6 - i))
        const end = subDays(subWeeks(now, 5 - i), 1)
        return { start, end, amount: 0 }
    })

    const sessionTypeStats: Record<string, { booked: number, pax_capacity: number }> = {}
    const studioClients = new Set<string>()
    const repeatClients = new Set<string>()
    const newClientsThisMonth = new Set<string>()
    const dayCounts: Record<string, number> = {}

    if (bookings) {
        bookings.forEach(b => {
            const bookingDate = parseISO(b.created_at)
            const studioFee = Number(b.price_breakdown?.studio_fee || 0)
            const sessionType = (b.slots as any)?.session_type || 'Other'
            const capacity = (b.slots as any)?.pax_capacity || 1
            const dayName = (b.slots as any)?.date ? format(parseISO((b.slots as any).date), 'EEEE') : 'Unknown'

            weeks.forEach(w => {
                if (isAfter(bookingDate, w.start) && isBefore(bookingDate, subDays(subWeeks(w.start, -1), 1))) {
                    w.amount += studioFee
                }
            })

            if (isAfter(bookingDate, thirtyDaysAgo)) {
                if (!sessionTypeStats[sessionType]) {
                    sessionTypeStats[sessionType] = { booked: 0, pax_capacity: 0 }
                }
                sessionTypeStats[sessionType].booked += 1
                sessionTypeStats[sessionType].pax_capacity += capacity

                if (dayName !== 'Unknown') {
                    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
                }
                
                if (!studioClients.has(b.client_id)) {
                    newClientsThisMonth.add(b.client_id)
                }
            }

            if (studioClients.has(b.client_id)) {
                repeatClients.add(b.client_id)
            }
            studioClients.add(b.client_id)
        })
    }

    const maxRevenue = Math.max(...weeks.map(w => w.amount)) || 1
    const revenueTrend = weeks.map(w => ({
        amount: w.amount,
        height: Math.max(10, (w.amount / maxRevenue) * 100)
    }))

    const occupancyRates = Object.entries(sessionTypeStats).map(([label, stats]) => ({
        label,
        value: Math.round((stats.booked / (stats.pax_capacity || 1)) * 100),
        color: label.toLowerCase().includes('private') ? 'bg-emerald-500' : label.toLowerCase().includes('duet') ? 'bg-[#2D3282]' : 'bg-amber-500'
    })).slice(0, 3)

    if (occupancyRates.length === 0) {
        occupancyRates.push({ label: 'No Recent Sessions', value: 0, color: 'bg-zinc-200' })
    }

    const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
    const retentionRate = studioClients.size > 0 ? Math.round((repeatClients.size / studioClients.size) * 100) : 0
    
    const prevWeekRevenue = weeks[5].amount
    const currWeekRevenue = weeks[6].amount
    const revenueGrowthValue = prevWeekRevenue > 0 
        ? Math.round(((currWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
        : 0
    const revenueGrowthLabel = revenueGrowthValue >= 0 ? `+${revenueGrowthValue}%` : `${revenueGrowthValue}%`

    const reportActions = (
        <button className="flex items-center gap-2 px-6 py-3 bg-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#2D3282] transition-all shadow-xl">
            <Download className="w-4 h-4" />
            Export Branch Report
        </button>
    )

    return (
        <div className="max-w-7xl mx-auto py-10 px-6 space-y-12">
            <div>
                 <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier text-6xl leading-tight">
                    {outlet.name} <span className="text-zinc-300 font-light">Performance</span>
                </h1>
                <p className="text-sm text-zinc-500 font-medium tracking-tight mt-2">Deep dive into this branch&apos;s performance. Monitor revenue growth, occupancy trends, and client retention patterns.</p>
            </div>

            <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-10">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-zinc-900 tracking-tight font-atelier lowercase italic">Revenue Growth</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Calculated Weekly</p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">
                                {revenueGrowthLabel} {currWeekRevenue >= prevWeekRevenue ? 'this week' : 'last week' }
                            </span>
                        </div>
                        <div className="h-64 flex items-end justify-between gap-4 px-4">
                            {revenueTrend.map((data, i) => (
                                <div key={i} className="flex-1 group relative">
                                    <div 
                                        className="w-full bg-zinc-50 rounded-2xl group-hover:bg-[#2D3282] transition-all duration-700" 
                                        style={{ height: `${data.height}%` }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-zinc-900 text-white text-[9px] font-black py-1.5 px-3 rounded-lg shadow-xl">
                                            ₱{data.amount.toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-center mt-4 text-[9px] font-black text-zinc-300 uppercase tracking-widest">W{i+1}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-10">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-zinc-900 tracking-tight font-atelier lowercase italic">Occupancy Rate</h3>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">By Session Type</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div className="space-y-8">
                            {occupancyRates.map((stat, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                                        <span className="text-sm font-black text-zinc-900">{stat.value}%</span>
                                    </div>
                                    <div className="h-3 bg-zinc-50 rounded-full overflow-hidden">
                                        <div className={`h-full ${stat.color} rounded-full transition-all duration-1000`} style={{ width: `${stat.value}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: 'New Customer Growth', val: newClientsThisMonth.size.toString(), icon: Users },
                        { title: 'Avg. Retention Rate', val: `${retentionRate}%`, icon: BarChart3 },
                        { title: 'Peak Booking Day', val: peakDay, icon: Calendar }
                    ].map((insight, i) => (
                        <div key={i} className="bg-white p-8 rounded-[2rem] border border-zinc-100 hover:border-zinc-200 transition-colors space-y-4 group">
                            <div className="w-10 h-10 bg-zinc-50 group-hover:bg-[#2D3282]/5 rounded-xl flex items-center justify-center transition-colors">
                                <insight.icon className="w-5 h-5 text-zinc-400 group-hover:text-[#2D3282] transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{insight.title}</p>
                                <h4 className="text-xl font-black text-zinc-900">{insight.val}</h4>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    {reportActions}
                </div>
            </div>
        </div>
    )
}
