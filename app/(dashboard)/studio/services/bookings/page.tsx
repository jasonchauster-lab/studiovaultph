import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Search, Calendar, User, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, Layers } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'

export default async function StudioServiceBookingsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!studio) redirect('/onboarding')

    // Fetch bookings specifically for this studio
    // We join with profiles and slots to get the details
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            created_at,
            total_price,
            payment_status,
            client:profiles!client_id(full_name, avatar_url, email),
            slots!inner(
                date,
                start_time,
                end_time,
                services:services(name, category)
            )
        `)
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching service bookings:', error)
    }

    return (
        <StudioDashboardShell 
            title="Bookings"
            breadcrumbs={[{ label: 'Services', href: '/studio/services' }, { label: 'Bookings' }]}
        >
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Manage Bookings</h1>
                        <p className="text-sm text-zinc-500 mt-1">View and manage all attendees for your classes and appointments.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#2D3282] transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search attendee..."
                                className="pl-12 pr-6 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all min-w-[300px]"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Attendee</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Service</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Schedule</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {(!bookings || bookings.length === 0) ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                <Calendar className="w-12 h-12" />
                                                <p className="text-sm font-bold uppercase tracking-widest">No bookings found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((booking: any) => {
                                        const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
                                        const service = slot?.services || { name: 'Unknown' }
                                        const client = booking.client || { full_name: 'Guest User' }
                                        
                                        return (
                                            <tr key={booking.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center overflow-hidden border border-zinc-200">
                                                            {client.avatar_url ? (
                                                                <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-5 h-5 text-zinc-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-zinc-900 group-hover:text-[#2D3282] transition-colors">
                                                                {client.full_name}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-400 font-medium">{client.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="w-3 h-3 text-indigo-400" />
                                                            <span className="text-[12px] font-bold text-zinc-700">{service.name}</span>
                                                        </div>
                                                        <span className="text-[9px] text-zinc-400 uppercase tracking-widest mt-1 font-bold">{service.category || 'Class'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-800">
                                                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                            {slot ? format(new Date(slot.date), 'EEE, MMM d') : 'N/A'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-medium">
                                                            <Clock className="w-3 h-3" />
                                                            {slot?.start_time} - {slot?.end_time}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className={clsx(
                                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                                        booking.status === 'approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                                        booking.status === 'pending' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                                        "bg-rose-50 text-rose-600 border border-rose-100"
                                                    )}>
                                                        {booking.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                                        {booking.status === 'pending' && <Clock className="w-3 h-3" />}
                                                        {booking.status === 'cancelled_refunded' && <XCircle className="w-3 h-3" />}
                                                        {booking.status}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-black text-zinc-900 tracking-tight">₱{booking.total_price}</span>
                                                        <span className={clsx(
                                                            "text-[9px] font-bold uppercase tracking-widest mt-1",
                                                            booking.payment_status === 'paid' ? "text-emerald-500" : "text-amber-500"
                                                        )}>
                                                            {booking.payment_status}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}
