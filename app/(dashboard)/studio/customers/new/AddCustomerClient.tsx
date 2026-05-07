'use client'

import React, { useState } from 'react'
import { 
    ChevronLeft, ChevronDown, 
    Calendar, Globe, Info, 
    ChevronRight, CreditCard,
    FileText, User, HelpCircle,
    ExternalLink
} from 'lucide-react'
import { clsx } from 'clsx'
import { useRouter } from 'next/navigation'
import { addStudioCustomerAction } from '@/app/(dashboard)/studio/customers/actions'
import { useToast } from '@/components/ui/Toast'

interface AddCustomerClientProps {
    pricingGroups: any[]
    studioId: string
}

export default function AddCustomerClient({ pricingGroups, studioId }: AddCustomerClientProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState(1)
    const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('email')
    const [formData, setFormData] = useState({
        email: '',
        mobile: '',
        firstName: '',
        lastName: '',
        dob: '',
        pricingGroup: '',
    })
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

    const toggleSection = (id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const isStep1Valid = loginMethod === 'email' ? formData.email.includes('@') : formData.mobile.length > 5

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Form Card */}
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
                {step === 1 ? (
                    <div className="p-12 space-y-10">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Account information</h2>
                        
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                                    Select customers' preferred login/sign up method
                                </label>
                                <div className="flex bg-zinc-100 p-1 rounded-full w-fit">
                                    <button 
                                        onClick={() => setLoginMethod('email')}
                                        className={clsx(
                                            "px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                                            loginMethod === 'email' ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20" : "text-zinc-400 hover:text-zinc-600"
                                        )}
                                    >
                                        Email Address
                                    </button>
                                    <button 
                                        onClick={() => setLoginMethod('mobile')}
                                        className={clsx(
                                            "px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all",
                                            loginMethod === 'mobile' ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20" : "text-zinc-400 hover:text-zinc-600"
                                        )}
                                    >
                                        Mobile number
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-600 block">
                                    {loginMethod === 'email' ? 'Email address' : 'Mobile number'}
                                </label>
                                {loginMethod === 'email' ? (
                                    <input 
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900 placeholder:text-zinc-200"
                                    />
                                ) : (
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-3 px-4 py-4 bg-white border border-zinc-200 rounded-2xl min-w-[100px] cursor-pointer hover:bg-zinc-50 transition-all">
                                            <div className="w-5 h-3.5 bg-zinc-200 rounded-sm overflow-hidden flex flex-col">
                                                <div className="flex-1 bg-red-600" />
                                                <div className="flex-1 bg-white" />
                                                <div className="flex-1 bg-red-600" />
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <div className="relative flex-1">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-900">+63</span>
                                            <input 
                                                type="tel"
                                                value={formData.mobile}
                                                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                                                className="w-full pl-16 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900 placeholder:text-zinc-200"
                                            />
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                                    This will be use for their login on the online store.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-12 space-y-10">
                         <h2 className="text-xl font-black text-zinc-900 tracking-tight">Account information</h2>

                         <div className="space-y-8">
                            <div className="space-y-2 opacity-60">
                                <label className="text-sm font-bold text-zinc-600 block">Email address</label>
                                <input 
                                    disabled
                                    value={formData.email}
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-400"
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                    Want to ask customer to verify their mobile number?
                                </span>
                                 <button 
                                    onClick={() => {
                                        const cleanMobile = formData.mobile.replace(/\D/g, '')
                                        if (cleanMobile.length >= 10 && (cleanMobile.startsWith('9') || cleanMobile.startsWith('09'))) {
                                            toast('Mobile format is valid for Philippines (Globe/Smart/DITO).', 'success')
                                        } else {
                                            toast('Please enter a valid 10 or 11-digit mobile number.', 'error')
                                        }
                                    }}
                                    className="text-[#2D3282] text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:underline"
                                >
                                    Verify format <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-600 block">Mobile number (Optional)</label>
                                <div className="flex gap-3">
                                    <div className="flex items-center gap-3 px-4 py-4 bg-white border border-zinc-200 rounded-2xl min-w-[100px]">
                                        <div className="w-5 h-3.5 bg-zinc-200 rounded-sm overflow-hidden flex flex-col">
                                            <div className="flex-1 bg-red-600" />
                                            <div className="flex-1 bg-white" />
                                            <div className="flex-1 bg-red-600" />
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                                    </div>
                                    <div className="relative flex-1">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-900">+63</span>
                                        <input 
                                            type="tel"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                                            className="w-full pl-16 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                                    This will be use for their login on the online store.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-600 block">First name</label>
                                    <input 
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-600 block">Last name</label>
                                    <input 
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-600 block">Date of birth (Optional)</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        placeholder="Select date"
                                        value={formData.dob}
                                        onChange={(e) => setFormData({...formData, dob: e.target.value})}
                                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900"
                                    />
                                    <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-zinc-600 block">Pricing group (Optional)</label>
                                <div className="relative">
                                    <select 
                                        value={formData.pricingGroup}
                                        onChange={(e) => setFormData({...formData, pricingGroup: e.target.value})}
                                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 transition-all text-sm font-bold text-zinc-900 appearance-none bg-no-repeat"
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.25rem' }}
                                    >
                                        <option value="">Assign a pricing group</option>
                                        {pricingGroups.map(group => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tight leading-relaxed">
                                    Assign to multiple pricing groups such as staff, VIP and ambassador. Pricing groups have access to exclusive pricing plans created. Leave empty as default for pricing group only.
                                </p>
                            </div>

                            {/* Section Toggles matched to screenshot */}
                            <div className="space-y-6 pt-4">
                                <div 
                                    onClick={() => toggleSection('personal')}
                                    className="flex items-center justify-between py-6 border-t border-zinc-100 cursor-pointer hover:bg-zinc-50/50 transition-all rounded-xl px-2"
                                >
                                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Personal information</h3>
                                    <ChevronDown className={clsx("w-5 h-5 text-zinc-300 transition-transform", expandedSections.has('personal') && "rotate-180")} />
                                </div>
                                {expandedSections.has('personal') && (
                                    <div className="px-4 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 italic text-zinc-400 text-xs font-medium">
                                            Additional personal fields (Emergency contact, health notes, etc.) will be configurable in your studio settings soon.
                                        </div>
                                    </div>
                                )}

                                <div 
                                    onClick={() => toggleSection('waiver')}
                                    className="flex items-center justify-between py-6 border-t border-zinc-100 cursor-pointer hover:bg-zinc-50/50 transition-all rounded-xl px-2"
                                >
                                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Waiver Form</h3>
                                    <ChevronDown className={clsx("w-5 h-5 text-zinc-300 transition-transform", expandedSections.has('waiver') && "rotate-180")} />
                                </div>
                                {expandedSections.has('waiver') && (
                                    <div className="px-4 pb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        <div className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-300">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-zinc-900">Standard Studio Waiver</p>
                                                    <p className="text-[10px] text-zinc-400 font-medium">Customer will be asked to sign this on first login.</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    window.open('/studio/online-store/waiver-form', '_blank');
                                                }}
                                                className="px-4 py-2 bg-white border border-[#2D3282] rounded-full text-[9px] font-black uppercase tracking-widest text-[#2D3282] hover:bg-zinc-50 transition-all flex items-center gap-2"
                                            >
                                                Open Waiver Editor <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                )}
            </div>

            {/* Footer matched to screenshot */}
            <div className="flex items-center justify-center gap-6 pt-10">
                <button 
                    onClick={() => router.back()}
                    className="px-10 py-4 bg-white border border-[#2D3282] text-[#2D3282] rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-[#2D3282]/5 hover:bg-zinc-50 transition-all"
                >
                    Cancel
                </button>
                {step === 2 && (
                    <button 
                        onClick={() => setStep(1)}
                        className="px-10 py-4 bg-white border border-[#2D3282] text-[#2D3282] rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-[#2D3282]/5 hover:bg-zinc-50 transition-all"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={async () => {
                        if (step === 1) setStep(2)
                        else {
                            setIsLoading(true)
                            try {
                                const res = await addStudioCustomerAction({
                                    studioId,
                                    email: formData.email,
                                    firstName: formData.firstName,
                                    lastName: formData.lastName,
                                    mobile: formData.mobile,
                                    dob: formData.dob
                                })
                                if (res.success) {
                                    toast(`${formData.firstName} has been added to your directory.`, 'success')
                                    router.push('/studio/customers')
                                } else {
                                    toast(res.error || 'Failed to add customer', 'error')
                                }
                            } catch (err) {
                                toast('An unexpected error occurred.', 'error')
                            } finally {
                                setIsLoading(false)
                            }
                        }
                    }}
                    disabled={(step === 1 && !isStep1Valid) || isLoading}
                    className={clsx(
                        "px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all min-w-[140px] flex items-center justify-center",
                        ((step === 1 && !isStep1Valid) || isLoading) ? "bg-zinc-200 text-white cursor-not-allowed" : "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20 hover:opacity-90"
                    )}
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        step === 1 ? 'Next' : 'Add'
                    )}
                </button>
            </div>
        </div>
    )
}
