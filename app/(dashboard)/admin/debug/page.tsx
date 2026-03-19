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

    const failed = Object.entries(diagnostics).filter(([_, d]: any) => d.status !== 'SUCCESS')
    const successCount = Object.keys(diagnostics).length - failed.length

    return (
        <div className="p-12 space-y-12 bg-alabaster min-h-screen font-mono text-charcoal">
            <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tighter uppercase underline decoration-forest decoration-8 underline-offset-8">Admin Diagnostics</h1>
                <div className="flex gap-4 pt-4">
                    <div className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-black uppercase">Success: {successCount}</div>
                    <div className={`px-4 py-2 ${failed.length > 0 ? 'bg-red-500' : 'bg-charcoal/10'} text-white rounded-lg text-xs font-black uppercase`}>Failures: {failed.length}</div>
                </div>
            </div>

            {failed.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-red-600 uppercase tracking-widest flex items-center gap-3">
                        <div className="w-8 h-1 bg-red-600" />
                        Critical Failures
                    </h2>
                    <div className="grid gap-4">
                        {failed.map(([name, data]: any) => (
                            <div key={name} className="p-8 rounded-3xl border-4 border-red-200 bg-white shadow-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="font-black text-lg tracking-tighter uppercase text-red-600">{name}</span>
                                    <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">CRASH</span>
                                </div>
                                <pre className="text-xs text-red-900 bg-red-50/50 p-6 rounded-xl overflow-auto border border-red-100 font-bold whitespace-pre-wrap">
                                    {JSON.stringify(data, null, 2)}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <h2 className="text-xl font-black text-charcoal/40 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-1 bg-charcoal/10" />
                    Operational Stream
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(diagnostics).filter(([_, d]: any) => d.status === 'SUCCESS').map(([name, data]: [string, any]) => (
                        <div key={name} className="p-6 rounded-2xl border border-green-200 bg-green-50/30 flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all">
                            <div>
                                <span className="font-black text-[10px] tracking-widest uppercase text-charcoal/60">{name}</span>
                                <p className="text-xs font-bold text-green-700 mt-1">Status: Healthy ({data.count} items)</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="pt-8">
                <a href="/admin" className="text-forest underline text-xs font-bold uppercase tracking-widest">Return to Dashboard</a>
            </div>
        </div>
    )
}
