'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Minus, Calendar, Clock, ChevronDown, Check, AlertCircle, ArrowRight, Box, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

interface Service {
    id: string
    name: string
    difficulty: string
}

interface Instructor {
    id: string
    full_name: string
    avatar_url: string
}

interface Outlet {
    id: string
    name: string
    address?: string
    inventory?: any
}

interface AddScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    services: Service[]
    instructors: Instructor[]
    onSubmit: (formData: FormData) => Promise<void>
    initialDate?: string
    initialTime?: string
    outletId?: string
    outlets?: Outlet[]
    inventory?: Record<string, any>
    packagesCount?: number
    membershipsCount?: number
    marketplaceStatus?: string
}

const COLORS = [
    { name: 'Teal', value: '#2A9D8F' },
    { name: 'Red', value: '#E76F51' },
    { name: 'Yellow', value: '#E9C46A' },
    { name: 'Blue', value: '#264653' },
    { name: 'Orange', value: '#F4A261' },
]

export default function AddScheduleModal({
    isOpen,
    onClose,
    services,
    instructors,
    onSubmit,
    initialDate,
    initialTime,
    outletId,
    outlets = [],
    inventory,
    packagesCount = 0,
    membershipsCount = 0,
    marketplaceStatus = 'private'
}: AddScheduleModalProps) {
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [useDifferentName, setUseDifferentName] = useState(false)
    const [pax, setPax] = useState(1)
    const [waitlist, setWaitlist] = useState(0)
    const [repeatRule, setRepeatRule] = useState('none')
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedEquipment, setSelectedEquipment] = useState<Record<string, number>>({})
    const [selectedOutletId, setSelectedOutletId] = useState<string>(outletId || '')

    // Pre-default branch selection when modal opens or view changes
    useEffect(() => {
        if (isOpen) {
            if (outletId) {
                setSelectedOutletId(outletId)
            } else if (outlets && outlets.length === 1) {
                setSelectedOutletId(outlets[0].id)
            }
        }
    }, [isOpen, outletId, outlets?.length])

    // Use selectedOutletId for inventory context if multiple outlets
    const currentOutlet = outlets.find(o => o.id === (selectedOutletId || outletId))
    const currentInventory = currentOutlet?.inventory || inventory

    if (!isOpen) return null

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        const finalOutletId = selectedOutletId || outletId
        if (!finalOutletId) {
            alert('Please select a branch for this session.')
            return
        }

        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)
        formData.append('repeatRule', repeatRule)
        formData.append('color', selectedColor)
        formData.set('outletId', finalOutletId) // Ensure correct outletId is sent
        await onSubmit(formData)
        setIsSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-charcoal/60 animate-in fade-in duration-300">
            <div 
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-500 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-border-grey sticky top-0 bg-white z-10">
                    <h2 className="text-2xl font-bold text-charcoal tracking-tight">Add schedule</h2>
                    <button onClick={onClose} className="p-2 hover:bg-off-white rounded-full transition-colors">
                        <X className="w-6 h-6 text-charcoal/50" />
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-8 space-y-10">
                    {/* Class Search */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Class</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/30" />
                            <select 
                                name="serviceId"
                                required
                                value={selectedService?.id || ''}
                                onChange={(e) => {
                                    const service = services.find(s => s.id === e.target.value)
                                    setSelectedService(service || null)
                                }}
                                className="w-full pl-12 pr-10 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal appearance-none outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-all"
                            >
                                <option value="">Search class</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 pointer-events-none" />
                        </div>
                        <div className="flex items-center gap-3 ml-1">
                            <input 
                                type="checkbox" 
                                checked={useDifferentName}
                                onChange={(e) => setUseDifferentName(e.target.checked)}
                                className="w-5 h-5 rounded border-border-grey text-forest focus:ring-forest cursor-pointer"
                            />
                            <span className="text-sm font-medium text-charcoal/70">Use a different display name</span>
                        </div>
                        {useDifferentName && (
                            <input 
                                name="displayName"
                                placeholder="Enter display name"
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all"
                            />
                        )}
                    </div>

                    {/* Start Date */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Start date</label>
                        <div className="relative">
                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/30 pointer-events-none" />
                            <input 
                                name="date"
                                type="date"
                                required
                                defaultValue={initialDate}
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all uppercase tracking-widest"
                            />
                        </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Start time</label>
                            <div className="relative">
                                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/30 pointer-events-none" />
                                <input 
                                    name="startTime"
                                    type="time"
                                    required
                                    defaultValue={initialTime}
                                    className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Duration (mins)</label>
                            <input 
                                name="duration"
                                type="number"
                                defaultValue={60}
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Calendar Color */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Calendar color</label>
                        <div className="flex gap-4">
                            {COLORS.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setSelectedColor(c.value)}
                                    className={clsx(
                                        "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                                        selectedColor === c.value ? "ring-2 ring-forest ring-offset-2 scale-110" : "hover:scale-105"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                >
                                    {selectedColor === c.value && <Check className="w-4 h-4 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Repeat Rules */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Repeat rules</label>
                        <div className="space-y-3">
                            {[
                                { id: 'none', label: 'Doesn’t repeat' },
                                { id: 'daily', label: 'Daily' },
                                { id: 'weekly', label: 'Weekly' }
                            ].map(rule => (
                                <label key={rule.id} className="flex items-center gap-4 cursor-pointer group">
                                    <div className={clsx(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        repeatRule === rule.id ? "border-forest bg-forest text-white" : "border-border-grey group-hover:border-forest/40"
                                    )}>
                                        {repeatRule === rule.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <input 
                                        type="radio" 
                                        name="repeatRule" 
                                        value={rule.id}
                                        className="hidden" 
                                        checked={repeatRule === rule.id}
                                        onChange={() => setRepeatRule(rule.id)}
                                    />
                                    <span className="text-sm font-bold text-charcoal leading-none">{rule.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-border-grey" />

                    {/* Class Details */}
                    <div className="space-y-8">
                        <h3 className="text-lg font-bold text-charcoal tracking-tight">Class details</h3>
                        
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Location Context</label>
                            <div className="relative">
                                <select 
                                    name="outletIdPlaceholder"
                                    required
                                    value={selectedOutletId}
                                    onChange={(e) => {
                                        setSelectedOutletId(e.target.value)
                                        setSelectedEquipment({}) // Reset equipment selection on branch change
                                    }}
                                    className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all appearance-none"
                                >
                                    <option value="">Select Branch</option>
                                    {outlets.map(o => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Staff (Optional)</label>
                            <select 
                                name="instructorId"
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-sm font-bold text-charcoal outline-none focus:ring-2 focus:ring-forest/20 transition-all appearance-none"
                            >
                                <option value="">Select instructor</option>
                                {instructors.map(i => (
                                    <option key={i.id} value={i.id}>{i.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Class pax</label>
                                <div className="flex items-center gap-4 bg-off-white border border-border-grey rounded-2xl p-2">
                                    <button 
                                        type="button"
                                        onClick={() => setPax(Math.max(1, pax - 1))}
                                        className="w-10 h-10 bg-white shadow-tight rounded-xl flex items-center justify-center hover:bg-forest/5 transition-all text-charcoal"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <input 
                                        name="paxCapacity"
                                        type="number"
                                        value={pax}
                                        onChange={(e) => setPax(parseInt(e.target.value) || 1)}
                                        className="flex-1 text-center bg-transparent font-bold text-sm outline-none"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setPax(pax + 1)}
                                        className="w-10 h-10 bg-white shadow-tight rounded-xl flex items-center justify-center hover:bg-forest/5 transition-all text-charcoal font-bold"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Waitlist (Optional)</label>
                                <div className="flex items-center gap-4 bg-off-white border border-border-grey rounded-2xl p-2">
                                    <button 
                                        type="button"
                                        onClick={() => setWaitlist(Math.max(0, waitlist - 1))}
                                        className="w-10 h-10 bg-white shadow-tight rounded-xl flex items-center justify-center hover:bg-forest/5 transition-all text-charcoal"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <input 
                                        name="waitlistPaxCapacity"
                                        type="number"
                                        value={waitlist}
                                        onChange={(e) => setWaitlist(parseInt(e.target.value) || 0)}
                                        className="flex-1 text-center bg-transparent font-bold text-sm outline-none"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setWaitlist(waitlist + 1)}
                                        className="w-10 h-10 bg-white shadow-tight rounded-xl flex items-center justify-center hover:bg-forest/5 transition-all text-charcoal"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Equipment Selection - Only mandatory if marketplace active or if inventory already exists */}
                        {(['active', 'listed', 'pending'].includes(marketplaceStatus || '') || (currentInventory && Object.keys(currentInventory).length > 0)) && (
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Equipment Requirements</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(currentInventory || {})
                                        .filter(([key, item]: [string, any]) => {
                                            const total = typeof item === 'object' ? item.total : item;
                                            return (total || 0) > 0;
                                        })
                                        .map(([key, item]: [string, any]) => {
                                            const name = typeof item === 'object' ? item.name : key;
                                            const total = typeof item === 'object' ? item.total : item;
                                            return (
                                                <div 
                                                    key={key}
                                                    className={clsx(
                                                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                                        selectedEquipment[key] ? "border-forest bg-forest/5" : "border-border-grey bg-off-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <input 
                                                            type="checkbox"
                                                            name={`eq_${key}`}
                                                            checked={!!selectedEquipment[key]}
                                                            onChange={(e) => {
                                                                const newEq = { ...selectedEquipment }
                                                                if (e.target.checked) {
                                                                    newEq[key] = Math.min(pax, total)
                                                                } else {
                                                                    delete newEq[key]
                                                                }
                                                                setSelectedEquipment(newEq)
                                                            }}
                                                            className="w-5 h-5 rounded border-border-grey text-forest focus:ring-forest cursor-pointer"
                                                        />
                                                        <div>
                                                            <span className="text-sm font-bold text-charcoal">{name}</span>
                                                            <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-widest">Total: {total || 0} units</p>
                                                        </div>
                                                    </div>

                                                    {selectedEquipment[key] && (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-widest">Qty</span>
                                                            <input 
                                                                name={`qty_${key}`}
                                                                type="number"
                                                                min="1"
                                                                max={total}
                                                                value={selectedEquipment[key]}
                                                                onChange={(e) => {
                                                                    const qty = Math.min(parseInt(e.target.value) || 1, total)
                                                                    setSelectedEquipment({ ...selectedEquipment, [key]: qty })
                                                                }}
                                                                className="w-16 px-3 py-2 bg-white border border-border-grey rounded-lg text-xs font-bold text-center outline-none focus:ring-2 focus:ring-forest/20"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-border-grey" />

                    {/* Publish Option */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-charcoal/40 uppercase tracking-widest block">Publish schedule</label>
                        <div className="space-y-4">
                            {[
                                { id: 'true', label: 'Publish now' },
                                { id: 'false', label: 'Publish later' }
                            ].map(opt => (
                                <label key={opt.id} className="flex items-center gap-4 cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="isPublished" 
                                        value={opt.id}
                                        className="w-6 h-6 rounded-full border-2 border-border-grey text-forest focus:ring-forest cursor-pointer" 
                                        defaultChecked={opt.id === 'true'}
                                    />
                                    <span className="text-sm font-bold text-charcoal leading-none">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-10 sticky bottom-0 bg-white pb-4 border-t border-border-grey/50">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-off-white text-charcoal rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-border-grey transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className={clsx(
                                "flex-1 py-4 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-card active:scale-95",
                                isSubmitting ? "bg-forest/50 cursor-not-allowed" : "bg-forest hover:brightness-110"
                            )}
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>

                {/* Mandatory Setup Overlay */}
                {(() => {
                    const isMarketplaceRelevant = ['active', 'listed', 'pending'].includes(marketplaceStatus || '');
                    const hasInventory = currentInventory && Object.keys(currentInventory).length > 0;
                    const hasClasses = services && services.length > 0;
                    const hasPricing = (packagesCount + membershipsCount) > 0;

                    // Equipment is only mandatory if marketplace is active/pending
                    const inventoryRequirementSatisfied = !isMarketplaceRelevant || hasInventory;

                    if (inventoryRequirementSatisfied && hasClasses && hasPricing) return null;

                    return (
                        <div className="absolute inset-0 z-50 bg-white/70 backdrop-blur-[4px] flex items-center justify-center p-8">
                            <div className="bg-white border-2 border-zinc-100 rounded-[3.5rem] p-10 sm:p-14 shadow-2xl max-w-lg w-full text-center space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
                                {/* Accent Background */}
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-200 via-rose-300 to-amber-200" />
                                
                                <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-amber-500">
                                    <ShieldAlert className="w-12 h-12" />
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-zinc-900 tracking-tightest leading-tight">Complete Your Setup</h3>
                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                                        You must complete these steps before you can manage your studio schedule.
                                    </p>
                                </div>

                                <div className="space-y-4 text-left bg-zinc-50 rounded-3xl p-8 border border-zinc-100">
                                    <div className="space-y-6">
                                        {/* Requirement Checklist */}
                                        <div className="flex items-start gap-4">
                                            <div className={clsx("mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all", hasClasses ? "bg-green-500 border-green-500" : "border-zinc-200")}>
                                                {hasClasses && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={clsx("text-xs font-black uppercase tracking-widest", hasClasses ? "text-zinc-400" : "text-zinc-900")}>Define Classes</span>
                                                    {!hasClasses && <Link href="/studio/services" className="text-[9px] font-black text-blue-600 underline">SETUP</Link>}
                                                </div>
                                                <p className="text-[10px] font-medium text-zinc-400 leading-normal">Create at least one class service or session type.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className={clsx("mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all", hasPricing ? "bg-green-500 border-green-500" : "border-zinc-200")}>
                                                {hasPricing && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={clsx("text-xs font-black uppercase tracking-widest", hasPricing ? "text-zinc-400" : "text-zinc-900")}>Add Pricing</span>
                                                    {!hasPricing && <Link href="/studio/pricing" className="text-[9px] font-black text-blue-600 underline">SETUP</Link>}
                                                </div>
                                                <p className="text-[10px] font-medium text-zinc-400 leading-normal">Set up your packages or monthly membership plans.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className={clsx("mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all", hasInventory ? "bg-green-500 border-green-500" : "border-zinc-200")}>
                                                {hasInventory && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx("text-xs font-black uppercase tracking-widest", hasInventory ? "text-zinc-400" : "text-zinc-900")}>Equipment Inventory</span>
                                                        {!isMarketplaceRelevant && (
                                                            <span className="text-[8px] font-black bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-widest">Optional</span>
                                                        )}
                                                    </div>
                                                    {!hasInventory && <Link href="/studio/management/equipments" className="text-[9px] font-black text-blue-600 underline">SETUP</Link>}
                                                </div>
                                                <p className="text-[10px] font-medium text-zinc-400 leading-normal">Define your equipment stock (Reformers, Mats, etc.)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col gap-4">
                                    <button 
                                        onClick={onClose}
                                        className="w-full py-5 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-zinc-800 active:scale-95 transition-all"
                                    >
                                        I Understand
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}
