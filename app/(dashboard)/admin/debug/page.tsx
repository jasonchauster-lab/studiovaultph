import { createAdminClient } from '@/lib/supabase/server'
import { getAdminAnalytics } from '../actions'

export default async function AdminDebugPage() {
    const supabase = createAdminClient()
    const diagnostics: any = {}

    const runQuery = async (name: string, p: any) => {
        try {
            console.log(`[Debug] Running ${name}...`)
            const res = await p
            if (res.error) {
                diagnostics[name] = { status: 'ERROR', message: res.error.message, code: res.error.code }
            } else {
                diagnostics[name] = { status: 'SUCCESS', count: Array.isArray(res.data) ? res.data.length : 'N/A' }
            }
        } catch (err: any) {
            diagnostics[name] = { status: 'CRASH', message: err.message, stack: err.stack }
        }
    }

    await Promise.all([
        runQuery('1_Certs', supabase.from('certifications').select('*, profiles(full_name)').eq('verified', false).limit(1)),
        runQuery('2_Studios', supabase.from('studios').select('*, profiles(full_name)').eq('verified', false).limit(1)),
        runQuery('3_PayoutSetup', supabase.from('studios').select('id, profiles(full_name)').eq('payout_approval_status', 'pending').limit(1)),
        runQuery('4_BookingsComplex', supabase.from('bookings').select(`*, client:profiles!client_id(full_name), instructor:profiles!instructor_id(full_name), slots(date, studios(name, profiles!owner_id(full_name)))`).eq('status', 'pending').limit(1)),
        runQuery('5_InstrPayouts', supabase.from('payout_requests').select('*, instructor:profiles!instructor_id(full_name)').eq('status', 'pending').not('instructor_id', 'is', null).limit(1)),
        runQuery('6_StudioPayouts', supabase.from('payout_requests').select('*, studios(name, profiles(full_name))').eq('status', 'pending').not('studio_id', 'is', null).limit(1)),
        runQuery('7_CustPayouts', supabase.from('payout_requests').select('*, profile:profiles!user_id(full_name)').eq('status', 'pending').not('user_id', 'is', null).is('instructor_id', null).limit(1)),
        runQuery('8_TopUps', supabase.from('wallet_top_ups').select('*, profiles:profiles!user_id(full_name)').eq('status', 'pending').limit(1)),
        runQuery('9_Suspended', supabase.from('profiles').select('id').eq('is_suspended', true).limit(1)),
        runQuery('10_Analytics', getAdminAnalytics()),
        runQuery('11_NegBalance', supabase.from('profiles').select('id').eq('role', 'instructor').lt('available_balance', 0).limit(1)),
        runQuery('12_ActivityLogs', supabase.from('admin_activity_logs').select('id, admin:profiles!admin_id(full_name)').limit(1)),
        runQuery('13_AllUsers', supabase.from('profiles').select('id').limit(1)),
    ])

    return (
        <div className="p-12 space-y-8 bg-alabaster min-h-screen font-mono">
            <h1 className="text-3xl font-black text-charcoal tracking-tighter uppercase">Admin Diagnostics</h1>
            <div className="grid gap-4">
                {Object.entries(diagnostics).map(([name, data]: [string, any]) => (
                    <div key={name} className={`p-6 rounded-2xl border ${data.status === 'SUCCESS' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm tracking-widest uppercase">{name}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${data.status === 'SUCCESS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {data.status}
                            </span>
                        </div>
                        <pre className="text-xs text-charcoal/60 overflow-auto max-h-40">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                ))}
            </div>
            <div className="pt-8">
                <a href="/admin" className="text-forest underline text-xs font-bold uppercase tracking-widest">Return to Dashboard</a>
            </div>
        </div>
    )
}
