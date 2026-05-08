import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { Building2, ShieldAlert, CheckCircle, Clock, MoreHorizontal, User, Mail, Phone, FileText, ExternalLink, Search, Calendar, CreditCard, Receipt, AlertCircle } from 'lucide-react'
import VerifyButton from '@/components/admin/VerifyButton'
import { formatManilaDateStr } from '@/lib/timezone'
import UserSearchBar from '@/components/admin/UserSearchBar'
import clsx from 'clsx'
import BillingHistoryManager from '@/components/admin/BillingHistoryManager'

interface StudiosTabProps {
    searchQuery?: string
}

export default async function StudiosTab({ searchQuery = '' }: StudiosTabProps) {
    const supabase = createAdminClient()
    
    // Fetch all studios with their owner's profile info
    let query = supabase
        .from('studios')
        .select(`
            id,
            name,
            slug,
            plan,
            subscription_tier,
            subscription_status,
            trial_ends_at,
            verified,
            created_at,
            bir_certificate_url, bir_certificate_expiry,
            gov_id_url, gov_id_expiry,
            mayors_permit_url, mayors_permit_expiry,
            secretary_certificate_url,
            insurance_url, insurance_expiry,
            owner:profiles!owner_id(id, full_name, email, contact_number, is_suspended)
        `)
        .order('created_at', { ascending: false })

    if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
    }

    const { data: rawStudios } = await query
    const studios = rawStudios || []

    // Handle signed URLs for documents
    const signedUrls: Record<string, string> = {}
    const paths = studios.flatMap((s: any) => [
        s.bir_certificate_url,
        s.gov_id_url,
        s.mayors_permit_url,
        s.secretary_certificate_url,
        s.insurance_url
    ]).filter(Boolean)

    if (paths.length > 0) {
        const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(paths, 3600)
        if (signedData) {
            signedData.forEach(item => {
                if (item.signedUrl && item.path) signedUrls[item.path] = item.signedUrl
            })
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Search */}
            <div className="atelier-card p-8 border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                    <h2 className="text-sm font-black tracking-[0.2em] text-burgundy uppercase">STUDIO ACCOUNTS</h2>
                    <p className="text-[10px] text-burgundy/40 font-bold uppercase tracking-widest">
                        {searchQuery ? `${studios.length} MATCHES FOUND` : `${studios.length} REGISTERED BUSINESSES`}
                    </p>
                </div>
                <UserSearchBar />
            </div>

            {/* Main List */}
            <div className="atelier-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-stone-50 border-b border-stone-100">
                            <tr>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">STUDIO</th>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">SUBSCRIPTION</th>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">COMPLIANCE AUDIT</th>
                                <th className="px-12 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em] text-right">MANAGEMENT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {studios.map((s: any) => {
                                const owner = Array.isArray(s.owner) ? s.owner[0] : s.owner
                                const isTrial = s.subscription_status === 'trial'
                                const isSuspended = owner?.is_suspended
                                const tier = (s.subscription_tier || s.plan || 'starter').toUpperCase()
                                
                                return (
                                    <tr key={s.id} className="hover:bg-burgundy/5 transition-colors group">
                                        {/* Studio Info */}
                                        <td className="px-8 py-8">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-burgundy/5 rounded-2xl flex items-center justify-center border border-burgundy/10 shadow-sm">
                                                    <Building2 className="w-6 h-6 text-burgundy" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-black text-burgundy text-sm leading-tight">{s.name}</p>
                                                    <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-wider">{s.slug}.studiovault.co</p>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <User className="w-3 h-3 text-burgundy/30" />
                                                        <span className="text-[10px] font-bold text-burgundy/60">{owner?.full_name || 'No Owner'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Subscription Status */}
                                        <td className="px-8 py-8">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "text-[10px] font-black px-3 py-1 rounded-lg tracking-widest uppercase shadow-sm border",
                                                        tier === 'PREMIUM' ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                        tier === 'ELITE' ? "bg-purple-50 text-purple-600 border-purple-200" :
                                                        "bg-stone-100 text-stone-600 border-stone-200"
                                                    )}>
                                                        {tier}
                                                    </span>
                                                    <span className={clsx(
                                                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                                                        isSuspended ? "bg-red-600 text-white border-red-700" :
                                                        isTrial ? "bg-forest/10 text-forest border-forest/20" :
                                                        "bg-stone-50 text-stone-400 border-stone-100"
                                                    )}>
                                                        {isSuspended ? 'SUSPENDED' : isTrial ? 'TRIALING' : s.subscription_status?.toUpperCase() || 'ACTIVE'}
                                                    </span>
                                                </div>
                                                {isTrial && s.trial_ends_at && (
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-burgundy/40 uppercase tracking-widest">
                                                        <Clock className="w-3 h-3" />
                                                        Ends {formatManilaDateStr(s.trial_ends_at)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Documents Audit */}
                                        <td className="px-8 py-8">
                                            <div className="grid grid-cols-2 gap-2 max-w-[240px]">
                                                <DocBadge 
                                                    label="BIR CERT" 
                                                    url={s.bir_certificate_url ? signedUrls[s.bir_certificate_url] : null} 
                                                    expiry={s.bir_certificate_expiry} 
                                                />
                                                <DocBadge 
                                                    label="MAYOR'S PERMIT" 
                                                    url={s.mayors_permit_url ? signedUrls[s.mayors_permit_url] : null} 
                                                    expiry={s.mayors_permit_expiry} 
                                                />
                                                <DocBadge 
                                                    label="GOV ID" 
                                                    url={s.gov_id_url ? signedUrls[s.gov_id_url] : null} 
                                                    expiry={s.gov_id_expiry} 
                                                />
                                                <DocBadge 
                                                    label="SEC/SEC CERT" 
                                                    url={s.secretary_certificate_url ? signedUrls[s.secretary_certificate_url] : null} 
                                                />
                                            </div>
                                        </td>

                                        {/* Management Actions */}
                                        <td className="px-12 py-8 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex gap-2">
                                                    {owner ? (
                                                        isSuspended ? (
                                                            <VerifyButton 
                                                                id={owner.id} 
                                                                action="reinstateStudio" 
                                                                label="REINSTATE ACCESS" 
                                                                className="px-4 py-2.5 bg-forest text-white text-[9px] font-black rounded-xl hover:brightness-110 tracking-[0.1em] shadow-md shadow-forest/20 transition-all"
                                                            />
                                                        ) : (
                                                            <VerifyButton 
                                                                id={owner.id} 
                                                                action="suspendUser" 
                                                                label="SUSPEND ACCOUNT" 
                                                                className="px-4 py-2.5 bg-red-600 text-white text-[9px] font-black rounded-xl hover:bg-red-700 tracking-[0.1em] shadow-md shadow-red-600/20 transition-all"
                                                            />
                                                        )
                                                    ) : (
                                                        <span className="text-[10px] text-burgundy/20 italic font-bold">ORPHANED ACCOUNT</span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <BillingHistoryManager studioId={s.id} studioName={s.name} />
                                                    <button className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors border border-transparent hover:border-stone-200">
                                                        <MoreHorizontal className="w-4 h-4 text-burgundy/40" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function DocBadge({ label, url, expiry }: { label: string, url: string | null, expiry?: string }) {
    const isExpired = expiry && new Date(expiry) < new Date()
    const isSoon = expiry && !isExpired && new Date(expiry).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
    
    return (
        <div className={clsx(
            "flex flex-col gap-1 p-2.5 rounded-xl border transition-all",
            url ? 'bg-white border-stone-200 shadow-sm' : 'bg-stone-100/50 border-stone-100 opacity-40'
        )}>
            <div className="flex items-center justify-between gap-2">
                <span className={clsx(
                    "text-[8px] font-black tracking-widest leading-none",
                    url ? 'text-burgundy' : 'text-burgundy/30'
                )}>
                    {label}
                </span>
                {url && (
                    <a href={url} target="_blank" className="text-forest hover:text-burgundy transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 stroke-[3px]" />
                    </a>
                )}
            </div>
            {expiry ? (
                <div className={clsx(
                    "text-[8px] font-black tracking-tight flex items-center gap-1 mt-0.5",
                    isExpired ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-forest/60'
                )}>
                    {isExpired ? <AlertCircle className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
                    {formatManilaDateStr(expiry)}
                </div>
            ) : url && (
                <div className="text-[7px] font-bold text-burgundy/20 uppercase tracking-widest mt-0.5">No Expiry Logged</div>
            )}
        </div>
    )
}
