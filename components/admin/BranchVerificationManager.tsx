'use client'

import React, { useState, useEffect } from 'react'
import { 
    CheckCircle2, 
    XCircle, 
    ExternalLink, 
    FileText, 
    Building2, 
    ShieldCheck, 
    User,
    Clock,
    AlertCircle,
    Loader2,
    Calendar,
    ChevronRight,
    Search,
    MapPin
} from 'lucide-react'
import { getPendingVerifications, approveStudioGlobalDocs, rejectStudioGlobalDocs, approveBranchMarketplace, rejectBranchMarketplace } from '@/app/(dashboard)/admin/actions'
import clsx from 'clsx'

interface PendingData {
    globalDocs: any[]
    branches: any[]
}

export default function BranchVerificationManager() {
    const [data, setData] = useState<PendingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [showRejectionId, setShowRejectionId] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        const res = await getPendingVerifications()
        if ('globalDocs' in res) {
            setData(res as any)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleApproveStudio = async (id: string) => {
        setProcessingId(id)
        const res = await approveStudioGlobalDocs(id)
        if (res.success) {
            fetchData()
        } else {
            alert(res.error)
        }
        setProcessingId(null)
    }

    const handleRejectStudio = async (id: string) => {
        if (!rejectionReason) return alert('Please provide a reason')
        setProcessingId(id)
        const res = await rejectStudioGlobalDocs(id, rejectionReason)
        if (res.success) {
            setShowRejectionId(null)
            setRejectionReason('')
            fetchData()
        }
        setProcessingId(null)
    }

    const handleApproveBranch = async (id: string) => {
        setProcessingId(id)
        const res = await approveBranchMarketplace(id)
        if (res.success) {
            fetchData()
        }
        setProcessingId(null)
    }

    const handleRejectBranch = async (id: string) => {
        if (!rejectionReason) return alert('Please provide a reason')
        setProcessingId(id)
        const res = await rejectBranchMarketplace(id, rejectionReason)
        if (res.success) {
            setShowRejectionId(null)
            setRejectionReason('')
            fetchData()
        }
        setProcessingId(null)
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-burgundy/20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-burgundy/40">Loading Verification Queue...</p>
            </div>
        )
    }

    const totalPending = (data?.globalDocs?.length || 0) + (data?.branches?.length || 0)

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Stats */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-burgundy p-12 rounded-[3.5rem] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-indigo-300" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Compliance Oversight</span>
                    </div>
                    <h1 className="text-4xl font-serif tracking-tight">Marketplace Verification</h1>
                    <p className="text-white/40 text-sm max-w-lg">Audit and approve studio-level and branch-level marketplace documents. Manual review is required for all new listings.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/10 px-8 py-6 rounded-3xl text-center relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Queue Depth</p>
                    <p className="text-4xl font-serif leading-none">{totalPending}</p>
                </div>
            </div>

            {/* 1. Global Studio Docs Queue */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-4">
                    <Building2 className="w-4 h-4 text-burgundy/40" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-burgundy">Studio Identity Requests</h2>
                    <span className="bg-burgundy/5 text-burgundy px-2 py-0.5 rounded-full text-[9px] font-black">{data?.globalDocs?.length || 0}</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {data?.globalDocs.map(studio => (
                        <div key={studio.id} className="atelier-card p-0 overflow-hidden bg-white border-stone-200 group hover:ring-1 hover:ring-burgundy/10 transition-all">
                            <div className="p-8 flex flex-col xl:flex-row gap-10">
                                {/* Owner Info */}
                                <div className="xl:w-1/4 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-burgundy uppercase">{studio.name}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                                            <User className="w-3 h-3" /> {studio.owner?.full_name}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                                        <p className="text-[8px] font-black text-stone-300 uppercase tracking-widest mb-2">Audit Status</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Pending Review</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <DocCard label="BIR Certificate" url={studio.bir_url} expiry={studio.bir_expiry} />
                                    <DocCard label="Government ID" url={studio.gov_id_url} expiry={studio.gov_id_expiry} />
                                    {studio.sec_cert_url && <DocCard label="SEC / DTI Cert" url={studio.sec_cert_url} />}
                                </div>

                                {/* Actions */}
                                <div className="xl:w-1/5 flex flex-col justify-center gap-4">
                                    {showRejectionId === studio.id ? (
                                        <div className="space-y-3 animate-in slide-in-from-right-2 duration-300">
                                            <textarea 
                                                className="w-full text-[10px] font-bold p-4 bg-rose-50 border border-rose-100 rounded-2xl focus:outline-none placeholder:text-rose-300"
                                                placeholder="Provide reason for rejection..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleRejectStudio(studio.id)}
                                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button onClick={() => setShowRejectionId(null)} className="p-3 text-stone-400 hover:text-stone-600">
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleApproveStudio(studio.id)}
                                                disabled={!!processingId}
                                                className="w-full py-4 bg-burgundy text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-burgundy/10 hover:shadow-burgundy/20 transition-all flex items-center justify-center gap-3"
                                            >
                                                {processingId === studio.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Approve Global
                                            </button>
                                            <button 
                                                onClick={() => setShowRejectionId(studio.id)}
                                                className="w-full py-4 bg-stone-100 text-stone-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-500 transition-all"
                                            >
                                                Request Changes
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {data?.globalDocs.length === 0 && <EmptyState text="No pending studio identity requests." />}
                </div>
            </div>

            {/* 2. Branch Docs Queue */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-4">
                    <MapPin className="w-4 h-4 text-burgundy/40" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-burgundy">Branch Sync Requests</h2>
                    <span className="bg-burgundy/5 text-burgundy px-2 py-0.5 rounded-full text-[9px] font-black">{data?.branches?.length || 0}</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {data?.branches.map(branch => (
                        <div key={branch.id} className="atelier-card p-0 overflow-hidden bg-white border-stone-200 group hover:ring-1 hover:ring-burgundy/10 transition-all">
                            <div className="p-8 flex flex-col xl:flex-row gap-10">
                                {/* Branch Info */}
                                <div className="xl:w-1/4 space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{(branch.studio as any)?.name}</p>
                                        <h3 className="text-sm font-black text-burgundy uppercase">{branch.name}</h3>
                                    </div>
                                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-3.5 h-3.5 text-burgundy opacity-40" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-burgundy/60">New Listing Hook</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <DocCard label="Mayor's Permit" url={branch.mayors_permit_url} expiry={branch.mayors_permit_expiry} />
                                    <DocCard label="Liability Insurance" url={branch.insurance_url} expiry={branch.insurance_expiry} />
                                </div>

                                {/* Actions */}
                                <div className="xl:w-1/5 flex flex-col justify-center gap-4">
                                    {showRejectionId === branch.id ? (
                                        <div className="space-y-3 animate-in slide-in-from-right-2 duration-300">
                                            <textarea 
                                                className="w-full text-[10px] font-bold p-4 bg-rose-50 border border-rose-100 rounded-2xl focus:outline-none placeholder:text-rose-300"
                                                placeholder="Provide reason for rejection..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleRejectBranch(branch.id)}
                                                    className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                                <button onClick={() => setShowRejectionId(null)} className="p-3 text-stone-400 hover:text-stone-600">
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleApproveBranch(branch.id)}
                                                disabled={!!processingId}
                                                className="w-full py-4 bg-forest text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-forest/10 hover:shadow-forest/20 transition-all flex items-center justify-center gap-3"
                                            >
                                                {processingId === branch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Approve Sync
                                            </button>
                                            <button 
                                                onClick={() => setShowRejectionId(branch.id)}
                                                className="w-full py-4 bg-stone-100 text-stone-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-500 transition-all"
                                            >
                                                Request Changes
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {data?.branches.length === 0 && <EmptyState text="No pending branch verification requests." />}
                </div>
            </div>
        </div>
    )
}

function DocCard({ label, url, expiry }: { label: string, url: string, expiry?: string }) {
    if (!url) {
        return (
            <div className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 flex flex-col justify-center gap-2 opacity-50 grayscale">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{label}</p>
                <div className="flex items-center gap-2 text-stone-300">
                    <FileText className="w-4 h-4" />
                    <span className="text-[9px] font-bold italic">No document uploaded</span>
                </div>
            </div>
        )
    }

    // Determine if expired
    const isExpired = expiry && new Date(expiry) < new Date()

    return (
        <a 
            href={url.startsWith('http') ? url : `https://mzlxsirqpxaqwujkuduo.supabase.co/storage/v1/object/public/studios/${url}`} 
            target="_blank"
            className="p-5 rounded-2xl border border-stone-100 bg-stone-50/50 flex flex-col justify-between gap-4 transition-all hover:bg-white hover:border-burgundy/20 hover:shadow-xl hover:shadow-burgundy/5 group cursor-pointer"
        >
            <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-burgundy transition-colors">
                        {label} <ExternalLink className="w-3 h-3" />
                    </p>
                    <p className="text-[11px] font-bold text-stone-800">view_documents_secure.pdf</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm text-stone-400 group-hover:bg-burgundy/10 group-hover:text-burgundy transition-all">
                    <FileText className="w-4 h-4" />
                </div>
            </div>
            {expiry && (
                <div className={clsx(
                    "px-3 py-1.5 rounded-lg flex items-center justify-between",
                    isExpired ? "bg-rose-50 text-rose-600" : "bg-white text-stone-500"
                )}>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Expires: {expiry}</span>
                    </div>
                    {isExpired && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
                </div>
            )}
        </a>
    )
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="text-center py-20 border-2 border-dashed border-stone-100 rounded-[3rem] bg-stone-50/20">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-stone-200">
                <ShieldCheck className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-stone-300 italic">{text}</p>
        </div>
    )
}
