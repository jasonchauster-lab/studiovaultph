'use client'

import React, { useState } from 'react'
import { Check, X, CreditCard, User, Box, Clock, ExternalLink } from 'lucide-react'
import { approveCustomerPlan, cancelCustomerPlan } from '@/app/(dashboard)/studio/sales/package-actions'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'
import ExpandableImage from '@/components/ui/ExpandableImage'

interface PackagePlan {
    id: string
    user_id: string
    plan_type: 'package' | 'membership'
    remaining_credits: number | null
    status: 'pending_payment' | 'active' | 'cancelled'
    payment_method: 'xendit' | 'manual'
    payment_proof_url: string | null
    created_at: string
    packages?: { name: string }
    memberships?: { name: string }
    profiles?: { full_name: string; email: string }
}

export default function PackageApprovals({ initialPlans }: { initialPlans: PackagePlan[] }) {
    const { toast } = useToast()
    const [plans, setPlans] = useState(initialPlans)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleApprove = async (id: string) => {
        setProcessingId(id)
        const result = await approveCustomerPlan(id)
        if (result.success) {
            toast('Plan activated successfully', 'success')
            setPlans(plans.filter(p => p.id !== id))
        } else {
            toast(result.error || 'Failed to approve', 'error')
        }
        setProcessingId(null)
    }

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this request?')) return
        setProcessingId(id)
        const result = await cancelCustomerPlan(id)
        if (result.success) {
            toast('Request cancelled', 'success')
            setPlans(plans.filter(p => p.id !== id))
        } else {
            toast(result.error || 'Failed to cancel', 'error')
        }
        setProcessingId(null)
    }

    if (plans.length === 0) {
        return (
            <div className="p-12 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                <Box className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                <h3 className="text-zinc-900 font-bold">No pending packages</h3>
                <p className="text-zinc-500 text-sm mt-1">All package and membership purchases are up to date.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 px-1">Pending Approvals</h3>
            
            <div className="grid grid-cols-1 gap-4">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-zinc-900">
                                        {plan.plan_type === 'package' ? plan.packages?.name : plan.memberships?.name}
                                    </h4>
                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            {plan.profiles?.full_name}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(plan.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                {plan.payment_proof_url && (
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Payment Proof</p>
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-100 shadow-inner group relative cursor-pointer">
                                            <ExpandableImage 
                                                src={plan.payment_proof_url} 
                                                alt="Proof"
                                                className="object-cover"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleCancel(plan.id)}
                                        disabled={!!processingId}
                                        className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="Reject / Cancel"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleApprove(plan.id)}
                                        disabled={!!processingId}
                                        className="flex items-center gap-2 px-6 py-3 bg-[#2D3282] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
