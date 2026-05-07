import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import VerifyButton from '@/components/admin/VerifyButton'

export default async function SuspensionsTab() {
    const supabase = createAdminClient()
    
    const { data: queuesData, error: queuesError } = await supabase.rpc('get_admin_dashboard_queues')
    if (queuesError) console.error('[SuspensionsTab] Queue RPC failed:', queuesError)
    
    const queues = queuesData || {}
    const suspendedStudios = queues.suspended_profiles || []

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="atelier-card p-12 border-red-100/30">
                <h2 className="text-sm font-black tracking-[0.2em] text-red-600 mb-8 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4" />
                    QUARANTINED ACCOUNTS
                    {suspendedStudios.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-black">{suspendedStudios.length}</span>}
                </h2>
                {suspendedStudios.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-forest/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-forest" />
                        </div>
                        <p className="text-burgundy font-serif text-xl">System accounts are healthy.</p>
                        <p className="text-burgundy/40 text-sm">No accounts are currently under suspension.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {suspendedStudios.map((p: any) => (
                            <div key={p.id} className="group p-6 bg-red-50/30 border border-red-100/50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300">
                                <div className="space-y-4">
                                    <div>
                                        <p className="font-bold text-burgundy text-sm">{p.studios?.[0]?.name || p.full_name}</p>
                                        <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-widest mt-1">{p.studios?.[0] ? 'Studio Owner' : 'Instructor'}</p>
                                    </div>
                                    <VerifyButton id={p.id} action="reinstateStudio" label="REINSTATED ACCESS" className="w-full py-3 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-widest shadow-sm" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
