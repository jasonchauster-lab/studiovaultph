'use client'

import React, { useState } from 'react'
import { Check, X, CreditCard, User, Box, Clock, ShieldCheck, AlertCircle, Search, ExternalLink, History as HistoryIcon, FileText } from 'lucide-react'
import { approveCustomerPlan, cancelCustomerPlan } from '../package-actions'
import { useToast } from '@/components/ui/Toast'
import ExpandableImage from '@/components/ui/ExpandableImage'
import clsx from 'clsx'

interface PackagePlan {
    id: string
    user_id: string
    plan_type: 'package' | 'membership'
    remaining_credits: number | null
    status: 'pending_payment' | 'pending' | 'active' | 'cancelled'
    payment_method: 'xendit' | 'manual'
    payment_proof_url: string | null
    total_amount: number
    rejection_reason: string | null
    verified_at: string | null
    created_at: string
    packages?: { name: string }
    memberships?: { name: string }
    profiles?: { full_name: string; email: string }
    verifier?: { full_name: string }
}

export default function ApprovalsClient({ initialPlans }: { initialPlans: PackagePlan[] }) {
    const { toast } = useToast()
    const [plans, setPlans] = useState(initialPlans)
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectionModalId, setRejectionModalId] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')

    const pendingPlans = plans.filter(p => (p.status === 'pending_payment' || p.status === 'pending') && p.payment_proof_url)
    const historyPlans = plans.filter(p => p.status === 'active' || p.status === 'cancelled')

    const handleApprove = async (id: string) => {
        setProcessingId(id)
        const result = await approveCustomerPlan(id)
        if (result.success) {
            toast('Payment approved and plan activated', 'success')
            // Optimistic update - in a real app would be better to re-fetch
            const updated = plans.map(p => p.id === id ? { ...p, status: 'active' as const, verified_at: new Date().toISOString() } : p)
            setPlans(updated)
        } else {
            toast(result.error || 'Failed to approve', 'error')
        }
        setProcessingId(null)
    }

    const handleReject = async () => {
        if (!rejectionModalId) return
        setProcessingId(rejectionModalId)
        const result = await cancelCustomerPlan(rejectionModalId, rejectionReason)
        if (result.success) {
            toast('Payment rejected', 'success')
            const updated = plans.map(p => p.id === rejectionModalId ? { ...p, status: 'cancelled' as const, rejection_reason: rejectionReason } : p)
            setPlans(updated)
            setRejectionModalId(null)
            setRejectionReason('')
        } else {
            toast(result.error || 'Failed to reject', 'error')
        }
        setProcessingId(null)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={clsx(
                        "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                        activeTab === 'pending' ? "bg-white text-charcoal shadow-tight" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Pending ({pendingPlans.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={clsx(
                        "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2",
                        activeTab === 'history' ? "bg-white text-charcoal shadow-tight" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    History ({historyPlans.length})
                </button>
            </div>

            {activeTab === 'pending' ? (
                <div className="space-y-4">
                    {pendingPlans.length === 0 ? (
                        <div className="p-20 text-center bg-white rounded-3xl border border-zinc-100 shadow-tight flex flex-col items-center">
                            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                                <ShieldCheck className="w-10 h-10 text-zinc-200" />
                            </div>
                            <h3 className="text-zinc-900 font-black uppercase tracking-widest text-xs mb-2">Clean Slate</h3>
                            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[240px]">
                                No manual payments are currently waiting for verification.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {pendingPlans.map((plan) => (
                                <div key={plan.id} className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 shadow-tight hover:shadow-floating transition-all group overflow-hidden relative">
                                    <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
                                        <div className="flex items-start gap-8">
                                            {/* Proof Image */}
                                            <div className="w-40 h-52 bg-zinc-50 rounded-3xl overflow-hidden border border-zinc-100 shadow-inner shrink-0 relative group/proof">
                                                {plan.payment_proof_url ? (
                                                    <ExpandableImage 
                                                        src={plan.payment_proof_url} 
                                                        alt="Payment Proof"
                                                        className="object-cover"
                                                        bucket="payment-proofs"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                                        <AlertCircle className="w-8 h-8 text-zinc-200 mb-2" />
                                                        <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">No proof uploaded</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-6 flex-1">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase tracking-widest ring-1 ring-indigo-100">
                                                            {plan.plan_type}
                                                        </span>
                                                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">
                                                            ID: {plan.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xl font-black text-charcoal uppercase tracking-tight">
                                                        {plan.plan_type === 'package' ? plan.packages?.name : plan.memberships?.name}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-slate uppercase tracking-[.15em] mt-1 opacity-60">
                                                        Amount: ₱{plan.total_amount?.toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-off-white flex items-center justify-center text-zinc-400">
                                                                <User className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Customer</p>
                                                                <p className="text-[11px] font-bold text-charcoal">{plan.profiles?.full_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-off-white flex items-center justify-center text-zinc-400">
                                                                <Clock className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Submitted</p>
                                                                <p className="text-[11px] font-bold text-charcoal">{new Date(plan.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 w-full lg:w-48 pt-4 lg:pt-0">
                                            <button
                                                onClick={() => handleApprove(plan.id)}
                                                disabled={!!processingId}
                                                className="w-full h-14 bg-forest text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-forest/20 hover:bg-forest-dark transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => setRejectionModalId(plan.id)}
                                                disabled={!!processingId}
                                                className="w-full h-14 bg-white border border-zinc-100 text-slate rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <X className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-zinc-100 shadow-tight overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Plan</th>
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Proof</th>
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Verified By</th>
                                <th className="px-6 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {historyPlans.map((plan) => (
                                <tr key={plan.id} className="hover:bg-zinc-50/30 transition-colors">
                                    <td className="px-6 py-5">
                                        <p className="text-[11px] font-bold text-charcoal">{plan.plan_type === 'package' ? plan.packages?.name : plan.memberships?.name}</p>
                                        <p className="text-[9px] text-zinc-400 font-medium">₱{plan.total_amount?.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-5 text-[11px] font-bold text-slate">{plan.profiles?.full_name}</td>
                                    <td className="px-6 py-5">
                                        {plan.payment_proof_url ? (
                                            <div className="w-10 h-10">
                                                <ExpandableImage 
                                                    src={plan.payment_proof_url} 
                                                    alt="Proof"
                                                    bucket="payment-proofs"
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-zinc-300">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-[11px] text-zinc-400 font-medium">{new Date(plan.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-5">
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ring-1",
                                            plan.status === 'active' ? "bg-green-50 text-green-600 ring-green-100" : "bg-rose-50 text-rose-600 ring-rose-100"
                                        )}>
                                            {plan.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-[11px] text-zinc-600 font-bold">{plan.verifier?.full_name || 'System'}</td>
                                    <td className="px-6 py-5 max-w-[200px]">
                                        {plan.rejection_reason && (
                                            <p className="text-[9px] text-rose-500 italic line-clamp-2" title={plan.rejection_reason}>
                                                "{plan.rejection_reason}"
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectionModalId && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-charcoal/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-floating animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-charcoal uppercase tracking-tight">Reject Payment</h3>
                                <p className="text-[10px] font-bold text-slate uppercase tracking-widest opacity-60">Provide a reason for the customer</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Rejection Reason</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="e.g. Receipt screenshot is blurry, please re-upload."
                                    className="w-full h-32 p-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-100 transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setRejectionModalId(null)}
                                    className="flex-1 h-14 bg-white border border-zinc-100 text-[10px] font-black text-slate uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={!rejectionReason || !!processingId}
                                    className="flex-1 h-14 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50"
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
