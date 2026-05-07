'use client'

import React, { useState, useCallback, memo } from 'react'
import StudioFormModal from '@/components/shared/StudioFormModal'
import { createPromoCode } from '@/app/(dashboard)/studio/promo/actions'
import { Percent, DollarSign, Calendar, Zap, Tag, Check } from 'lucide-react'
import { clsx } from 'clsx'

interface PromoCodeFormProps {
    isOpen: boolean
    onClose: () => void
    pricingItems: any[]
    studioId: string
}

const TABS = [
    { id: 'settings', label: 'Promo Settings' }
]

// Memoized Form Content to isolate re-renders
const PromoCodeFormContent = memo(({ form, pricingItems, onChange }: { 
    form: any, 
    pricingItems: any[],
    onChange: (field: string, value: any) => void 
}) => {
    const toggleItem = (id: string) => {
        const current = form.applicable_ids || []
        if (current.includes(id)) {
            onChange('applicable_ids', current.filter((i: string) => i !== id))
        } else {
            onChange('applicable_ids', [...current, id])
        }
    }

    return (
        <div className="space-y-10 pb-10">
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Promo Code</label>
                <input
                    type="text"
                    value={form.code}
                    onChange={(e) => onChange('code', e.target.value.toUpperCase())}
                    className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    placeholder="e.g. SUMMER2026"
                />
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Discount Type</label>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        type="button"
                        onClick={() => onChange('discount_type', 'percentage')}
                        className={clsx(
                            "flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all",
                            form.discount_type === 'percentage' 
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-xl" 
                                : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                        )}
                    >
                        <Percent className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Percentage</span>
                    </button>
                    <button 
                        type="button"
                        onClick={() => onChange('discount_type', 'fixed_amount')}
                        className={clsx(
                            "flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all",
                            form.discount_type === 'fixed_amount' 
                                ? "bg-zinc-900 border-zinc-900 text-white shadow-xl" 
                                : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                        )}
                    >
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Fixed Amount</span>
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Discount Value</label>
                <div className="relative">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                        {form.discount_type === 'percentage' ? '%' : '₱'}
                    </span>
                    <input
                        type="number"
                        value={form.discount_value}
                        onChange={(e) => onChange('discount_value', e.target.value)}
                        className="w-full pl-14 pr-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Start Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <input
                            type="date"
                            value={form.starts_at}
                            onChange={(e) => onChange('starts_at', e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-[11px] font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expiry Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <input
                            type="date"
                            value={form.expires_at}
                            onChange={(e) => onChange('expires_at', e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-[11px] font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="Never"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-zinc-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Applicability</h4>
                    </div>
                    <select 
                        value={form.applies_to_type}
                        onChange={(e) => onChange('applies_to_type', e.target.value)}
                        className="bg-zinc-50 border-none text-[10px] font-bold uppercase tracking-widest text-zinc-500 focus:ring-0 cursor-pointer"
                    >
                        <option value="all">All Packages</option>
                        <option value="specific_plans">Specific Packages</option>
                    </select>
                </div>

                {form.applies_to_type === 'specific_plans' && (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {pricingItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleItem(item.id)}
                                className={clsx(
                                    "w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all",
                                    form.applicable_ids?.includes(item.id)
                                        ? "bg-emerald-50 border-emerald-500/20 text-emerald-900"
                                        : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200"
                                )}
                            >
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-xs font-bold">{item.name}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">{item.type}</span>
                                </div>
                                {form.applicable_ids?.includes(item.id) && <Check className="w-3 h-3 text-emerald-600" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-6 border-t border-zinc-50">
                <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Usage Rules</h4>
                </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Usage Limit</label>
                    <input
                        type="number"
                        value={form.usage_limit}
                        onChange={(e) => onChange('usage_limit', e.target.value)}
                        className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="Unlimited"
                    />
                </div>
            </div>
        </div>
    )
})
PromoCodeFormContent.displayName = 'PromoCodeFormContent'

export default function PromoCodeForm({ isOpen, onClose, pricingItems, studioId }: PromoCodeFormProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        usage_limit: '',
        starts_at: new Date().toISOString().split('T')[0],
        expires_at: '',
        applies_to_type: 'all',
        applicable_ids: [] as string[]
    })

    const handleFormChange = useCallback((field: string, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await createPromoCode({ ...form, studioId })
            if (result.success) {
                onClose()
            } else {
                alert(`Failed to create promo code: ${result.error}`)
            }
        } catch (err) {
            console.error(err)
            alert('An unexpected error occurred. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const renderContent = useCallback(() => (
        <PromoCodeFormContent form={form} pricingItems={pricingItems} onChange={handleFormChange} />
    ), [form, pricingItems, handleFormChange])

    return (
        <StudioFormModal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Promo Code"
            tabs={TABS}
            onSave={handleSave}
            isSaving={isSaving}
            saveLabel="Generate Code"
        >
            {renderContent}
        </StudioFormModal>
    )
}
