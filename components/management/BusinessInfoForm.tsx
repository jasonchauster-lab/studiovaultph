'use client'

import { useState, useRef, useEffect } from 'react'
import { updateBusinessInfo } from '@/app/(dashboard)/studio/management/actions'
import { Loader2, Save, Globe, Mail, Phone, MessageSquare, MapPin, Building2, Briefcase, ChevronDown, Check, AlertCircle, ExternalLink, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import { maskGovernmentId } from '@/lib/utils/masking'

interface BusinessInfoFormProps {
    studio: any
    outlets: any[]
    initialSelectedOutletId?: string
}

export default function BusinessInfoForm({ studio, outlets, initialSelectedOutletId }: BusinessInfoFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [selectedOutletId, setSelectedOutletId] = useState(initialSelectedOutletId || outlets[0]?.id)
    const [isDirty, setIsDirty] = useState(false)
    const [isSelectorOpen, setIsSelectorOpen] = useState(false)
    const [pendingOutletId, setPendingOutletId] = useState<string | null>(null)
    const [showConfirmSwitch, setShowConfirmSwitch] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const selectedOutlet = outlets.find(o => o.id === selectedOutletId) || outlets[0]

    // Handle clicks outside the dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsSelectorOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        // Ensure showWhatsappButton is correctly passed as string 'true'/'false'
        const whatsappToggle = formData.get('showWhatsappButtonRaw') === 'on'
        formData.set('showWhatsappButton', whatsappToggle ? 'true' : 'false')
        
        // Pass the target outlet ID
        if (selectedOutletId) {
            formData.set('outletId', selectedOutletId)
        }

        try {
            const result = await updateBusinessInfo(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setIsDirty(false) // Clear dirty state on success
                setTimeout(() => setSuccess(false), 3000)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSwitchBranch = (outletId: string) => {
        if (outletId === selectedOutletId) return

        if (isDirty) {
            setPendingOutletId(outletId)
            setShowConfirmSwitch(true)
        } else {
            setSelectedOutletId(outletId)
            setIsSelectorOpen(false)
        }
    }

    const confirmSwitch = () => {
        if (pendingOutletId) {
            setSelectedOutletId(pendingOutletId)
            setIsDirty(false)
            setPendingOutletId(null)
            setShowConfirmSwitch(false)
            setIsSelectorOpen(false)
        }
    }

    if (!selectedOutlet && outlets.length > 0) {
       return <div className="p-12 text-zinc-400 font-medium tracking-tight">Loading location data...</div>
    }

    return (
        <form 
            action={handleSubmit} 
            className="space-y-12 pb-20 relative"
            onInput={() => setIsDirty(true)}
        >
            <input type="hidden" name="studioId" value={studio.id} />
            <input type="hidden" name="outletId" value={selectedOutletId} />

            {/* Unsaved Changes Confirmation Modal */}
            {showConfirmSwitch && (
                <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Unsaved Changes</h3>
                            <p className="text-zinc-500 font-medium">You have unsaved changes in this branch. Switching now will discard your progress.</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowConfirmSwitch(false)}
                                className="flex-1 px-6 py-4 rounded-2xl bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all font-atelier whitespace-nowrap"
                            >
                                Keep Editing
                            </button>
                            <button
                                type="button"
                                onClick={confirmSwitch}
                                className="flex-1 px-6 py-4 rounded-2xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all font-atelier whitespace-nowrap"
                            >
                                Discard & Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier">Business information</h1>
                    <p className="text-sm text-zinc-500 font-medium tracking-tight">Manage your branding and location-specific contact details.</p>
                </div>

                {/* Hybrid Outlet Selector */}
                {outlets.length > 1 && (
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-4">
                            {outlets.length <= 3 ? (
                                /* Pills for few branches */
                                <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-100/50 rounded-2xl border border-zinc-100">
                                    {outlets.map((outlet) => (
                                        <button
                                            key={outlet.id}
                                            type="button"
                                            onClick={() => handleSwitchBranch(outlet.id)}
                                            className={clsx(
                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                selectedOutletId === outlet.id 
                                                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200" 
                                                    : "text-zinc-400 hover:text-zinc-600"
                                            )}
                                        >
                                            {outlet.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                /* Dropdown for many branches */
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                        className="flex items-center gap-4 px-6 py-3 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md hover:border-zinc-300 transition-all group min-w-[200px]"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Active Branch</p>
                                            <p className="text-[13px] font-black text-zinc-900 tracking-tight leading-none truncate max-w-[120px]">
                                                {selectedOutlet?.name}
                                            </p>
                                        </div>
                                        <ChevronDown className={clsx(
                                            "w-4 h-4 text-zinc-400 transition-transform duration-300",
                                            isSelectorOpen && "rotate-180"
                                        )} />
                                    </button>
    
                                    {isSelectorOpen && (
                                        <div className="absolute top-full right-0 mt-3 w-64 bg-white border border-zinc-100 rounded-[2.5rem] shadow-2xl p-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
                                            <div className="max-h-[300px] overflow-y-auto scrollbar-hide space-y-1">
                                                {outlets.map((outlet) => (
                                                    <button
                                                        key={outlet.id}
                                                        type="button"
                                                        onClick={() => handleSwitchBranch(outlet.id)}
                                                        className={clsx(
                                                            "w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 group/item",
                                                            selectedOutletId === outlet.id ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-600"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <MapPin className={clsx("w-4 h-4", selectedOutletId === outlet.id ? "text-white/60" : "text-zinc-400")} />
                                                            <p className="text-sm font-black tracking-tight">{outlet.name}</p>
                                                        </div>
                                                        {selectedOutletId === outlet.id && <Check className="w-4 h-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {isDirty && (
                                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 text-[9px] font-black uppercase tracking-widest animate-in fade-in fill-mode-both">
                                    <AlertCircle className="w-3 h-3" />
                                    Unsaved Changes
                                </div>
                            )}
                        </div>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mr-2">Switching branches will update the information for the selected location only</p>
                    </div>
                )}
            </div>

            {/* General Information Section */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm space-y-10 group/section">
                <div className="flex items-center gap-4 text-zinc-900">
                    <Building2 className="w-5 h-5 text-zinc-400 group-hover/section:text-zinc-900 transition-colors" />
                    <h2 className="text-xl font-black tracking-tightest uppercase text-[13px] tracking-[0.2em] font-atelier">General Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Studio Name (Brand)</label>
                        <input
                            type="text"
                            name="studioName"
                            defaultValue={studio.name}
                            required
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Your studio's public brand name used throughout the app and website</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Branch Name</label>
                        <input
                            key={`name-${selectedOutletId}`}
                            type="text"
                            name="name"
                            defaultValue={selectedOutlet?.name}
                            required
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">A unique identifier for this specific location (e.g., 'Downtown Branch')</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Business Industry</label>
                        <input
                            type="text"
                            name="industry"
                            defaultValue={studio.business_industry || 'Fitness'}
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px] placeholder:opacity-50"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The type of service you provide. This helps us tailor your experience</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Company Registered Name (Optional)</label>
                        <input
                            type="text"
                            name="registeredName"
                            defaultValue={studio.company_registered_name}
                            placeholder="e.g. Club Pilates Philippines Inc."
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px] placeholder:opacity-50"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The legal entity name of your business (used for official documents)</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Company Registration No. (Optional)</label>
                        <div className="relative group/pii">
                            <input
                                type="text"
                                name="registrationNo"
                                defaultValue={studio.company_registration_no}
                                placeholder="e.g. 0294850928"
                                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px] placeholder:opacity-50"
                            />
                            {studio.company_registration_no && (
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none group-focus-within/pii:hidden">
                                    <span className="text-[13px] font-medium text-zinc-400 bg-zinc-50 px-2">
                                        {maskGovernmentId(studio.company_registration_no)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Your business's official registration or tax identification number</p>
                    </div>
                </div>
            </div>

            {/* Contact Section */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm space-y-10 group/section">
                <div className="flex items-center gap-4 text-zinc-900">
                    <Mail className="w-5 h-5 text-zinc-400 group-hover/section:text-zinc-900 transition-colors" />
                    <h2 className="text-xl font-black tracking-tightest uppercase text-[13px] tracking-[0.2em] font-atelier">Branch Contact Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Branch Contact Email</label>
                        <input
                            key={`email-${selectedOutletId}`}
                            type="email"
                            name="contactEmail"
                            defaultValue={selectedOutlet?.email}
                            placeholder="hello@studiovault.com"
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The email address where customers can reach this specific branch</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Branch Contact Number</label>
                        <input
                            key={`phone-${selectedOutletId}`}
                            type="tel"
                            name="contactNumber"
                            defaultValue={selectedOutlet?.phone}
                            placeholder="+63 900 000 0000"
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The primary phone number for this location, visible on your website</p>
                    </div>
                    <div className="space-y-4 md:col-span-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-zinc-50 border border-zinc-100 rounded-3xl group/wa">
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-zinc-900 tracking-tight uppercase tracking-widest text-[11px]">WhatsApp & Floating Widgets</h3>
                                <p className="text-xs text-zinc-500 font-medium">Manage your WhatsApp visibility and "Back to Top" button in the Website Builder.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => window.location.href = `/studio/website?outletId=${selectedOutletId}`}
                                className="flex items-center gap-3 px-6 py-3 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-900 hover:border-zinc-900 hover:shadow-sm transition-all shadow-tight active:scale-95"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open Website Builder
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Address Section */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm space-y-10 group/section">
                <div className="flex items-center gap-4 text-zinc-900">
                    <MapPin className="w-5 h-5 text-zinc-400 group-hover/section:text-zinc-900 transition-colors" />
                    <h2 className="text-xl font-black tracking-tightest uppercase text-[13px] tracking-[0.2em] font-atelier">Branch Location</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Country</label>
                        <select
                            key={`country-${selectedOutletId}`}
                            name="country"
                            defaultValue={selectedOutlet?.country || 'Philippines'}
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px] appearance-none"
                        >
                            <option value="Philippines">Philippines</option>
                            <option value="Singapore">Singapore</option>
                            <option value="Indonesia">Indonesia</option>
                        </select>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The country where this branch is physically located</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Full Branch Address</label>
                        <textarea
                            key={`address-${selectedOutletId}`}
                            name="address"
                            defaultValue={selectedOutlet?.address}
                            rows={3}
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px] resize-none"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The complete physical address. This will be displayed on your store's map and contact page</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Branch Timezone</label>
                        <select
                            key={`timezone-${selectedOutletId}`}
                            name="timezone"
                            defaultValue={selectedOutlet?.timezone || 'Asia/Manila'}
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px] appearance-none"
                        >
                            <option value="Asia/Manila">Manila (GMT+8)</option>
                            <option value="Asia/Singapore">Singapore (GMT+8)</option>
                            <option value="Asia/Hong_Kong">Hong Kong (GMT+8)</option>
                            <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
                            <option value="Asia/Jakarta">Jakarta (GMT+7)</option>
                            <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
                            <option value="Australia/Sydney">Sydney (GMT+11)</option>
                            <option value="Europe/London">London (GMT+0)</option>
                            <option value="America/New_York">New York (GMT-5)</option>
                            <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                        </select>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Determines the timing of your classes and bookings in the local calendar</p>
                    </div>
                </div>
            </div>

            {/* Operating Hours Section */}
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-10 shadow-sm space-y-10 group/section">
                <div className="flex items-center gap-4 text-zinc-900">
                    <Clock className="w-5 h-5 text-zinc-400 group-hover/section:text-zinc-900 transition-colors" />
                    <h2 className="text-xl font-black tracking-tightest uppercase text-[13px] tracking-[0.2em] font-atelier">Operating Hours</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Daily Opening Time</label>
                        <input
                            key={`opening-${selectedOutletId}`}
                            type="time"
                            name="openingTime"
                            defaultValue={selectedOutlet?.opening_time?.slice(0, 5) || studio.opening_time?.slice(0, 5) || "06:00"}
                            required
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The earliest time your studio opens. This sets the start of your daily schedule</p>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Daily Closing Time</label>
                        <input
                            key={`closing-${selectedOutletId}`}
                            type="time"
                            name="closingTime"
                            defaultValue={selectedOutlet?.closing_time?.slice(0, 5) || studio.closing_time?.slice(0, 5) || "22:00"}
                            required
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all font-medium text-[13px]"
                        />
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">The latest time your studio closes. This sets the end of your daily schedule</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between gap-6 pt-10 border-t border-zinc-100">
                <div className="flex-1">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[11px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-forest/5 border border-forest/10 rounded-2xl text-forest text-[11px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                            Branch information updated successfully!
                        </div>
                    )}
                </div>
                <button
                    disabled={isLoading}
                    className="flex items-center gap-3 px-12 py-5 bg-zinc-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save {selectedOutlet ? 'Branch' : 'Studio'} Changes
                </button>
            </div>
        </form>
    )
}
