import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'

export default async function CrmTab() {
    const supabase = createAdminClient()
    
    const { data } = await supabase.from('studio_customers')
        .select('id, created_at, profile:profiles(full_name, email), studio:studios(name)')
        .order('created_at', { ascending: false })
        .limit(100)
    
    const allCrmRecords = data || []

    return (
        <div className="atelier-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-stone-100">
                <h2 className="text-sm font-black tracking-[0.2em] text-burgundy uppercase">CRM DIRECTORY</h2>
                <p className="text-[10px] text-burgundy/40 font-bold uppercase tracking-widest">{allCrmRecords.length} RECENT RECORDS</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-50 border-b border-stone-100">
                        <tr>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">CUSTOMER</th>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">STUDIO</th>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">JOINED AT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {allCrmRecords.map((r: any) => (
                            <tr key={r.id} className="hover:bg-burgundy/5 transition-colors group">
                                <td className="px-8 py-5">
                                    <p className="font-bold text-burgundy text-sm">{(r.profile as any)?.full_name}</p>
                                    <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-wider">{(r.profile as any)?.email}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black text-forest uppercase tracking-widest">{(r.studio as any)?.name}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-wider">{new Date(r.created_at).toLocaleDateString()}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
