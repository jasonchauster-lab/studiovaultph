'use client'

import React, { useState, useEffect } from 'react'
import { 
    Layout, 
    Globe, 
    TrendingUp, 
    Users, 
    ShieldCheck, 
    ExternalLink, 
    ArrowUpRight,
    Search,
    Filter,
    ChevronDown,
    MoreHorizontal,
    Zap,
    Crown,
    CheckCircle2,
    Clock,
    AlertCircle,
    UserPlus
} from 'lucide-react'
import { getBuilderOverview, updateStudioTier, getCmaAnalytics, getStudioStaff } from '@/app/(dashboard)/admin/actions'
import clsx from 'clsx'

interface Studio {
    id: string
    name: string
    slug: string | null
    subscription_tier: string
    subscription_status: string
    verified: boolean
    owner: {
        full_name: string | null
        email: string | null
    } | null
}

export default function BuilderManager() {
    const [studios, setStudios] = useState<Studio[]>([])
    const [analytics, setAnalytics] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStudioStaff, setSelectedStudioStaff] = useState<{studioName: string, members: any[]} | null>(null)
    const [updatingTierId, setUpdatingTierId] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const [overviewRes, analyticsRes] = await Promise.all([
                getBuilderOverview(),
                getCmaAnalytics()
            ])

            if (overviewRes && 'data' in overviewRes && overviewRes.data) setStudios(overviewRes.data as any)
            if (analyticsRes && 'data' in analyticsRes && analyticsRes.data) setAnalytics(analyticsRes.data)
            setLoading(false)
        }
        fetchData()
    }, [])

    const handleTierUpdate = async (studioId: string, newTier: string) => {
        setUpdatingTierId(studioId)
        const res = await updateStudioTier(studioId, newTier)
        if (res.success) {
            setStudios(prev => prev.map(s => s.id === studioId ? { ...s, subscription_tier: newTier } : s))
        } else {
            alert(res.error || 'Failed to update tier')
        }
        setUpdatingTierId(null)
    }

    const handleViewStaff = async (studio: Studio) => {
        const res = await getStudioStaff(studio.id)
        if (res && 'data' in res && res.data) {
            setSelectedStudioStaff({ studioName: studio.name, members: res.data })
        } else {
            alert((res as any)?.error || 'Failed to fetch staff')
        }
    }

    const filteredStudios = studios.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const tierCounts = studios.reduce((acc: any, s) => {
        acc[s.subscription_tier] = (acc[s.subscription_tier] || 0) + 1
        return acc
    }, { free: 0, pro: 0, elite: 0 })

    const totalRevenue = analytics ? (Object.values(analytics) as any[]).reduce((sum, a) => sum + (a.revenue || 0), 0) : 0
    const marketplaceShare = analytics?.marketplace?.revenue ? (analytics.marketplace.revenue / totalRevenue) * 100 : 0
    const studioShare = analytics?.studio?.revenue ? (analytics.studio.revenue / totalRevenue) * 100 : 0

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="w-12 h-12 border-4 border-burgundy/10 border-t-burgundy rounded-full animate-spin" />
                <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em]">Synching Ecosystem Data...</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Analytics Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 atelier-card p-10 bg-forest text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h3 className="text-sm font-black tracking-[0.3em] uppercase opacity-60 mb-2">Ecosystem Attribution</h3>
                            <h2 className="text-4xl font-serif tracking-tight">Marketplace vs. Direct Site</h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Marketplace Share</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-5xl font-serif">₱{analytics?.marketplace?.revenue?.toLocaleString() || 0}</p>
                                    <p className="text-xs font-bold bg-white/10 px-2 py-1 rounded-lg mb-1.5">{marketplaceShare.toFixed(0)}%</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Studio Vault (Direct)</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-5xl font-serif text-amber-400">₱{analytics?.studio?.revenue?.toLocaleString() || 0}</p>
                                    <p className="text-xs font-bold bg-amber-400/20 text-amber-400 px-2 py-1 rounded-lg mb-1.5">{studioShare.toFixed(0)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                            <div className="h-full bg-white transition-all duration-1000" style={{ width: `${marketplaceShare}%` }} />
                            <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${studioShare}%` }} />
                        </div>
                    </div>
                </div>

                <div className="atelier-card p-8 flex flex-col justify-between">
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black tracking-[0.2em] text-burgundy/50 uppercase">Tier Distribution</h3>
                        <div className="space-y-4">
                            {[
                                { id: 'free', label: 'Starter (Free)', count: tierCounts.free, icon: Layout, color: 'text-slate-400', bg: 'bg-slate-50' },
                                { id: 'pro', label: 'Pro Tier', count: tierCounts.pro, icon: Zap, color: 'text-forest', bg: 'bg-forest/5' },
                                { id: 'elite', label: 'Elite Partner', count: tierCounts.elite, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
                            ].map(tier => (
                                <div key={tier.id} className={clsx("flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-sm", tier.bg, "border-stone-100")}>
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-xl bg-white shadow-sm", tier.color)}>
                                            <tier.icon className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold text-burgundy/80">{tier.label}</p>
                                    </div>
                                    <p className="font-serif text-xl text-burgundy">{tier.count}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Studio Management Table */}
            <div className="atelier-card overflow-hidden">
                <div className="p-8 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-1">
                        <h2 className="text-sm font-black tracking-[0.2em] text-burgundy uppercase">Studio Directory</h2>
                        <p className="text-[10px] text-burgundy/40 font-bold uppercase tracking-widest">{filteredStudios.length} ACTIVE PUBLISHERS</p>
                    </div>
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/30 group-focus-within:text-forest transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search studios, owners, or slugs..."
                            className="w-full pl-12 pr-6 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-[10px] font-bold tracking-wider placeholder:text-burgundy/20 focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-stone-50 border-b border-stone-100">
                            <tr>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">IDENTIFIER</th>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">PRIVATE SITE</th>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">SUBSCRIPTION</th>
                                <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">VERIFIED</th>
                                <th className="px-8 py-5 text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em] text-right">CONTROLS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                            {filteredStudios.map((s) => (
                                <tr key={s.id} className="hover:bg-stone-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-burgundy text-sm">{s.name}</p>
                                        <div className="flex flex-col mt-0.5">
                                            <p className="text-[10px] text-burgundy/40 font-medium">{s.owner?.full_name || 'No Owner'}</p>
                                            <p className="text-[9px] text-burgundy/30 font-bold uppercase tracking-tight">{s.owner?.email || '-'}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {s.slug ? (
                                            <a 
                                                href={`https://${s.slug}.studiovaultph.com`} 
                                                target="_blank" 
                                                className="inline-flex items-center gap-2 group/link"
                                            >
                                                <div className="p-2 bg-stone-100 text-burgundy/40 rounded-lg group-hover/link:bg-forest/10 group-hover/link:text-forest transition-all">
                                                    <Globe className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-burgundy/60 uppercase tracking-widest group-hover/link:text-forest transition-colors">{s.slug}</span>
                                                    <span className="text-[8px] font-bold text-burgundy/30">.studiovaultph.com</span>
                                                </div>
                                            </a>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 grayscale brightness-125 opacity-40">
                                                <div className="p-2 bg-stone-100 text-burgundy/40 rounded-lg">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-[10px] font-black text-burgundy/60 uppercase tracking-widest">UNPUBLISHED</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="relative group/tier">
                                            <select 
                                                value={s.subscription_tier}
                                                disabled={updatingTierId === s.id}
                                                onChange={(e) => handleTierUpdate(s.id, e.target.value)}
                                                className={clsx(
                                                    "appearance-none pl-4 pr-10 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all cursor-pointer disabled:opacity-50",
                                                    s.subscription_tier === 'elite' ? "text-amber-600 border-amber-200" :
                                                    s.subscription_tier === 'pro' ? "text-forest border-forest/20" :
                                                    "text-slate-400"
                                                )}
                                            >
                                                <option value="free">FREE STARTER</option>
                                                <option value="pro">PRO BUILDER</option>
                                                <option value="elite">ELITE PARTNER</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none group-hover/tier:text-forest transition-colors" />
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-1.5 h-1.5 rounded-full", s.verified ? "bg-forest" : "bg-red-400")} />
                                            <span className={clsx(
                                                "text-[9px] font-black uppercase tracking-widest",
                                                s.verified ? "text-forest" : "text-red-400"
                                            )}>
                                                {s.verified ? "VERIFIED" : "PENDING"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                id={`staff-audit-${s.id}`}
                                                onClick={() => handleViewStaff(s)}
                                                className="p-2.5 bg-stone-100 text-burgundy/50 rounded-xl hover:bg-forest hover:text-white hover:shadow-lg hover:shadow-forest/20 transition-all group/staff"
                                                title="View Studio Staff"
                                            >
                                                <Users className="w-4 h-4 transition-transform group-hover/staff:scale-110" />
                                            </button>
                                            <button 
                                                id={`studio-options-${s.id}`}
                                                className="p-2.5 bg-stone-100 text-burgundy/50 rounded-xl hover:bg-burgundy hover:text-white transition-all group/more"
                                                title="More Options"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
        
        {/* Staff Modal (Moved outside animated container to avoid fixed positioning bugs) */}
        {selectedStudioStaff && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-24 bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
                <div 
                    className="atelier-card w-full max-w-2xl p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-500"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-8 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-forest uppercase">Team Audit</h3>
                            <h2 className="text-2xl font-serif text-burgundy">{selectedStudioStaff.studioName} Staff</h2>
                        </div>
                        <button 
                            onClick={() => setSelectedStudioStaff(null)}
                            className="p-2.5 text-burgundy/40 hover:text-burgundy hover:bg-white rounded-xl transition-all"
                        >
                            <ChevronDown className="w-5 h-5 rotate-180" />
                        </button>
                    </div>
                    <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                        {(selectedStudioStaff.members?.length || 0) === 0 ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-burgundy/20">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-bold text-burgundy/40 italic">No studio members found. The owner manages all aspects personally.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {selectedStudioStaff.members.map((m: any) => (
                                    <div key={m.id} className="p-5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between group hover:bg-white hover:border-forest/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center font-black text-[10px] uppercase group-hover:bg-forest group-hover:text-white transition-all">
                                                {m.profile?.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[11px] font-black text-burgundy group-hover:text-forest transition-colors">{m.profile?.full_name || 'Invite Pending'}</p>
                                                <p className="text-[9px] text-burgundy/40 font-bold uppercase tracking-widest">{m.profile?.email || '-'}</p>
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                            m.role === 'admin' ? "bg-burgundy text-white border-burgundy" : "bg-stone-200 text-stone-500 border-stone-300"
                                        )}>
                                            {m.role}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-8 border-t border-stone-100 bg-stone-50/20 text-center">
                        <p className="text-[9px] font-black text-burgundy/30 uppercase tracking-[0.2em]">Management operations recorded in audit log</p>
                    </div>
                </div>
            </div>
        )}
    </>
)
}
