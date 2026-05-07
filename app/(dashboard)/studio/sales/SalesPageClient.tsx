'use client'

import React, { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import TransactionHistory from '@/components/dashboard/TransactionHistory'
import { Search, ChevronDown, Plus, ScrollText, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import AddTransactionModal from '@/components/studio/AddTransactionModal'

interface SalesPageClientProps {
    studio: { id: string; name: string }
    pendingPlans: any[]
    transactions: any[]
    packages: any[]
    memberships: any[]
}

export default function SalesPageClient({ 
    studio, 
    pendingPlans, 
    transactions, 
    packages, 
    memberships 
}: SalesPageClientProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const salesActions = (
        <div className="flex items-center gap-4">
            <Link 
                href="/studio/reports/statements"
                className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-200 rounded-full text-xs font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm"
            >
                <ScrollText className="w-4 h-4" />
                Monthly Statement
            </Link>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#2D3282] rounded-full text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Add Transaction
            </button>
        </div>
    )

    return (
        <StudioDashboardShell 
            title="Sale Transactions"
            description="View and manage your sales transactions"
            breadcrumbs={[{ label: 'Sales' }, { label: 'Sale Transactions' }]}
            actions={salesActions}
        >
            <div className="space-y-8">
                {/* Manual Approvals Prompt */}
                {pendingPlans && pendingPlans.filter(p => p.payment_proof_url).length > 0 && (
                    <div className="mb-12 relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-slate-500/20 to-zinc-500/20 rounded-[2rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                        <div className="relative p-8 bg-white border border-indigo-50 rounded-[2rem] shadow-tight flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden">
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner ring-1 ring-indigo-100/50">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-charcoal uppercase tracking-tight">Manual Payments Pending</h3>
                                    <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] opacity-60">
                                        {pendingPlans.filter(p => p.payment_proof_url).length} customer {pendingPlans.filter(p => p.payment_proof_url).length === 1 ? 'plan' : 'plans'} waiting for verification
                                    </p>
                                </div>
                            </div>
                            <Link 
                                href="/studio/sales/approvals"
                                className="w-full md:w-auto px-8 py-4 bg-charcoal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-center"
                            >
                                Verify Now
                            </Link>
                        </div>
                    </div>
                )}

                <div className="h-px bg-zinc-100" />

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group flex-1 min-w-[300px] max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#2D3282] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search" 
                            className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#2D3282] transition-all"
                        />
                    </div>

                    <button className="px-6 py-3 bg-[#2D3282] text-white rounded-full text-[11px] font-black uppercase tracking-widest hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap">
                        Today
                    </button>

                    <button className="px-6 py-3 bg-white border border-zinc-200 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-all flex items-center gap-2 whitespace-nowrap">
                        Payment type
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    <button className="px-6 py-3 bg-white border border-zinc-200 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-all flex items-center gap-2 whitespace-nowrap">
                        Sales channel
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    <button className="px-6 py-3 bg-white border border-zinc-200 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-all flex items-center gap-2 whitespace-nowrap">
                        More filters
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Transaction List */}
                <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
                    <TransactionHistory 
                        transactions={transactions?.filter(tx => tx.status !== 'pending' && tx.status !== 'pending_payment') || []} 
                    />
                </div>
            </div>

            <AddTransactionModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                packages={packages}
                memberships={memberships}
            />
        </StudioDashboardShell>
    )
}
