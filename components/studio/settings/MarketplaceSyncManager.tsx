'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Globe, 
    ShieldCheck, 
    FileText, 
    MapPin, 
    CheckCircle2, 
    AlertCircle, 
    Upload, 
    ArrowRight,
    Loader2,
    Calendar,
    ChevronDown,
    Building2,
    Info,
    X,
    Wallet,
    Rocket,
    Package,
    Clock,
    TrendingUp
} from 'lucide-react'
import { submitStudioGlobalDocs, submitBranchMarketplaceDocs, toggleBranchMarketplaceSync, updateBranchMarketplaceHours } from '@/app/(dashboard)/studio/studio-actions'
import { updateEquipmentInventory } from '@/app/(dashboard)/studio/management/actions'
import clsx from 'clsx'

interface Branch {
    id: string
    name: string
    address: string
    marketplace_status: 'inactive' | 'pending' | 'active' | 'rejected'
    is_marketplace_sync_enabled: boolean
    mayors_permit_url: string | null
    mayors_permit_expiry: string | null
    manual_verification_notes: string | null
    inventory: any
    marketplace_available_from: string | null
    marketplace_available_to: string | null
    opening_time: string | null
    closing_time: string | null
}

interface MarketplaceSyncManagerProps {
    studio: any
    branches: Branch[]
}

export default function MarketplaceSyncManager({ studio, branches }: MarketplaceSyncManagerProps) {
    const router = useRouter()
    const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    const selectedBranch = branches.find(b => b.id === selectedBranchId)

    const handleGlobalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)
        
        const formData = new FormData(e.currentTarget)
        const res = await submitStudioGlobalDocs(formData)
        
        if (res.success) {
            setMessage({ type: 'success', text: 'Studio global documents submitted for verification.' })
        } else {
            setMessage({ type: 'error', text: res.error || 'Failed to submit documents.' })
        }
        setIsSubmitting(false)
    }

    const handleBranchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage(null)
        
        const formData = new FormData(e.currentTarget)
        formData.append('outletId', selectedBranchId)
        formData.append('studioId', studio.id)
        
        const res = await submitBranchMarketplaceDocs(formData)
        
        if (res.success) {
            setMessage({ type: 'success', text: `Documents for ${selectedBranch?.name} submitted.` })
        } else {
            setMessage({ type: 'error', text: res.error || 'Failed to submit documents.' })
        }
        setIsSubmitting(false)
    }

    const handleToggleSync = async (enabled: boolean) => {
        if (!selectedBranch || selectedBranch.marketplace_status !== 'active') return
        
        const res = await toggleBranchMarketplaceSync(selectedBranchId, enabled)
        if (res.success) {
            router.refresh()
        }
    }

    const [availableFrom, setAvailableFrom] = useState<string>('')
    const [availableTo, setAvailableTo] = useState<string>('')

    useEffect(() => {
        if (selectedBranch) {
            setAvailableFrom(selectedBranch.marketplace_available_from?.slice(0, 5) || selectedBranch.opening_time?.slice(0, 5) || '06:00')
            setAvailableTo(selectedBranch.marketplace_available_to?.slice(0, 5) || selectedBranch.closing_time?.slice(0, 5) || '22:00')
        }
    }, [selectedBranch])

    const handleSaveHours = async () => {
        if (!selectedBranchId) return
        setIsSubmitting(true)
        const res = await updateBranchMarketplaceHours(selectedBranchId, availableFrom, availableTo)
        if (res.success) {
            setMessage({ type: 'success', text: 'Marketplace rental hours updated.' })
            router.refresh()
        } else {
            setMessage({ type: 'error', text: res.error || 'Failed to update hours.' })
        }
        setIsSubmitting(false)
    }

    const [branchInventory, setBranchInventory] = useState<Record<string, any>>({})

    useEffect(() => {
        if (selectedBranch?.inventory) {
            setBranchInventory(JSON.parse(JSON.stringify(selectedBranch.inventory)))
        }
    }, [selectedBranch])

    const handleUpdateItem = (key: string, field: string, value: any) => {
        setBranchInventory(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }))
    }

    const handleSaveInventorySettings = async () => {
        if (!selectedBranchId) return
        setIsSubmitting(true)
        const res = await updateEquipmentInventory(studio.id, branchInventory, selectedBranchId)
        if (res.success) {
            setMessage({ type: 'success', text: 'Marketplace listings updated successfully.' })
            router.refresh()
        } else {
            setMessage({ type: 'error', text: res.error || 'Failed to update listings.' })
        }
        setIsSubmitting(false)
    }

    // Checklist logic
    const hasInventory = selectedBranch && Object.keys(selectedBranch.inventory || {}).length > 0
    const hasAddress = selectedBranch && !!selectedBranch.address
    const isGlobalActive = studio.marketplace_eligibility === 'active'
    const isBranchActive = selectedBranch?.marketplace_status === 'active'

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* 1. Global Studio Status */}
            <div className="atelier-card p-0 overflow-hidden bg-white border-stone-200 shadow-xl">
                <div className="p-8 sm:p-10 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                                <Rocket className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Revenue Channel</span>
                        </div>
                        <h2 className="text-3xl font-serif text-zinc-900 tracking-tight">Marketplace Distribution</h2>
                        <p className="text-sm text-zinc-500 max-w-xl">
                            {studio.bir_url ? (
                                <span className="inline-flex items-center gap-2 text-emerald-600 font-bold px-3 py-1 bg-emerald-50 rounded-full text-[10px] uppercase tracking-widest border border-emerald-100">
                                    <ShieldCheck className="w-3 h-3" /> Documents synced from registration
                                </span>
                            ) : (
                                "Verify your identity to unlock discovery features and marketplace payouts."
                            )}
                        </p>
                        <div className="mt-6 space-y-4 max-w-xl">
                            <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-[2rem]">
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    <span className="text-zinc-900 font-black uppercase tracking-widest block mb-1.5 flex items-center gap-2">
                                        <Wallet className="w-3.5 h-3.5 text-indigo-500" /> Wallet & Payout Logic
                                    </span>
                                    Earnings from **Marketplace** bookings are held in your StudioVault Wallet for withdrawal. Payments from your **Private CMS** site go directly to your own Xendit/Bank account.
                                </p>
                            </div>
                            
                            <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-[2rem]">
                                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                    <span className="text-amber-900 font-black uppercase tracking-widest block mb-1.5 flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 text-amber-600" /> Equipment Scheduling
                                    </span>
                                    To list sessions on the marketplace, you must use **Equipment-based Scheduling**. This ensures users can search by equipment type (e.g. Reformer) and prevents overbooking of your inventory.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className={clsx(
                        "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border transition-all duration-500",
                        studio.marketplace_eligibility === 'active' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                        studio.marketplace_eligibility === 'pending' ? "bg-amber-50 border-amber-100 text-amber-700" :
                        "bg-zinc-50 border-zinc-100 text-zinc-400"
                    )}>
                        <div className={clsx("w-2 h-2 rounded-full animate-pulse", 
                            studio.marketplace_eligibility === 'active' ? "bg-emerald-500" :
                            studio.marketplace_eligibility === 'pending' ? "bg-amber-500" : "bg-zinc-200"
                        )} />
                        {studio.marketplace_eligibility === 'active' ? 'Verification Approved' : 
                         studio.marketplace_eligibility === 'pending' ? 'Verification Pending' : 'Action Required'}
                    </div>
                </div>

                {studio.marketplace_eligibility === 'active' ? (
                    <div className="p-8 sm:p-10 bg-emerald-50/30 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Status: Fully Verified</p>
                            <h3 className="text-xl font-serif text-zinc-900">Your studio is globally cleared for Marketplace distribution.</h3>
                            <p className="text-sm text-zinc-500 mt-1">You can now proceed to enable syncing for individual branches below.</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleGlobalSubmit} className="p-8 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <input type="hidden" name="studioId" value={studio.id} />
                        
                        {/* BIR */}
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 mb-2 block">BIR Certificate of Registration</span>
                                <div className="relative group overflow-hidden rounded-2xl bg-zinc-50 border border-zinc-100 p-5 transition-all hover:bg-zinc-100 hover:border-zinc-200">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs font-bold text-zinc-600 transition-colors group-hover:text-zinc-900 truncate">
                                                {studio.bir_url ? 'bir_certificate.pdf' : 'No file uploaded'}
                                            </p>
                                            <p className="text-[9px] font-black uppercase text-zinc-300 tracking-tighter mt-1 italic">Click to Replace</p>
                                        </div>
                                        <input type="file" name="birFile" className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Calendar className="w-4 h-4" /></span>
                                <input 
                                    type="date" 
                                    name="birExpiry" 
                                    defaultValue={studio.bir_expiry}
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="Expiry Date"
                                />
                            </div>
                        </div>

                        {/* Gov ID */}
                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 mb-2 block">Owner Government ID</span>
                                <div className="relative group overflow-hidden rounded-2xl bg-zinc-50 border border-zinc-100 p-5 transition-all hover:bg-zinc-100 hover:border-zinc-200">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs font-bold text-zinc-600 transition-colors group-hover:text-zinc-900 truncate">
                                                {studio.gov_id_url ? 'gov_id_scan.png' : 'No file uploaded'}
                                            </p>
                                            <p className="text-[9px] font-black uppercase text-zinc-300 tracking-tighter mt-1 italic">Passport / LTO / PRC</p>
                                        </div>
                                        <input type="file" name="govIdFile" className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300"><Calendar className="w-4 h-4" /></span>
                                <input 
                                    type="date" 
                                    name="govIdExpiry" 
                                    defaultValue={studio.gov_id_expiry}
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex flex-col justify-end">
                            <button 
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Submit Studio Docs
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* 2. Branch Specific Verification */}
            <div className="atelier-card bg-stone-50 border-stone-200">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar Branch List */}
                    <div className="lg:w-1/3 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em]">Step 2: Location Verification</h3>
                            <h2 className="text-2xl font-serif text-burgundy">Branch Management</h2>
                        </div>
                        
                        <div className="space-y-3">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => setSelectedBranchId(branch.id)}
                                    className={clsx(
                                        "w-full p-6 rounded-[2rem] border transition-all text-left group overflow-hidden relative",
                                        selectedBranchId === branch.id 
                                            ? "bg-white border-burgundy/20 shadow-xl shadow-burgundy/5 translate-x-1" 
                                            : "bg-white/50 border-stone-200 hover:bg-white hover:border-stone-300"
                                    )}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                            selectedBranchId === branch.id ? "bg-burgundy text-white" : "bg-stone-100 text-stone-400 group-hover:bg-stone-200"
                                        )}>
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-burgundy uppercase truncate">{branch.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className={clsx("w-1.5 h-1.5 rounded-full",
                                                    branch.marketplace_status === 'active' ? "bg-emerald-500" :
                                                    branch.marketplace_status === 'pending' ? "bg-amber-500" : "bg-stone-300"
                                                )} />
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                                    {branch.marketplace_status === 'active' ? 'Verified & Live' :
                                                     branch.marketplace_status === 'pending' ? 'Verification Pending' : 'Sync Inactive'}
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight className={clsx("w-4 h-4 transition-all opacity-0 group-hover:opacity-100", 
                                            selectedBranchId === branch.id ? "opacity-100 translate-x-0" : "-translate-x-2"
                                        )} />
                                    </div>
                                    {selectedBranchId === branch.id && (
                                        <div className="absolute inset-y-0 left-0 w-1 bg-burgundy rounded-full shadow-[2px_0_10px_rgba(45,50,130,0.5)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Branch Panel */}
                    <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {selectedBranch ? (
                            <>
                                {/* Checklist */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Identity', met: hasAddress, icon: MapPin },
                                        { label: 'Gallery', met: true, icon: Globe }, // Simplified
                                        { label: 'Inventory', met: hasInventory, icon: Building2 },
                                        { label: 'Studio Verified', met: isGlobalActive, icon: ShieldCheck },
                                    ].map((item, idx) => (
                                        <div key={idx} className={clsx(
                                            "p-4 rounded-2xl border flex items-center gap-3 transition-all",
                                            item.met ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-white border-stone-200 text-stone-400 grayscale"
                                        )}>
                                            <div className={clsx("p-2 rounded-lg", item.met ? "bg-white/50" : "bg-stone-50")}>
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50">{item.label}</p>
                                                <div className="flex items-center gap-1.5">
                                                    {item.met ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                                                    <span className="text-[9px] font-bold uppercase tracking-tighter">{item.met ? 'Complete' : 'Required'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Inventory Sync Status */}
                                <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                            <Package className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-serif text-zinc-900">Inventory Sync Status</h4>
                                            <p className="text-xs text-zinc-500 max-w-sm">
                                                {hasInventory 
                                                    ? `Marketplace is currently syncing ${Object.keys(selectedBranch.inventory || {}).length} equipment types for this branch.`
                                                    : "No equipment found. You must define your inventory before this branch can be listed."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => window.location.href = `/studio/management/equipments?outletId=${selectedBranchId}`}
                                        className="px-6 py-3 bg-white text-zinc-900 border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2 whitespace-nowrap shadow-sm"
                                    >
                                        <Package className="w-4 h-4" />
                                        Manage Inventory
                                    </button>
                                </div>

                                {/* Marketplace Rental Hours */}
                                <div className="bg-white border border-stone-100 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-serif text-zinc-900">Marketplace Rental Window</h4>
                                                <p className="text-xs text-zinc-500">Set the specific hours this branch accepts marketplace equipment rentals.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleSaveHours}
                                            disabled={isSubmitting}
                                            className="px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-burgundy transition-all disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Hours"}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Daily Opening Time</label>
                                            <input
                                                type="time"
                                                value={availableFrom}
                                                onChange={(e) => setAvailableFrom(e.target.value)}
                                                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-200 transition-all font-medium text-[13px]"
                                            />
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1 italic">Defaults to branch opening hours</p>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Daily Closing Time</label>
                                            <input
                                                type="time"
                                                value={availableTo}
                                                onChange={(e) => setAvailableTo(e.target.value)}
                                                className="w-full px-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-200 transition-all font-medium text-[13px]"
                                            />
                                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1 italic">Defaults to branch closing hours</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment Listing Manager */}
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between border-b border-stone-100 pb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-serif text-zinc-900">Equipment Listing Manager</h4>
                                                <p className="text-xs text-zinc-500">Configure which items are available for rent and set their rates.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleSaveInventorySettings}
                                            disabled={isSubmitting}
                                            className="px-8 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-zinc-900/10"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                            Save All Listings
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {Object.entries(branchInventory).map(([key, item]: [string, any]) => (
                                            <div key={key} className="bg-white border border-stone-100 rounded-[2.5rem] p-10 space-y-8 shadow-sm hover:border-indigo-100 transition-all group relative overflow-hidden">
                                                {/* Status Indicator */}
                                                {(item.rental_cap > 0 && item.rental_price > 0) && (
                                                    <div className="absolute top-0 right-0 p-6">
                                                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                                            Live
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-lg font-black text-zinc-900 uppercase tracking-tight leading-none mb-1.5">{key}</h5>
                                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{item.total} Units in Branch</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {/* Price Input */}
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Hourly Rate (₱)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-500">₱</span>
                                                            <input 
                                                                type="number"
                                                                value={item.rental_price || 0}
                                                                onChange={(e) => handleUpdateItem(key, 'rental_price', parseInt(e.target.value))}
                                                                className="w-full pl-12 pr-6 py-5 bg-stone-50 border border-stone-100 rounded-2xl text-lg font-black text-zinc-900 focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Cap Input */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between ml-1">
                                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Rental Cap</label>
                                                            <span className="text-[10px] font-bold text-indigo-600 uppercase">Max {item.total}</span>
                                                        </div>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            max={item.total}
                                                            value={item.rental_cap || 0}
                                                            onChange={(e) => handleUpdateItem(key, 'rental_cap', parseInt(e.target.value))}
                                                            className="w-full px-8 py-5 bg-stone-50 border border-stone-100 rounded-2xl text-lg font-black text-zinc-900 focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-8 border-t border-stone-50 space-y-4">
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Specific Window</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input 
                                                            type="time"
                                                            value={(item.available_from || availableFrom || '06:00').slice(0, 5)}
                                                            onChange={(e) => handleUpdateItem(key, 'available_from', e.target.value)}
                                                            className="w-full px-4 py-4 bg-stone-50 border border-stone-100 rounded-xl text-[12px] font-bold text-zinc-600 focus:bg-white transition-all text-center"
                                                        />
                                                        <input 
                                                            type="time"
                                                            value={(item.available_to || availableTo || '22:00').slice(0, 5)}
                                                            onChange={(e) => handleUpdateItem(key, 'available_to', e.target.value)}
                                                            className="w-full px-4 py-4 bg-stone-50 border border-stone-100 rounded-xl text-[12px] font-bold text-zinc-600 focus:bg-white transition-all text-center"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-zinc-400 font-medium italic text-center px-4">
                                                        Overrides branch hours if set.
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Doc Upload Section */}
                                {isBranchActive ? (
                                    <div className="bg-emerald-50/30 rounded-[2.5rem] border border-emerald-100 p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-600 shadow-inner">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Location Verified</p>
                                            <h3 className="text-xl font-serif text-zinc-900">This branch is approved for Marketplace listings.</h3>
                                            <p className="text-sm text-zinc-500 mt-1">You can manage equipment sync and pricing using the toggle below.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-[2.5rem] border border-stone-100 p-10 space-y-8 relative overflow-hidden shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                                    <ShieldCheck className="w-3 h-3" /> Branch-Specific Compliance
                                                </h3>
                                                <h4 className="text-xl font-serif text-burgundy">Documents for {selectedBranch.name}</h4>
                                            </div>
                                            {selectedBranch.marketplace_status === 'rejected' && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4" /> Resubmission Required
                                                    </div>
                                                    <p className="text-[9px] font-medium text-rose-500 max-w-[200px] text-right italic underline underline-offset-4 decoration-rose-300">
                                                        Reason: {selectedBranch.manual_verification_notes || 'Invalid document format.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <form onSubmit={handleBranchSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <label className="block space-y-2">
                                                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Mayor's Permit (Local)</span>
                                                    <div className="relative group rounded-2xl bg-stone-50 border border-stone-200 p-5 transition-all hover:bg-white hover:border-burgundy/20 hover:shadow-xl hover:shadow-burgundy/5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-stone-100 rounded-xl text-stone-400 group-hover:bg-burgundy/10 group-hover:text-burgundy transition-all">
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 truncate">
                                                                <p className="text-xs font-bold text-stone-600 truncate">{selectedBranch.mayors_permit_url ? 'mayors_permit.jpg' : 'No file selected'}</p>
                                                                <p className="text-[9px] font-black uppercase text-stone-300 tracking-tighter mt-1 italic">Issued by Local LGU</p>
                                                            </div>
                                                            <input type="file" name="mayorsPermitFile" className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"><Calendar className="w-4 h-4" /></span>
                                                    <input 
                                                        type="date" 
                                                        name="mayorsPermitExpiry" 
                                                        defaultValue={selectedBranch.mayors_permit_expiry || ''}
                                                        className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-none focus:ring-4 focus:ring-burgundy/5"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <label className="block space-y-2">
                                                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Liability Insurance (Optional)</span>
                                                    <div className="relative group rounded-2xl bg-stone-50 border border-stone-200 p-5 transition-all hover:bg-white hover:border-burgundy/20 hover:shadow-xl hover:shadow-burgundy/5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-stone-100 rounded-xl text-stone-400 group-hover:bg-burgundy/10 group-hover:text-burgundy transition-all">
                                                                <ShieldCheck className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 truncate">
                                                                <p className="text-xs font-bold text-stone-600 truncate">{selectedBranch.insurance_url ? 'insurance_policy.pdf' : 'Add Coverage'}</p>
                                                                <p className="text-[9px] font-black uppercase text-stone-300 tracking-tighter mt-1 italic">Protects your space</p>
                                                            </div>
                                                            <input type="file" name="insuranceFile" className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300"><Calendar className="w-4 h-4" /></span>
                                                    <input 
                                                        type="date" 
                                                        name="insuranceExpiry" 
                                                        className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 focus:outline-none focus:ring-4 focus:ring-burgundy/5"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2">
                                                <button 
                                                    disabled={isSubmitting}
                                                    className="w-full py-5 bg-stone-900 hover:bg-burgundy text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl hover:shadow-burgundy/20 flex items-center justify-center gap-3 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-white/50" /> : <Upload className="w-4 h-4" />}
                                                    Submit Branch Verification
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Sync Toggle */}
                                <div className={clsx(
                                    "p-8 sm:p-12 rounded-[3.5rem] border transition-all duration-700",
                                    isBranchActive && isGlobalActive 
                                        ? "bg-emerald-50 border-emerald-500/10 shadow-lg shadow-emerald-500/5 translate-y-0" 
                                        : "bg-white border-stone-100 opacity-60 translate-y-0"
                                )}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10">
                                        <div className="flex gap-6 max-w-xl">
                                            <div className={clsx(
                                                "w-16 h-16 rounded-[2rem] flex items-center justify-center flex-shrink-0 transition-all shadow-lg",
                                                isBranchActive && isGlobalActive ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-stone-100 text-stone-300"
                                            )}>
                                                <Globe className={clsx("w-8 h-8", isBranchActive && isGlobalActive && "animate-pulse")} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-serif text-burgundy">Automated Marketplace Sync</h3>
                                                <p className="text-xs text-stone-500 leading-relaxed font-medium">
                                                    When active, we automatically mirror your branch inventory and data to the StudioVault Marketplace. We'll only list equipment that isn't already booked for your internal CMS classes.
                                                </p>
                                                
                                                {!isBranchActive && (
                                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 rounded-full border border-amber-100 text-amber-600">
                                                        <Info className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Locked: Approval Pending</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative inline-flex items-center group">
                                            <div className={clsx(
                                                "absolute -inset-4 bg-emerald-500/20 rounded-full blur-xl opacity-0 transition-opacity",
                                                selectedBranch.is_marketplace_sync_enabled && "opacity-100"
                                            )} />
                                            <label className={clsx(
                                                "relative inline-flex items-center flex-shrink-0 transition-all",
                                                (!isBranchActive || !isGlobalActive) ? "cursor-not-allowed opacity-40 grayscale" : "cursor-pointer"
                                            )}>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={selectedBranch.is_marketplace_sync_enabled}
                                                    onChange={(e) => handleToggleSync(e.target.checked)}
                                                    disabled={!isBranchActive || !isGlobalActive}
                                                />
                                                <div className="w-20 h-10 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[6px] after:bg-white after:border-stone-200 after:border after:rounded-full after:h-[28px] after:w-[38px] after:transition-all peer-checked:bg-emerald-500 transition-all duration-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-6">
                                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-stone-200">
                                    <Building2 className="w-10 h-10" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-stone-400 uppercase tracking-widest">No Branches Selected</p>
                                    <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest">Choose a location from the list to manage its sync status.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={clsx(
                    "fixed bottom-10 right-10 z-[100] px-8 py-5 rounded-[2rem] border shadow-2xl animate-in slide-in-from-right-10 duration-500 flex items-center gap-4 backdrop-blur-md",
                    message.type === 'success' ? "bg-emerald-500/90 text-white border-emerald-400" : "bg-rose-500/90 text-white border-rose-400"
                )}>
                    {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{message.type.toUpperCase()}</p>
                        <p className="text-sm font-bold tracking-tight text-white">{message.text}</p>
                    </div>
                    <button onClick={() => setMessage(null)} className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    )
}
