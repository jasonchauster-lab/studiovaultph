'use client'

import React, { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { 
    Gift, Users, CheckCircle2, TrendingUp, 
    Settings2, Save, Trash2, ArrowRight,
    Search, Filter, ChevronRight, AlertCircle,
    X, Clock
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { updateStudioReferralConfig } from '@/lib/actions/referral'
import { useToast } from '@/components/ui/Toast'

interface ReferralsPageClientProps {
    studio: any
    initialConfig: any
    stats: any
    memberships: any[]
    packages: any[]
    outletId?: string
}

export default function ReferralsPageClient({ 
    studio, 
    initialConfig, 
    stats, 
    memberships, 
    packages,
    outletId 
}: ReferralsPageClientProps) {
    const { toast } = useToast()
    const [isEnabled, setIsEnabled] = useState(initialConfig?.is_enabled || false)
    const [rewardType, setRewardType] = useState<'percentage' | 'fixed_amount'>(initialConfig?.reward_discount_type || 'fixed_amount')
    const [rewardValue, setRewardValue] = useState(initialConfig?.reward_discount_value || 0)
    const [selectedItems, setSelectedItems] = useState<string[]>(
        [...(initialConfig?.applicable_package_ids || []), ...(initialConfig?.applicable_membership_ids || [])]
    )
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        const payload = {
            is_enabled: isEnabled,
            reward_discount_type: rewardType,
            reward_discount_value: rewardValue,
            applicable_package_ids: packages.filter(p => selectedItems.includes(p.id)).map(p => p.id),
            applicable_membership_ids: memberships.filter(m => selectedItems.includes(m.id)).map(m => m.id)
        }
        
        const res = await updateStudioReferralConfig(studio.id, payload)
        setIsSaving(false)
        if (res.success) {
            alert('Settings saved successfully!')
        } else {
            alert('Error: ' + res.error)
        }
    }

    const toggleItem = (id: string) => {
        setSelectedItems(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const selectAll = () => {
        const allIds = [...packages.map(p => p.id), ...memberships.map(m => m.id)]
        setSelectedItems(allIds)
    }

    const clearAll = () => setSelectedItems([])

    const filteredItems = [...packages, ...memberships].filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <StudioDashboardShell 
            title="Referral Program"
            breadcrumbs={[{ label: 'Referrals' }]}
            actions={
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#2D3282] rounded-lg text-[11px] font-bold uppercase tracking-widest text-white hover:bg-indigo-900 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Settings
                        </>
                    )}
                </button>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Configuration */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Status & Toggle */}
                    <div className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Program Status</h3>
                                <p className="text-xs text-zinc-400 font-medium">Enable or disable your studio-specific referral system.</p>
                            </div>
                            <button 
                                onClick={() => setIsEnabled(!isEnabled)}
                                className={clsx(
                                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none",
                                    isEnabled ? "bg-emerald-500" : "bg-zinc-200"
                                )}
                            >
                                <span className={clsx(
                                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm",
                                    isEnabled ? "translate-x-6" : "translate-x-1"
                                )} />
                            </button>
                        </div>

                        {!isEnabled && (
                            <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-100">
                                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-900">Program is Offline</p>
                                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                        Customers won't see the "Refer & Earn" tab on your website, and new referrals won't be tracked.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reward Policy */}
                    <div className={clsx(
                        "bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm space-y-8 transition-opacity",
                        !isEnabled && "opacity-50 pointer-events-none"
                    )}>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-zinc-900 tracking-tight">Referrer Reward</h3>
                            <p className="text-xs text-zinc-400 font-medium">Define what the existing customer gets when their referred friend completes a booking.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reward Type</label>
                                <div className="flex bg-zinc-50 p-1.5 rounded-xl border border-zinc-100">
                                    <button 
                                        onClick={() => setRewardType('fixed_amount')}
                                        className={clsx(
                                            "flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                            rewardType === 'fixed_amount' ? "bg-white text-[#2D3282] shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                        )}
                                    >
                                        Fixed Amount
                                    </button>
                                    <button 
                                        onClick={() => setRewardType('percentage')}
                                        className={clsx(
                                            "flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                            rewardType === 'percentage' ? "bg-white text-[#2D3282] shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                        )}
                                    >
                                        Percentage
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    {rewardType === 'fixed_amount' ? 'Discount Amount (₱)' : 'Discount Percentage (%)'}
                                </label>
                                <div className="relative group">
                                    <input 
                                        type="number"
                                        value={rewardValue}
                                        onChange={(e) => setRewardValue(parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-1 focus:ring-[#2D3282] focus:border-[#2D3282] transition-all outline-none"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 font-black text-xs">
                                        {rewardType === 'fixed_amount' ? 'PHP' : '%'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Applicable Items Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Applicable Plans</label>
                                    <p className="text-[10px] text-zinc-400 font-medium">Select which packages or memberships this discount can be applied to.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={selectAll} className="text-[10px] font-bold text-[#2D3282] uppercase tracking-widest hover:underline transition-all">Select All</button>
                                    <button onClick={clearAll} className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-red-500 transition-all">Clear</button>
                                </div>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-[#2D3282] transition-colors" />
                                <input 
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Find package or membership..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50/50 border border-zinc-100 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3282] transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredItems.map((item) => (
                                    <button 
                                        key={item.id}
                                        onClick={() => toggleItem(item.id)}
                                        className={clsx(
                                            "flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all group",
                                            selectedItems.includes(item.id) 
                                                ? "bg-indigo-50/50 border-indigo-100 ring-1 ring-indigo-50" 
                                                : "bg-white border-zinc-100 hover:border-zinc-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-5 h-5 rounded flex items-center justify-center transition-all border",
                                                selectedItems.includes(item.id) 
                                                    ? "bg-[#2D3282] border-[#2D3282]" 
                                                    : "bg-white border-zinc-200 group-hover:border-zinc-300"
                                            )}>
                                                {selectedItems.includes(item.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-zinc-900 line-clamp-1">{item.name}</span>
                                                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">₱{item.price}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats & Recent Activity */}
                <div className="space-y-8">
                    {/* Key Stats Cards */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-[#2D3282] rounded-2xl p-6 shadow-xl shadow-indigo-200 text-white space-y-4">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-200" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200/60">Total Referrals</p>
                                <h4 className="text-3xl font-black tracking-tight">{stats.total}</h4>
                            </div>
                        </div>

                        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Gift className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Rewards Granted</p>
                                <h4 className="text-3xl font-black tracking-tight text-zinc-900">{stats.rewarded}</h4>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Recent Activity</h3>
                            <button 
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="text-[10px] font-bold text-[#2D3282] hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex-1">
                            {stats.recent.length === 0 ? (
                                <div className="p-12 text-center space-y-2">
                                    <p className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">No referrals yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-50">
                                    {stats.recent.map((ref: any) => (
                                        <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-[#2D3282]">
                                                    {ref.referred?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-zinc-900">{ref.referred?.full_name || 'Anonymous User'}</span>
                                                    <span className="text-[9px] text-zinc-400 font-medium">{new Date(ref.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
                                                ref.status === 'rewarded' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-50 text-zinc-400"
                                            )}>
                                                {ref.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Referral History Modal */}
            <AnimatePresence>
                {isHistoryModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryModalOpen(false)}
                            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <div className="px-8 py-6 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-50 rounded-2xl text-[#2D3282]">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Referral History</h3>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tracking growth through word of mouth</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsHistoryModalOpen(false)}
                                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {stats.recent.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                                            <Users className="w-8 h-8 text-zinc-200" />
                                        </div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No referral activity recorded yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {stats.recent.map((ref: any) => (
                                            <div key={ref.id} className="p-6 rounded-2xl border border-zinc-50 bg-zinc-50/30 flex items-center justify-between group hover:bg-white hover:border-zinc-100 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-white border border-zinc-100 flex items-center justify-center text-sm font-black text-[#2D3282] shadow-sm">
                                                        {ref.referred?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-zinc-900">{ref.referred?.full_name || 'Anonymous User'}</p>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(ref.created_at).toLocaleDateString()}
                                                            </div>
                                                            <div className="w-1 h-1 rounded-full bg-zinc-200" />
                                                            <div className="text-[10px] font-bold text-[#2D3282] uppercase tracking-widest">
                                                                By {ref.referrer?.full_name || 'Member'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={clsx(
                                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                    ref.status === 'rewarded' 
                                                        ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                                                        : "bg-zinc-100 border-zinc-200 text-zinc-400"
                                                )}>
                                                    {ref.status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-zinc-50 bg-zinc-50/50 flex justify-end">
                                <button
                                    onClick={() => setIsHistoryModalOpen(false)}
                                    className="px-8 py-3 bg-[#2D3282] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-900 transition-all shadow-lg"
                                >
                                    Close Window
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </StudioDashboardShell>
    )
}
