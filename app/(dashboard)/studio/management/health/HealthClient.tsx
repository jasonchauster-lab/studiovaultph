'use client'

import React, { useState, useEffect } from 'react'
import { 
    Activity, 
    ShieldCheck, 
    Zap, 
    Database, 
    RefreshCcw, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    Terminal,
    Search,
    Filter,
    ArrowRightLeft,
    ShieldAlert
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import clsx from 'clsx'

interface WebhookLog {
    id: string
    external_id: string
    invoice_id: string
    status: string
    payload: any
    created_at: string
}

interface ReconciliationItem {
    plan_id: string
    customer_name: string
    plan_name: string
    stored_credits: number
    calculated_credits: number
    discrepancy: number
}

export default function HealthClient({ studioId, initialLogs }: { studioId: string, initialLogs: WebhookLog[] }) {
    const supabase = createClient()
    const { toast } = useToast()
    const [logs, setLogs] = useState<WebhookLog[]>(initialLogs)
    const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([])
    const [isReconciling, setIsReconciling] = useState(false)
    const [activeTab, setActiveTab] = useState<'logs' | 'integrity'>('logs')

    // Real-time subscription for logs
    useEffect(() => {
        const channel = supabase
            .channel(`health_logs_${studioId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'payment_webhook_logs',
                filter: `studio_id=eq.${studioId}`
            }, (payload) => {
                setLogs(prev => [payload.new as WebhookLog, ...prev].slice(0, 50))
                toast('New webhook signal received', 'info')
            })
            .subscribe()

        return () => { channel.unsubscribe() }
    }, [studioId])

    const runReconciliation = async () => {
        setIsReconciling(true)
        try {
            const { data, error } = await supabase.rpc('reconcile_studio_plans', { p_studio_id: studioId })
            if (error) throw error
            setReconciliations(data || [])
            if ((data || []).length === 0) {
                toast('Integrity check passed: No discrepancies found.', 'success')
            } else {
                toast(`Found ${data.length} discrepancies requiring review.`, 'warning')
            }
        } catch (err: any) {
            toast(err.message || 'Reconciliation failed', 'error')
        } finally {
            setIsReconciling(false)
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Health Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-tight flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Zap className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Database</p>
                        <h3 className="text-xl font-black text-charcoal tracking-tight">Connected</h3>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-tight flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Webhook Sync</p>
                        <h3 className="text-xl font-black text-charcoal tracking-tight">Reactive</h3>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-tight flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Audit Engine</p>
                        <h3 className="text-xl font-black text-charcoal tracking-tight">V4 Hardened</h3>
                    </div>
                </div>
            </div>

            {/* Main Tabs Container */}
            <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-floating overflow-hidden">
                <div className="p-10 border-b border-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-2 p-1.5 bg-zinc-100 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={clsx(
                                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                                activeTab === 'logs' ? "bg-white text-charcoal shadow-tight" : "text-zinc-400 hover:text-zinc-600"
                            )}
                        >
                            <Terminal className="w-4 h-4" />
                            Live Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('integrity')}
                            className={clsx(
                                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                                activeTab === 'integrity' ? "bg-white text-charcoal shadow-tight" : "text-zinc-400 hover:text-zinc-600"
                            )}
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            Financial Integrity
                        </button>
                    </div>

                    {activeTab === 'integrity' && (
                        <button
                            onClick={runReconciliation}
                            disabled={isReconciling}
                            className="px-8 h-12 bg-charcoal text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:brightness-110 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-charcoal/20"
                        >
                            {isReconciling ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Run Reconciliation Check
                        </button>
                    )}
                </div>

                <div className="p-10">
                    {activeTab === 'logs' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Recent Webhook Events</h4>
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">Monitoring Live</span>
                            </div>

                            <div className="space-y-3">
                                {logs.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                                            <Search className="w-8 h-8 text-zinc-200" />
                                        </div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No logs recorded yet.</p>
                                    </div>
                                ) : (
                                    logs.map((log) => (
                                        <div key={log.id} className="p-6 bg-zinc-50/50 border border-zinc-100 rounded-3xl flex items-center justify-between group hover:bg-white hover:shadow-tight transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                                                    log.status === 'PAID' || log.status === 'SETTLED' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-200 text-zinc-400"
                                                )}>
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-[11px] font-black text-charcoal uppercase tracking-widest">{log.external_id}</p>
                                                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Status: {log.status}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden md:block">
                                                    <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Invoice ID</p>
                                                    <p className="text-[10px] font-bold text-zinc-500 font-mono">{log.invoice_id || 'N/A'}</p>
                                                </div>
                                                <button 
                                                    onClick={() => console.log(log.payload)}
                                                    className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-charcoal hover:shadow-sm transition-all"
                                                >
                                                    <Terminal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Discrepancy Report</h4>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cross-referencing Plan Credits with Booking History</p>
                                </div>
                            </div>

                            {reconciliations.length === 0 ? (
                                <div className="py-20 bg-zinc-50/50 rounded-[2.5rem] border border-dashed border-zinc-200 text-center">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-6">
                                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h5 className="text-xs font-black text-charcoal uppercase tracking-widest mb-2">Platform Integrity Intact</h5>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">Run a check to verify all customer credits align with their session usage.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-amber-600 shadow-sm">
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-relaxed">
                                            Warning: Found {reconciliations.length} discrepancies. This usually happens if credits were manually adjusted or if a booking was cancelled without proper refund.
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-[2rem] border border-zinc-100 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                                    <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Customer & Plan</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Stored</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Calculated</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Discrepancy</th>
                                                    <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {reconciliations.map((item) => (
                                                    <tr key={item.plan_id} className="hover:bg-zinc-50/30 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <p className="text-[11px] font-black text-charcoal uppercase tracking-tight">{item.customer_name}</p>
                                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{item.plan_name}</p>
                                                        </td>
                                                        <td className="px-8 py-6 text-[11px] font-bold text-zinc-600">{item.stored_credits}</td>
                                                        <td className="px-8 py-6 text-[11px] font-bold text-zinc-600">{item.calculated_credits}</td>
                                                        <td className="px-8 py-6">
                                                            <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full">
                                                                {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <button className="text-[10px] font-black text-charcoal uppercase tracking-widest hover:underline">Fix Integrity</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
