import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import UserSearchBar from '@/components/admin/UserSearchBar'

interface AccountsTabProps {
    searchQuery?: string
}

export default async function AccountsTab({ searchQuery = '' }: AccountsTabProps) {
    const supabase = createAdminClient()
    
    let query = supabase.from('profiles')
        .select('id, full_name, email, role, created_at, available_balance, is_suspended, contact_number, waiver_url, waiver_signed_at')
        .order('created_at', { ascending: false })
        .limit(100)
    
    if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,contact_number.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
    }
    
    const { data } = await query
    const allUsers = data || []

    return (
        <div className="atelier-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                <div className="space-y-1">
                    <h2 className="text-sm font-black tracking-[0.2em] text-burgundy uppercase">PLATFORM ACCOUNTS</h2>
                    <p className="text-[10px] text-burgundy/40 font-bold uppercase tracking-widest">{allUsers.length} {searchQuery ? 'MATCHES FOUND' : 'TOTAL REGISTRATIONS'}</p>
                </div>
                <UserSearchBar />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-50 border-b border-stone-100">
                        <tr>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">IDENTIFIER</th>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">ACCESS LEVEL</th>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">CREDITS</th>
                            <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">STATUS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {allUsers.map((u: any) => (
                            <tr key={u.id} className="hover:bg-burgundy/5 transition-colors group">
                                <td className="px-8 py-5">
                                    <p className="font-bold text-burgundy text-sm">{u.full_name || 'Anonymous'}</p>
                                    <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-wider">{u.email}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black text-forest uppercase tracking-widest">{u.role}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <p className="font-black text-burgundy text-xs">₱{(u.available_balance || 0).toLocaleString()}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${u.is_suspended ? 'bg-red-100 text-red-600' : 'bg-forest/10 text-forest'}`}>
                                        {u.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
