'use client'

import React, { useState, useEffect } from 'react'
import { 
    X, ChevronRight, ChevronLeft, Upload, Video, 
    Info, Check, Plus, Trash2, Sparkles, Globe, 
    Home, CreditCard, Package as PackageIcon, Search,
    CheckCircle2, ArrowRight, AlertCircle, Image as ImageIcon,
    ChevronDown
} from 'lucide-react'
import { clsx } from 'clsx'
import { createService, updateService, uploadServiceImage } from '@/app/(dashboard)/studio/services/actions'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import { Loader2 } from 'lucide-react'

interface ImmersiveServiceFormProps {
    isOpen: boolean
    onClose: () => void
    memberships: any[]
    packages: any[]
    categories: any[]
    type?: 'class' | 'appointment'
    service?: any
    initialStep?: number
}

export default function ImmersiveServiceForm({ 
    isOpen, 
    onClose, 
    memberships = [], 
    packages = [],
    categories = [],
    type = 'class',
    service,
    initialStep = 1
}: ImmersiveServiceFormProps) {
    const [step, setStep] = useState(initialStep)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        category_id: '',
        sub_category: '',
        duration_minutes: 60,
        difficulty: 'Open to all',
        conduction_type: 'Onsite', // 'Onsite', 'Online'
        isVisibleInStore: true,
        customCancellation: false,
        media_urls: [] as string[],
        video_url: '',
        prep_instructions: {
            needsItems: false,
            items: [] as string[]
        },
        pricing: {
            isPaid: true,
            isDirectPayment: false,
            directPrice: 0,
            assignedMemberships: [] as string[],
            assignedPackages: [] as string[]
        }
    })

    useEffect(() => {
        if (isOpen && service) {
            setFormData({
                name: service.name || '',
                description: service.description || '',
                category: service.category || '',
                category_id: service.category_id || '',
                sub_category: service.sub_category || '',
                duration_minutes: service.duration_minutes || 60,
                difficulty: service.difficulty || 'Open to all',
                conduction_type: service.conduction_type || 'Onsite',
                isVisibleInStore: service.is_visible_in_store ?? true,
                customCancellation: false,
                media_urls: service.media_urls || [],
                video_url: service.video_url || '',
                prep_instructions: service.prep_instructions || { needsItems: false, items: [] },
                pricing: {
                    isPaid: true,
                    isDirectPayment: false,
                    directPrice: 0,
                    assignedMemberships: memberships.filter(m => m.applicable_service_ids?.includes(service.id)).map(m => m.id),
                    assignedPackages: packages.filter(p => p.applicable_service_ids?.includes(service.id)).map(p => p.id)
                }
            })
            setStep(initialStep)
        } else if (isOpen && !service) {
            // Reset for new class
            setFormData({
                name: '',
                description: '',
                category: '',
                category_id: '',
                sub_category: '',
                duration_minutes: 60,
                difficulty: 'Open to all',
                conduction_type: 'Onsite',
                isVisibleInStore: true,
                customCancellation: false,
                media_urls: [],
                video_url: '',
                prep_instructions: { needsItems: false, items: [] },
                pricing: {
                    isPaid: true,
                    isDirectPayment: false,
                    directPrice: 0,
                    assignedMemberships: [],
                    assignedPackages: []
                }
            })
            setStep(initialStep)
        }
    }, [isOpen, service, initialStep, memberships, packages])

    useEffect(() => {
        // Simple progress calculation
        const totalSteps = 4
        setProgress(Math.round(((step - 1) / totalSteps) * 100))
    }, [step])

    if (!isOpen) return null

    const handleNext = () => setStep(s => Math.min(s + 1, 4))
    const handleBack = () => setStep(s => Math.max(s - 1, 1))

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const res = service?.id 
                ? await updateService(service.id, { ...formData, type })
                : await createService({ ...formData, type })

            if (res.success) {
                onClose()
            } else {
                alert(`Error: ${res.error || `Failed to ${service?.id ? 'update' : 'create'} class`}`)
            }
        } catch (error) {
            console.error(error)
            alert(`Error ${service?.id ? 'updating' : 'creating'} class`)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // Normalize HEIC, resize, and optimize
            const normalizedFile = await normalizeImageFile(file, { maxWidth: 1600, quality: 0.85 })
            
            const uploadData = new FormData()
            uploadData.append('file', normalizedFile)
            
            const res = await uploadServiceImage(uploadData)
            if (res.success && res.url) {
                setFormData(prev => ({
                    ...prev,
                    media_urls: [res.url, ...prev.media_urls.slice(1)]
                }))
            } else {
                alert(res.error || 'Upload failed')
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Error processing image')
        } finally {
            setIsUploading(false)
        }
    }

    const removeImage = () => {
        setFormData(prev => ({
            ...prev,
            media_urls: prev.media_urls.slice(1)
        }))
    }

    const steps = [
        { id: 1, label: 'Details' },
        { id: 2, label: 'Upload image' },
        { id: 3, label: 'What customer should bring' },
        { id: 4, label: 'Rates & Access' }
    ]

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col md:flex-row animate-in fade-in duration-500 overflow-hidden">
            {/* Sidebar Stepper */}
            <div className="w-full md:w-[350px] bg-zinc-50 border-r border-zinc-100 p-12 flex flex-col">
                <div className="mb-12">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-4">Classes & Sessions &gt; {service?.id ? 'Edit session' : 'Add session'}</p>
                    <h2 className="text-3xl font-serif font-black text-zinc-900 tracking-tight">{service?.id ? 'Edit session' : 'Add session'}</h2>
                </div>

                <div className="mb-10">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-[11px] font-black text-[#2D3282] uppercase tracking-widest">{progress}% completed</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#2D3282] transition-all duration-700 ease-out" 
                            style={{ width: `${Math.max(5, progress)}%` }}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {steps.map((s) => (
                        <div 
                            key={s.id}
                            className={clsx(
                                "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
                                step === s.id ? "bg-white shadow-card border border-zinc-100" : "opacity-60"
                            )}
                        >
                            <div className={clsx(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
                                step > s.id ? "bg-forest border-forest text-white" : 
                                step === s.id ? "border-[#2D3282] text-[#2D3282]" : "border-zinc-300 text-zinc-400"
                            )}>
                                {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                            </div>
                            <span className={clsx(
                                "text-[12px] font-bold uppercase tracking-wider",
                                step === s.id ? "text-zinc-900" : "text-zinc-500"
                            )}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-auto">
                    <button 
                        onClick={() => { if(confirm('Exit without saving?')) onClose() }}
                        className="text-[11px] font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest"
                    >
                        Save as draft
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-12 md:px-24 md:py-20">
                    <div className="max-w-2xl mx-auto pb-32">
                {/* Header Actions */}
                <div className="absolute top-8 right-12 flex items-center gap-4">
                    <button className="px-6 py-2 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 rotate-[-45deg]" /> Preview
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                <div className="max-w-2xl mx-auto">
                    {step === 1 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-6">
                                <h1 className="text-4xl font-serif font-black text-zinc-900">Add details of your class</h1>
                                
                                <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    <div>
                                        <p className="text-[13px] font-bold text-zinc-900">Show class listing on Online Store</p>
                                        <p className="text-xs text-zinc-500 mt-1">Allow customers to view this listing</p>
                                    </div>
                                    <div 
                                        onClick={() => setFormData({...formData, isVisibleInStore: !formData.isVisibleInStore})}
                                        className={clsx(
                                            "w-12 h-6 rounded-full p-1 cursor-pointer transition-all",
                                            formData.isVisibleInStore ? "bg-forest" : "bg-zinc-300"
                                        )}
                                    >
                                        <div className={clsx("w-4 h-4 bg-white rounded-full transition-all", formData.isVisibleInStore ? "translate-x-6" : "translate-x-0")} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-10">
                                {/* Name */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Class name</label>
                                        <span className="text-[10px] text-zinc-300 font-bold">{formData.name.length}/100</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Hot Flow"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value.slice(0, 100)})}
                                        className="w-full px-6 py-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] outline-none transition-all text-sm"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Description</label>
                                        <span className="text-[10px] text-zinc-300 font-bold">{formData.description.length}/5000</span>
                                    </div>
                                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                                        <div className="flex items-center gap-4 px-4 py-3 bg-zinc-50 border-b border-zinc-100 italic text-zinc-400">
                                            {/* Rich Text Placeholder UI */}
                                            <span className="text-xs">Aa</span>
                                            <span className="text-xs font-bold">B</span>
                                            <span className="text-xs italic underline">U</span>
                                        </div>
                                        <textarea 
                                            rows={6}
                                            placeholder="Write about the class..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value.slice(0, 5000)})}
                                            className="w-full px-6 py-4 outline-none text-sm placeholder:text-zinc-300"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 text-zinc-300 overflow-hidden">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Class category</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.category_id}
                                                onChange={(e) => {
                                                    const cat = categories.find(c => c.id === e.target.value)
                                                    setFormData({
                                                        ...formData, 
                                                        category_id: e.target.value,
                                                        category: cat?.name || ''
                                                    })
                                                }}
                                                className="w-full px-6 py-4 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 outline-none bg-white appearance-none"
                                            >
                                                <option value="">Select category</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Sub-category (Optional)</label>
                                        <input 
                                            type="text" 
                                            placeholder="Search sub-category" 
                                            value={formData.sub_category}
                                            onChange={(e) => setFormData({...formData, sub_category: e.target.value})}
                                            className="w-full px-6 py-4 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] outline-none" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Class duration</label>
                                        <div className="flex bg-white border border-zinc-200 rounded-xl overflow-hidden">
                                            <input 
                                                type="number" 
                                                value={formData.duration_minutes}
                                                onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                                                className="w-24 px-6 py-4 outline-none text-sm font-bold text-zinc-900 border-r border-zinc-100" 
                                            />
                                            <select className="flex-1 px-4 py-4 bg-zinc-50 text-xs font-bold text-zinc-500 outline-none">
                                                <option>Minutes</option>
                                                <option>Hours</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Level of difficulty (Optional)</label>
                                        <select 
                                            value={formData.difficulty}
                                            onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                                            className="w-full px-6 py-4 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-600 outline-none bg-white"
                                        >
                                            <option>Beginner</option>
                                            <option>Intermediate</option>
                                            <option>Advanced</option>
                                            <option>Open to all</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Class conduction</label>
                                    <div className="flex gap-12">
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className={clsx(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                formData.conduction_type === 'Onsite' ? "border-[#2D3282] bg-[#2D3282]" : "border-zinc-300"
                                            )}>
                                                {formData.conduction_type === 'Onsite' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <input type="radio" className="hidden" onChange={() => setFormData({...formData, conduction_type: 'Onsite'})} />
                                            <span className="text-sm font-bold text-zinc-700">Onsite</span>
                                        </label>
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className={clsx(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                formData.conduction_type === 'Online' ? "border-[#2D3282] bg-[#2D3282]" : "border-zinc-300"
                                            )}>
                                                {formData.conduction_type === 'Online' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <input type="radio" className="hidden" onChange={() => setFormData({...formData, conduction_type: 'Online'})} />
                                            <span className="text-sm font-bold text-zinc-700">Online</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                             <div className="space-y-2">
                                <h1 className="text-4xl font-serif font-black text-zinc-900">Upload media</h1>
                            </div>
                            
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={clsx(
                                    "aspect-video w-full border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-6 group transition-all relative overflow-hidden",
                                    formData.media_urls[0] ? "border-zinc-200" : "border-zinc-100 hover:border-[#2D3282]/30 hover:bg-zinc-50/50 cursor-pointer"
                                )}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*,.heic,.heif" 
                                    onChange={handleFileUpload} 
                                />

                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-4 text-[#2D3282]">
                                        <Loader2 className="w-10 h-10 animate-spin" />
                                        <p className="text-[11px] font-black uppercase tracking-widest">Processing Image...</p>
                                    </div>
                                ) : formData.media_urls[0] ? (
                                    <div className="absolute inset-0 group">
                                        <img src={formData.media_urls[0]} alt="Service" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                                                className="px-6 py-2 bg-white text-zinc-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                                            >
                                                Change
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeImage() }}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-[#2D3282] group-hover:scale-110 transition-transform shadow-sm">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-zinc-900">Drop to upload image</p>
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">File type: JPG, PNG, HEIC or GIF (Max 5MB)</p>
                                        </div>
                                        <button className="px-8 py-3 bg-[#2D3282] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-md">Upload image</button>
                                    </>
                                )}
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Add a video (Optional)</h4>
                                <div className="relative">
                                    <Video className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                                    <input 
                                        type="text" 
                                        placeholder="YouTube URL" 
                                        value={formData.video_url}
                                        onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                                        className="w-full pl-16 pr-6 py-5 border border-zinc-200 rounded-2xl text-sm focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-400 italic">Uploading this video will serve as a cover image of your location/class.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                             <div className="space-y-2">
                                <h1 className="text-4xl font-serif font-black text-zinc-900">Will customers need to bring anything for the class?</h1>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <input type="radio" checked={formData.prep_instructions.needsItems} onChange={() => setFormData({...formData, prep_instructions: {...formData.prep_instructions, needsItems: true}})} className="w-4 h-4 text-[#2D3282]" />
                                        <span className="text-sm font-bold text-zinc-700">Yes</span>
                                    </label>
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <input type="radio" checked={!formData.prep_instructions.needsItems} onChange={() => setFormData({...formData, prep_instructions: {...formData.prep_instructions, needsItems: false}})} className="w-4 h-4 text-[#2D3282]" />
                                        <span className="text-sm font-bold text-zinc-700">No, just need to show up</span>
                                    </label>
                                </div>

                                {formData.prep_instructions.needsItems && (
                                    <div className="space-y-6 pt-8 border-t border-zinc-100 animate-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Items to bring</h4>
                                        <div className="space-y-3">
                                            {formData.prep_instructions.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                                                    <span className="text-sm font-medium text-zinc-700">{item}</span>
                                                    <button onClick={() => {
                                                        const newArr = [...formData.prep_instructions.items];
                                                        newArr.splice(idx, 1);
                                                        setFormData({...formData, prep_instructions: {...formData.prep_instructions, items: newArr}});
                                                    }} className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const item = prompt('What should they bring?')
                                                    if(item) setFormData({...formData, prep_instructions: {...formData.prep_instructions, items: [...formData.prep_instructions.items, item]}});
                                                }}
                                                className="w-full py-5 border-2 border-dashed border-zinc-100 rounded-2xl flex items-center justify-center gap-2 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600 transition-all"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span className="text-[11px] font-black uppercase tracking-widest">Add items</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <h1 className="text-4xl font-serif font-black text-zinc-900">Rates & Access</h1>
                                <p className="text-sm text-zinc-500">How would you like to charge for this session?</p>
                            </div>

                            <div className="space-y-12">
                                {/* Paid vs Free */}
                                <div className="space-y-6">
                                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Select payment options</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div 
                                            onClick={() => setFormData({...formData, pricing: {...formData.pricing, isPaid: true}})}
                                            className={clsx(
                                                "p-6 rounded-2xl border transition-all cursor-pointer flex items-center gap-6",
                                                formData.pricing.isPaid ? "border-[#2D3282] bg-indigo-50/30" : "border-zinc-100 bg-white"
                                            )}
                                        >
                                            <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center", formData.pricing.isPaid ? "border-[#2D3282]" : "border-zinc-300")}>
                                                {formData.pricing.isPaid && <div className="w-2 h-2 bg-[#2D3282] rounded-full" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900">Paid class</p>
                                                <p className="text-xs text-zinc-500 mt-1">Assign pricing options (drop-ins and/or pricing plans) so customers must pay to book this class.</p>
                                            </div>
                                        </div>
                                        <div 
                                             onClick={() => setFormData({...formData, pricing: {...formData.pricing, isPaid: false}})}
                                            className={clsx(
                                                "p-6 rounded-2xl border transition-all cursor-pointer flex items-center gap-6",
                                                !formData.pricing.isPaid ? "border-[#2D3282] bg-indigo-50/30" : "border-zinc-100 bg-white"
                                            )}
                                        >
                                            <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center", !formData.pricing.isPaid ? "border-[#2D3282]" : "border-zinc-300")}>
                                                {!formData.pricing.isPaid && <div className="w-2 h-2 bg-[#2D3282] rounded-full" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-900">Free class</p>
                                                <p className="text-xs text-zinc-500 mt-1">No payment is required, customers can book this class for free.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {formData.pricing.isPaid && (
                                    <div className="space-y-10 animate-in slide-in-from-top-4 duration-500">
                                        {/* Direct Payment */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                                                <div>
                                                    <p className="text-[13px] font-bold text-zinc-900">Set a Direct Rate</p>
                                                    <p className="text-xs text-zinc-500 mt-1">Customers can pay a one-time fee to book this session without a pass.</p>
                                                </div>
                                                <div 
                                                    onClick={() => setFormData({...formData, pricing: {...formData.pricing, isDirectPayment: !formData.pricing.isDirectPayment}})}
                                                    className={clsx(
                                                        "w-12 h-6 rounded-full p-1 cursor-pointer transition-all",
                                                        formData.pricing.isDirectPayment ? "bg-forest" : "bg-zinc-300"
                                                    )}
                                                >
                                                    <div className={clsx("w-4 h-4 bg-white rounded-full transition-all", formData.pricing.isDirectPayment ? "translate-x-6" : "translate-x-0")} />
                                                </div>
                                            </div>

                                            {formData.pricing.isDirectPayment && (
                                                <div className="p-6 bg-white border border-[#2D3282] rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[11px] font-black text-[#2D3282] uppercase tracking-widest mb-3 block">Drop-in Rate (₱)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">₱</span>
                                                        <input 
                                                            type="number" 
                                                            placeholder="0.00"
                                                            value={formData.pricing.directPrice || ''}
                                                            onChange={(e) => setFormData({...formData, pricing: {...formData.pricing, directPrice: parseFloat(e.target.value) || 0}})}
                                                            className="w-full pl-12 pr-6 py-4 bg-zinc-50 border-none rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-[#2D3282]/10"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Membership Assignment */}
                                        <div className="space-y-6">
                                            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Assign memberships plan</h4>
                                            <div className="relative mb-6">
                                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                                <input type="text" placeholder="Search membership plans" className="w-full pl-16 pr-6 py-4 border border-zinc-200 rounded-2xl text-sm" />
                                            </div>
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-premium">
                                                {memberships.map((plan: any) => (
                                                    <label key={plan.id} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-xl hover:border-zinc-300 cursor-pointer group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={clsx(
                                                                "w-5 h-5 border-2 rounded flex items-center justify-center transition-all",
                                                                formData.pricing.assignedMemberships.includes(plan.id) ? "bg-[#2D3282] border-[#2D3282]" : "border-zinc-300"
                                                            )}>
                                                                {formData.pricing.assignedMemberships.includes(plan.id) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-zinc-900">{plan.name}</span>
                                                                <span className="text-[10px] text-zinc-400 font-bold uppercase">₱{plan.price}</span>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600" />
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={formData.pricing.assignedMemberships.includes(plan.id)}
                                                            onChange={(e) => {
                                                                const newArr = e.target.checked 
                                                                    ? [...formData.pricing.assignedMemberships, plan.id]
                                                                    : formData.pricing.assignedMemberships.filter(id => id !== plan.id)
                                                                setFormData({...formData, pricing: {...formData.pricing, assignedMemberships: newArr}})
                                                            }}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Package Assignment */}
                                        <div className="space-y-6">
                                            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Assign packages</h4>
                                            <div className="relative mb-6">
                                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                                <input type="text" placeholder="Search packages" className="w-full pl-16 pr-6 py-4 border border-zinc-200 rounded-2xl text-sm" />
                                            </div>
                                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-premium">
                                                {packages.map((pkg: any) => (
                                                    <label key={pkg.id} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-xl hover:border-zinc-300 cursor-pointer group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={clsx(
                                                                "w-5 h-5 border-2 rounded flex items-center justify-center transition-all",
                                                                formData.pricing.assignedPackages.includes(pkg.id) ? "bg-[#2D3282] border-[#2D3282]" : "border-zinc-300"
                                                            )}>
                                                                {formData.pricing.assignedPackages.includes(pkg.id) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-zinc-900">{pkg.name}</span>
                                                                <span className="text-[10px] text-zinc-400 font-bold uppercase">₱{pkg.price}</span>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600" />
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={formData.pricing.assignedPackages.includes(pkg.id)}
                                                            onChange={(e) => {
                                                                const newArr = e.target.checked 
                                                                    ? [...formData.pricing.assignedPackages, pkg.id]
                                                                    : formData.pricing.assignedPackages.filter(id => id !== pkg.id)
                                                                setFormData({...formData, pricing: {...formData.pricing, assignedPackages: newArr}})
                                                            }}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer Controls - Fixed at the very bottom */}
        <div className="shrink-0 border-t border-zinc-100 bg-white p-6 md:p-8 z-[20]">
            <div className="max-w-2xl mx-auto flex gap-4 md:gap-6">
                {step > 1 && (
                    <button 
                        onClick={handleBack}
                        className="flex-1 py-4 md:py-5 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#2D3282] bg-zinc-50 hover:bg-zinc-100 transition-all border border-zinc-200"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={step === 4 ? handleSubmit : handleNext}
                    disabled={isSubmitting}
                    className="flex-[2] py-4 md:py-5 bg-[#2D3282] text-white rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSubmitting ? 'PROCESSING...' : step === 4 ? (service?.id ? 'Save Changes' : 'Confirm & Create') : 'Next'}
                </button>
            </div>
        </div>
    </div>
</div>
    )
}
