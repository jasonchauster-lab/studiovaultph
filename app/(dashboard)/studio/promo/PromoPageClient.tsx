'use client'

import React, { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Tag, Plus, Check, Trash2, Percent, DollarSign, Search, ChevronDown, MoreHorizontal } from 'lucide-react'
import { clsx } from 'clsx'
import PromoCodeForm from '@/components/studio/forms/PromoCodeForm'
import PromoUsageModal from '@/components/studio/modals/PromoUsageModal'
import { deletePromoCode } from './actions'
import { History } from 'lucide-react'

interface PromoPageClientProps {
    promoCodes: any[]
    pricingItems: any[]
    studioId: string
}

export default function PromoPageClient({ promoCodes, pricingItems, studioId }: PromoPageClientProps) {
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [selectedPromoForHistory, setSelectedPromoForHistory] = useState<any>(null)

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promo code?')) return
        setIsDeleting(id)
        try {
            await deletePromoCode(id)
        } catch (err) {
            console.error(err)
            alert('Failed to delete promo code.')
        } finally {
            setIsDeleting(null)
        }
    }

    const promoActions = (
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsPromoModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2D3282] rounded-lg text-[11px] font-bold uppercase tracking-widest text-white hover:bg-indigo-900 transition-all shadow-md"
            >
                <Plus className="w-4 h-4" />
                Add Promo Code
            </button>
        </div>
    )

    return (
        <>
            <StudioDashboardShell 
                title="Promo Codes"
                breadcrumbs={[{ label: 'Marketing' }, { label: 'Promo Codes' }]}
                actions={promoActions}
            >
                <div className="space-y-6">
                    {/* Filter Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#2D3282] transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search"
                                className="w-full pl-12 pr-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#2D3282] transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-all">
                                Status
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content List with Accordions */}
                    <div className="space-y-4">
                        <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-bold text-zinc-900">All Promo Codes</h3>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-zinc-100">
                                        {promoCodes.length} items
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                            </div>

                            <div className="divide-y divide-zinc-50">
                                {promoCodes.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-400 italic text-sm">
                                        No active promo codes
                                    </div>
                                ) : (
                                    promoCodes.map((promo) => (
                                        <div key={promo.id} className="px-6 py-5 flex items-center justify-between hover:bg-zinc-50/50 transition-colors group text-zinc-900">
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <Tag className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col gap-0.5 min-w-[200px]">
                                                    <h4 className="text-[13px] font-bold text-zinc-900">{promo.code}</h4>
                                                    <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                                                        {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ''} Off
                                                    </p>
                                                </div>
                                                <div className="flex-1 hidden md:flex items-center gap-12">
                                                    <div className="flex flex-col gap-0.5 min-w-[100px]">
                                                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Usage</span>
                                                        <span className="text-sm font-black text-zinc-900">{promo.current_usage} / {promo.usage_limit || '∞'}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                        <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Status</span>
                                                        <span className={clsx(
                                                            "text-[10px] font-bold px-2 py-0.5 rounded w-fit",
                                                            promo.is_active ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                                                        )}>
                                                            {promo.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => setSelectedPromoForHistory(promo)}
                                                    className="p-2.5 text-zinc-400 hover:text-[#2D3282] hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                    title="Usage History"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(promo.id)}
                                                    disabled={isDeleting === promo.id}
                                                    className="p-2.5 text-zinc-300 hover:text-red-500 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button className="w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-zinc-100 rounded-xl text-zinc-400 hover:border-zinc-200 hover:text-zinc-600 transition-all group">
                            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Add promo category</span>
                        </button>
                    </div>
                </div>
            </StudioDashboardShell>

            <PromoCodeForm 
                isOpen={isPromoModalOpen} 
                onClose={() => setIsPromoModalOpen(false)} 
                pricingItems={pricingItems}
                studioId={studioId}
            />

            <PromoUsageModal
                isOpen={!!selectedPromoForHistory}
                onClose={() => setSelectedPromoForHistory(null)}
                promo={selectedPromoForHistory}
            />
        </>
    )
}

