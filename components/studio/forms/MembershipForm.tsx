'use client'

import React, { useMemo, memo } from 'react'
import { Package, Check } from 'lucide-react'
import StudioFormModal from '@/components/shared/StudioFormModal'
import { createMembership, updateMembership } from '@/app/(dashboard)/studio/pricing/actions'
import { usePricingForm } from './usePricingForm'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card } from '@/components/ui/Card'
import AIInputAssistant from '@/components/ai/AIInputAssistant'

import { Membership, Service, ServiceCategory, Outlet } from '@/types/agency'

interface MembershipFormProps {
    isOpen: boolean
    onClose: () => void
    services: Service[]
    categories: ServiceCategory[]
    outlets: Outlet[]
    initialData?: Membership | null
    studioId: string
}

const TABS = [
    { id: 'about', label: 'About' },
    { id: 'pricing', label: 'Pricing & Credits' },
    { id: 'options', label: 'Options' }
]

const DEFAULT_FORM = {
    name: '',
    description: '',
    category: '',
    category_id: '',
    price: '',
    credits: '',
    validity_days: '30',
    is_private: false,
    features: [] as string[],
    applicable_service_ids: [] as string[],
    applicable_outlet_ids: [] as string[]
}

interface MembershipFormContentProps {
    form: typeof DEFAULT_FORM
    updateField: (field: keyof typeof DEFAULT_FORM, value: any) => void
    categories: ServiceCategory[]
    services: Service[]
    outlets: Outlet[]
    activeTab: string
}

const MembershipFormContent = memo(({ form, updateField, categories, services, outlets, activeTab }: MembershipFormContentProps) => {
    return (
        <div className="space-y-12">
            {activeTab === 'about' && (
                <div className="space-y-10">
                    <Field 
                        label="Membership Name" 
                        actions={
                            <AIInputAssistant 
                                fieldName="Membership Name"
                                onApply={(val) => updateField('name', val)}
                                getContext={() => ({
                                    title: form.name,
                                    description: form.description,
                                    category: form.category
                                })}
                            />
                        }
                    >
                        <Input
                            placeholder="e.g. Unlimited Monthly Reformer"
                            value={form.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            variant="atelier"
                        />
                    </Field>

                    <Field 
                        label="Description"
                        actions={
                            <AIInputAssistant 
                                fieldName="Description"
                                onApply={(val) => updateField('description', val)}
                                getContext={() => ({
                                    title: form.name,
                                    description: form.description,
                                    category: form.category
                                })}
                            />
                        }
                    >
                        <Textarea
                            placeholder="Tell your clients about this plan..."
                            value={form.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            variant="atelier"
                            rows={5}
                        />
                    </Field>

                    <Field label="Category">
                        <Select 
                            value={form.category_id}
                            onValueChange={(val) => {
                                const cat = categories.find((c: any) => c.id === val)
                                updateField('category_id', val)
                                updateField('category', cat?.name || '')
                            }}
                            options={[
                                { label: 'No Category (General)', value: '' },
                                ...categories.map((cat: any) => ({ label: cat.name, value: cat.id }))
                            ]}
                        />
                    </Field>
                </div>
            )}

            {activeTab === 'pricing' && (
                <div className="space-y-10">
                    <Field label="Price (PHP)">
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={form.price}
                            onChange={(e) => updateField('price', e.target.value)}
                            variant="atelier"
                            className="pl-14"
                        >
                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₱</span>
                        </Input>
                    </Field>

                    <div className="grid grid-cols-2 gap-8">
                        <Field label="Validity (Days)">
                            <Input
                                type="number"
                                value={form.validity_days}
                                onChange={(e) => updateField('validity_days', e.target.value)}
                                variant="atelier"
                            />
                        </Field>
                        <Field label="Session Credits" hint="Leave empty for unlimited">
                            <Input
                                type="number"
                                placeholder="Unlimited"
                                value={form.credits}
                                onChange={(e) => updateField('credits', e.target.value)}
                                variant="atelier"
                            />
                        </Field>
                    </div>
                </div>
            )}

            {activeTab === 'options' && (
                <div className="space-y-12">
                    <Card variant="flat" className="p-8 border-zinc-100">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-zinc-900 tracking-tight">Private Membership</h4>
                                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Only visible via direct link/admin assignment</p>
                            </div>
                            <Switch
                                checked={form.is_private}
                                onChange={(checked) => updateField('is_private', checked)}
                            />
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Eligible Classes</h4>
                            <button 
                                type="button" 
                                onClick={() => {
                                    const allIds = services.map(s => s.id)
                                    const isAllSelected = allIds.length > 0 && allIds.every(id => form.applicable_service_ids.includes(id))
                                    updateField('applicable_service_ids', isAllSelected ? [] : allIds)
                                }}
                                className="text-[10px] font-black text-primary uppercase tracking-widest"
                            >
                                {(services.length > 0 && (form.applicable_service_ids || []).length === services.length) ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        
                        <Card variant="flat" innerClassName="p-0 overflow-hidden border border-zinc-100 max-h-[300px] overflow-y-auto">
                            {services.length === 0 ? (
                                <div className="p-10 text-center">
                                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">No classes assigned yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-50 bg-white">
                                    {services.map((service) => (
                                        <div 
                                            key={service.id} 
                                            onClick={() => {
                                                const currentIds = form.applicable_service_ids || []
                                                const isSelected = currentIds.includes(service.id)
                                                updateField('applicable_service_ids', isSelected 
                                                    ? currentIds.filter((id: string) => id !== service.id)
                                                    : [...currentIds, service.id])
                                            }}
                                            className="px-8 py-5 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                                    (form.applicable_service_ids || []).includes(service.id) ? "bg-primary/5 text-primary shadow-sm" : "bg-zinc-50 text-zinc-300"
                                                )}>
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[13px] font-bold text-zinc-900 line-clamp-1">{service.name}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{service.duration_minutes}m · {service.category}</span>
                                                </div>
                                            </div>
                                            <Checkbox 
                                                checked={(form.applicable_service_ids || []).includes(service.id)}
                                                onChange={() => {}} // Handled by row click
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Location Access */}
                    {outlets.length > 1 && (
                        <div className="space-y-6 pt-12 border-t border-zinc-100">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Location Access</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {outlets.map(outlet => (
                                    <Card 
                                        key={outlet.id}
                                        onClick={() => {
                                            const current = form.applicable_outlet_ids || [];
                                            updateField('applicable_outlet_ids', current.includes(outlet.id) 
                                                ? current.filter((id: string) => id !== outlet.id)
                                                : [...current, outlet.id])
                                        }}
                                        variant="default"
                                        innerClassName="p-5 flex items-center gap-4"
                                        isHoverable
                                    >
                                        <Checkbox 
                                            checked={form.applicable_outlet_ids?.includes(outlet.id)}
                                            onChange={() => {}} // Handled by card click
                                        />
                                        <span className="text-sm font-bold text-zinc-700">{outlet.name}</span>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})
MembershipFormContent.displayName = 'MembershipFormContent'

export default function MembershipForm({ isOpen, onClose, services = [], categories = [], outlets = [], initialData, studioId }: MembershipFormProps) {
    const { form, updateField, isSaving, handleSave } = usePricingForm({
        isOpen,
        onClose,
        initialData,
        defaultForm: DEFAULT_FORM,
        validation: (data) => {
            if (!data.name.trim()) return 'Membership name is required'
            if (!data.price || parseFloat(data.price) < 0) return 'Valid price is required'
            if (!data.validity_days || parseInt(data.validity_days) < 1) return 'Valid validity days is required'
            return null
        },
        onSave: async (data) => {
            return initialData?.id 
                ? updateMembership(initialData.id, studioId, data) 
                : createMembership({ ...data, studioId })
        }
    })

    return (
        <StudioFormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Membership" : "Add Membership"}
            tabs={TABS}
            onSave={handleSave}
            isSaving={isSaving}
            saveLabel={initialData ? "Save Changes" : "Create Membership"}
        >
            {(activeTab) => (
                <MembershipFormContent 
                    form={form} 
                    updateField={updateField} 
                    categories={categories} 
                    services={services} 
                    outlets={outlets} 
                    activeTab={activeTab} 
                />
            )}
        </StudioFormModal>
    )
}
