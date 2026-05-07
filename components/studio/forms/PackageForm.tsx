'use client'

import React, { useState, useCallback, memo } from 'react'
import { Plus, CreditCard, Check } from 'lucide-react'
import StudioFormModal from '@/components/shared/StudioFormModal'
import { createPackage, updatePackage } from '@/app/(dashboard)/studio/pricing/actions'
import { usePricingForm } from './usePricingForm'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import AIInputAssistant from '@/components/ai/AIInputAssistant'

import { Package as PackageType, Service, ServiceCategory, Outlet } from '@/types/agency'

interface PackageFormProps {
    isOpen: boolean
    onClose: () => void
    services: Service[]
    categories: ServiceCategory[]
    outlets: Outlet[]
    initialData?: PackageType | null
    studioId: string
}

const TABS = [
    { id: 'details', label: 'Details' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'options', label: 'Options' }
]

const DEFAULT_FORM = {
    name: '',
    description: '',
    price: '',
    credits: '10',
    validity_days: '90',
    validity_value: '1',
    validity_unit: 'months',
    is_private: false,
    category: '',
    category_id: '',
    applicable_service_ids: [] as string[],
    location_access_type: 'admin_selected',
    applicable_outlet_ids: [] as string[],
    purchase_limit: '',
    restriction_type: 'all',
    booking_per_class_limit: '',
    activation_type: 'purchase',
    grace_period_value: '1',
    grace_period_unit: 'weeks',
    display_type: 'auto'
}

interface PackageFormContentProps {
    form: typeof DEFAULT_FORM
    activeTab: string
    onChange: (field: keyof typeof DEFAULT_FORM, value: any) => void
    services: Service[]
    categories: ServiceCategory[]
    outlets: Outlet[]
}

const PackageFormContent = memo(({ form, activeTab, onChange, services, categories, outlets }: PackageFormContentProps) => {
    const [showPreview, setShowPreview] = React.useState(true)

    const PackagePreview = ({ form }: { form: typeof DEFAULT_FORM }) => {
        return (
            <Card variant="default" className="p-8 space-y-6 max-w-sm mx-auto animate-in fade-in zoom-in duration-300">
                <div className="space-y-1 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{form.category || 'Package Category'}</p>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">{form.name || 'Your Package Name'}</h3>
                    <p className="text-2xl font-black text-primary tracking-tight">₱{parseFloat(form.price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                
                <Card variant="flat" className="p-6 space-y-4 rounded-2xl">
                    <div className="flex items-center gap-3 text-zinc-600">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">One time payment</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">{form.credits} credits one-time</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                            <Check className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold">
                            {form.activation_type === 'purchase' ? 'Starts on date of purchase' : `Valid for ${form.validity_value} ${form.validity_unit} from first booking`}
                        </span>
                    </div>
                </Card>
            </Card>
        )
    }

    return (
        <div className="space-y-12">
            {activeTab === 'details' && (
                <div className="space-y-10">
                    <Field 
                        label="Package Name"
                        actions={
                            <AIInputAssistant 
                                fieldName="Package Name"
                                onApply={(val) => onChange('name', val)}
                                getContext={() => ({
                                    title: form.name,
                                    description: form.description,
                                    category: form.category
                                })}
                            />
                        }
                    >
                        <Input
                            placeholder="e.g. 10 Class Introduction"
                            value={form.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            variant="atelier"
                        />
                    </Field>

                    <Field 
                        label="Description"
                        actions={
                            <AIInputAssistant 
                                fieldName="Description"
                                onApply={(val) => onChange('description', val)}
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
                            onChange={(e) => onChange('description', e.target.value)}
                            variant="atelier"
                            rows={5}
                        />
                    </Field>

                    <Field label="Category">
                        <Select 
                            value={form.category_id}
                            onValueChange={(val) => {
                                const cat = categories.find(c => c.id === val)
                                onChange('category_id', val)
                                onChange('category', cat?.name || '')
                            }}
                            options={[
                                { label: 'No Category (General)', value: '' },
                                ...categories.map((cat) => ({ label: cat.name, value: cat.id }))
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
                            onChange={(e) => onChange('price', e.target.value)}
                            variant="atelier"
                            className="pl-14"
                        >
                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₱</span>
                        </Input>
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Field label="Credits">
                            <Input
                                type="number"
                                value={form.credits}
                                onChange={(e) => onChange('credits', e.target.value)}
                                variant="atelier"
                            />
                        </Field>
                        <Field label="Package Validity">
                            <div className="flex gap-4">
                                <Input
                                    type="number"
                                    value={form.validity_value}
                                    onChange={(e) => onChange('validity_value', e.target.value)}
                                    variant="atelier"
                                    className="w-24"
                                />
                                <Select 
                                    value={form.validity_unit}
                                    onValueChange={(val) => onChange('validity_unit', val)}
                                    options={[
                                        { label: 'Days', value: 'days' },
                                        { label: 'Weeks', value: 'weeks' },
                                        { label: 'Months', value: 'months' }
                                    ]}
                                    className="flex-1"
                                />
                            </div>
                        </Field>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-zinc-100">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Activation date starts on</h4>
                        <div className="flex flex-col gap-4">
                            <Card 
                                onClick={() => onChange('activation_type', 'purchase')}
                                variant={form.activation_type === 'purchase' ? 'default' : 'flat'}
                                className={clsx(
                                    "p-6 flex items-center gap-4 cursor-pointer transition-all",
                                    form.activation_type === 'purchase' ? "border-primary/30 ring-4 ring-primary/5" : "border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    form.activation_type === 'purchase' ? "border-primary bg-primary" : "border-zinc-200"
                                )}>
                                    {form.activation_type === 'purchase' && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className="text-sm font-bold text-zinc-900">Date of purchase</span>
                            </Card>

                            <Card 
                                onClick={() => onChange('activation_type', 'first_booking')}
                                variant={form.activation_type === 'first_booking' ? 'default' : 'flat'}
                                className={clsx(
                                    "p-6 flex flex-col gap-4 cursor-pointer transition-all",
                                    form.activation_type === 'first_booking' ? "border-primary/30 ring-4 ring-primary/5" : "border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        form.activation_type === 'first_booking' ? "border-primary bg-primary" : "border-zinc-200"
                                    )}>
                                        {form.activation_type === 'first_booking' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900">Date of first booking</span>
                                </div>
                                
                                {form.activation_type === 'first_booking' && (
                                    <div className="pt-4 space-y-4 ml-9 border-t border-zinc-100">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">
                                            Validity will start if no booking was made after
                                        </p>
                                        <div className="flex gap-4">
                                            <Select
                                                value={form.grace_period_value}
                                                onValueChange={(val) => onChange('grace_period_value', val)}
                                                options={[1,2,3,4,5,6,7,8].map(n => ({ label: String(n), value: String(n) }))}
                                                className="w-24"
                                            />
                                            <Select
                                                value={form.grace_period_unit}
                                                onValueChange={(val) => onChange('grace_period_unit', val)}
                                                options={[
                                                    { label: 'days', value: 'days' },
                                                    { label: 'weeks', value: 'weeks' },
                                                    { label: 'months', value: 'months' }
                                                ]}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'options' && (
                <div className="space-y-12">
                    <Card variant="flat" className="p-8 border-zinc-100">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-zinc-900 tracking-tight">Private Package</h4>
                                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Only visible via direct link/admin assignment</p>
                            </div>
                            <Switch
                                checked={form.is_private}
                                onChange={(checked) => onChange('is_private', checked)}
                            />
                        </div>
                    </Card>

                    {/* Location Access */}
                    {outlets.length > 1 && (
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Location access for customer</h4>
                            <div className="space-y-4">
                                <Card 
                                    onClick={() => onChange('location_access_type', 'admin_selected')}
                                    variant={form.location_access_type === 'admin_selected' ? 'default' : 'flat'}
                                    className={clsx(
                                        "p-6 space-y-6 cursor-pointer transition-all",
                                        form.location_access_type === 'admin_selected' ? "border-primary/30 ring-4 ring-primary/5" : "border-transparent"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            form.location_access_type === 'admin_selected' ? "border-primary bg-primary" : "border-zinc-200"
                                        )}>
                                            {form.location_access_type === 'admin_selected' && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block text-sm font-bold text-zinc-900">I will choose the location access</span>
                                            <span className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest">You decide which location customers can access</span>
                                        </div>
                                    </div>
                                    
                                    {form.location_access_type === 'admin_selected' && (
                                        <div className="grid grid-cols-1 gap-3 ml-9 pt-6 border-t border-zinc-100">
                                            {outlets.map(outlet => (
                                                <div 
                                                    key={outlet.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const current = form.applicable_outlet_ids || [];
                                                        onChange('applicable_outlet_ids', current.includes(outlet.id) 
                                                            ? current.filter((id: string) => id !== outlet.id)
                                                            : [...current, outlet.id]
                                                        );
                                                    }}
                                                    className="flex items-center gap-4 p-4 bg-zinc-50 border border-zinc-100 rounded-2xl hover:bg-white transition-all group/item"
                                                >
                                                    <Checkbox 
                                                        checked={form.applicable_outlet_ids?.includes(outlet.id)}
                                                        onChange={() => {}} // Handled by row click
                                                    />
                                                    <span className="text-sm font-bold text-zinc-700">{outlet.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                <Card 
                                    onClick={() => onChange('location_access_type', 'customer_selected')}
                                    variant={form.location_access_type === 'customer_selected' ? 'default' : 'flat'}
                                    className={clsx(
                                        "p-6 flex items-start gap-4 cursor-pointer transition-all",
                                        form.location_access_type === 'customer_selected' ? "border-primary/30 ring-4 ring-primary/5" : "border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        form.location_access_type === 'customer_selected' ? "border-primary bg-primary" : "border-zinc-200"
                                    )}>
                                        {form.location_access_type === 'customer_selected' && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block text-sm font-bold text-zinc-900">Let customer choose 1 location</span>
                                        <span className="block text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Customers select one location for their package</span>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Purchase & Booking Limits */}
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Purchase options</h4>
                            <div className="space-y-4">
                                <Card variant="flat" className="p-6 space-y-4">
                                    <Checkbox 
                                        label="Limit number of times this plan can be purchased"
                                        checked={!!form.purchase_limit}
                                        onChange={(checked) => onChange('purchase_limit', checked ? '1' : '')}
                                    />
                                    {form.purchase_limit !== '' && (
                                        <div className="ml-10">
                                            <Input 
                                                type="number"
                                                value={form.purchase_limit}
                                                onChange={(e) => onChange('purchase_limit', e.target.value)}
                                                variant="atelier"
                                                className="w-24"
                                            />
                                        </div>
                                    )}
                                </Card>

                                <Card variant="flat" className="p-6 space-y-4">
                                    <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2 mb-2">Restrict purchase to</span>
                                    <div className="flex flex-wrap gap-3">
                                        {['all', 'new_clients'].map(type => (
                                            <Button
                                                key={type}
                                                variant={form.restriction_type === type ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => onChange('restriction_type', type)}
                                                className="text-[10px] font-black uppercase tracking-widest py-3 px-6"
                                            >
                                                {type === 'all' ? 'All customers' : 'New clients only'}
                                            </Button>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-2">Booking options</h4>
                            <Card variant="flat" className="p-6 space-y-4">
                                <Checkbox 
                                    label="Limit number of customers to be booked per class"
                                    checked={!!form.booking_per_class_limit}
                                    onChange={(checked) => onChange('booking_per_class_limit', checked ? '1' : '')}
                                />
                                {form.booking_per_class_limit !== '' && (
                                    <div className="ml-10">
                                        <Input 
                                            type="number"
                                            value={form.booking_per_class_limit}
                                            onChange={(e) => onChange('booking_per_class_limit', e.target.value)}
                                            variant="atelier"
                                            className="w-24"
                                        />
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-8 pt-10 border-t border-zinc-100">
                        <div className="space-y-2 px-2">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Display options</h4>
                            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">Display layout in Online Store</p>
                        </div>

                        <Card 
                            variant="flat" 
                            className="bg-indigo-50/30 border-indigo-100 p-8 space-y-6 rounded-[2.5rem]"
                            header={
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-sm">
                                            <Check className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Live Storefront Preview</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                    >
                                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                                    </button>
                                </div>
                            }
                        >
                            {showPreview && (
                                <div className="space-y-6">
                                    <p className="text-xs font-medium text-indigo-600 leading-relaxed opacity-80">
                                        This is how your package card will appear on your public storefront.
                                    </p>
                                    <PackagePreview form={form} />
                                </div>
                            )}
                        </Card>

                        <div className="space-y-4">
                            {[
                                { id: 'auto', label: 'Use auto-generated details', desc: 'Show system-generated info like renewal cycles and credit usage.' },
                                { id: 'custom', label: 'Use custom description', desc: 'Show your own written description instead of bullet points.' }
                            ].map(opt => (
                                <Card 
                                    key={opt.id}
                                    onClick={() => onChange('display_type', opt.id)}
                                    variant={form.display_type === opt.id ? 'default' : 'flat'}
                                    className={clsx(
                                        "p-8 flex items-start gap-6 cursor-pointer transition-all",
                                        form.display_type === opt.id ? "border-primary/30 ring-4 ring-primary/5" : "border-transparent"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        form.display_type === opt.id ? "border-primary bg-primary" : "border-zinc-200"
                                    )}>
                                        {form.display_type === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="block text-sm font-black text-zinc-900">{opt.label}</span>
                                        <span className="block text-[10px] font-medium text-zinc-400 leading-relaxed uppercase tracking-widest">{opt.desc}</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Eligible Classes</h4>
                            <button 
                                type="button" 
                                onClick={() => {
                                    const allIds = services.map(s => s.id)
                                    const currentIds = form.applicable_service_ids || []
                                    const isAllSelected = allIds.length > 0 && allIds.every(id => currentIds.includes(id))
                                    onChange('applicable_service_ids', isAllSelected ? [] : allIds)
                                }}
                                className="text-[10px] font-black text-primary uppercase tracking-widest"
                            >
                                {(services.length > 0 && (form.applicable_service_ids || []).length === services.length) ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        
                        <Card variant="flat" innerClassName="p-0 overflow-hidden border border-zinc-100 max-h-[400px] overflow-y-auto shadow-inner">
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
                                                onChange('applicable_service_ids', isSelected 
                                                    ? currentIds.filter((id: string) => id !== service.id)
                                                    : [...currentIds, service.id]
                                                )
                                            }}
                                            className="px-8 py-5 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                                    (form.applicable_service_ids || []).includes(service.id) ? "bg-primary/5 text-primary shadow-sm" : "bg-zinc-50 text-zinc-300"
                                                )}>
                                                    <CreditCard className="w-5 h-5" />
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
                </div>
            )}
        </div>
    )
})
PackageFormContent.displayName = 'PackageFormContent'

export default function PackageForm({ isOpen, onClose, services, categories = [], outlets = [], initialData, studioId }: PackageFormProps) {
    const { form, updateField, isSaving, handleSave } = usePricingForm({
        isOpen,
        onClose,
        initialData,
        defaultForm: DEFAULT_FORM,
        validation: (data) => {
            if (!data.name.trim()) return 'Package name is required'
            if (!data.price || parseFloat(data.price) < 0) return 'Valid price is required'
            if (!data.credits || parseInt(data.credits) < 1) return 'At least 1 credit is required'
            return null
        },
        onSave: async (data) => {
            return initialData?.id 
                ? updatePackage(initialData.id, studioId, data) 
                : createPackage({ ...data, studioId })
        }
    })

    const renderContent = useCallback((activeTab: string) => (
        <PackageFormContent form={form} activeTab={activeTab} onChange={updateField} services={services} categories={categories} outlets={outlets} />
    ), [form, updateField, services, categories, outlets])

    return (
        <StudioFormModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Package" : "Add Package"}
            tabs={TABS}
            onSave={handleSave}
            isSaving={isSaving}
            saveLabel={initialData ? "Save Changes" : "Create Package"}
        >
            {renderContent}
        </StudioFormModal>
    )
}
