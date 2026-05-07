'use client'

import React, { useState } from 'react'
import { 
    Plus, Search, ChevronDown, 
    X, Check, ExternalLink,
    PlayCircle
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'

interface PricingGroupsClientProps {
    studioId: string | undefined
    initialGroups: any[]
}

export default function PricingGroupsClient({ studioId, initialGroups }: PricingGroupsClientProps) {
    const supabase = createClient()
    const [groups, setGroups] = useState(initialGroups)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    
    // Form state
    const [groupName, setGroupName] = useState('')
    const [customColor, setCustomColor] = useState('#C4C4C4')

    const handleSave = async () => {
        if (!groupName || !studioId) return
        setIsSaving(true)
        
        const { data, error } = await supabase
            .from('pricing_groups')
            .insert({
                name: groupName,
                color: customColor,
                studio_id: studioId
            })
            .select()

        if (!error && data) {
            setGroups([data[0], ...groups])
            setIsDrawerOpen(false)
            setGroupName('')
            setCustomColor('#C4C4C4')
        }
        setIsSaving(false)
    }

    return (
        <div className="space-y-6 relative animate-in fade-in duration-700">
            {/* Header matched to screenshot */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-[32px] font-black text-zinc-900 tracking-tight leading-none flex items-center gap-3">
                        Pricing Groups
                        <button className="flex items-center gap-1.5 text-[#2D3282] text-[10px] font-black uppercase tracking-widest hover:underline translate-y-0.5">
                            <PlayCircle className="w-3.5 h-3.5" />
                            Watch Tutorial
                        </button>
                    </h2>
                </div>
                
                <button 
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex items-center gap-2 px-8 py-3 bg-[#2D3282] text-white rounded-full text-xs font-black shadow-lg shadow-[#2D3282]/20 hover:bg-[#1e225a] transition-all uppercase tracking-widest leading-none outline-none"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Add Group
                </button>
            </div>

            {/* Filter Bar matched to screenshot */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 md:max-w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                        type="text"
                        placeholder="Search"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                    />
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-800 shadow-sm">
                        <span>50</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">per page</span>
                </div>
            </div>

            {/* Content Area */}
            {groups.length === 0 ? (
                <div className="bg-white border border-zinc-50 rounded-[4rem] p-24 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
                    <div className="text-5xl animate-bounce duration-[3000ms]">🧐</div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Create a pricing group</h3>
                        <p className="text-sm font-bold text-zinc-400 max-w-md mx-auto leading-relaxed">
                            Assign your customers to groups such as staff, VIP and ambassador. Groups can have access to exclusive pricing plans created.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="text-[#2D3282] text-xs font-black uppercase tracking-[0.2em] hover:underline underline-offset-8 flex items-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Group
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-zinc-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="px-10 py-5 bg-zinc-50/50 border-b border-zinc-100 grid grid-cols-[1fr,1fr,0.5fr] text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <div>Group Name</div>
                        <div>Customers</div>
                        <div></div>
                    </div>
                    <div className="divide-y divide-zinc-50">
                        {groups.map((group) => (
                            <div key={group.id} className="px-10 py-6 grid grid-cols-[1fr,1fr,0.5fr] items-center gap-4 hover:bg-zinc-50/20 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-4 h-4 rounded-full border border-zinc-100" 
                                        style={{ backgroundColor: group.color || '#C4C4C4' }}
                                    />
                                    <span className="text-sm font-black text-zinc-900 tracking-tight">
                                        {group.name}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-zinc-400 italic">0 Customers</span>
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-zinc-400 hover:text-zinc-900">
                                        <ChevronDown className="w-4 h-4 rotate-[270deg]" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Side Drawer matched to screenshot */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div 
                        className="absolute inset-0 bg-zinc-900/60 animate-in fade-in duration-300" 
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    <div className="relative w-full max-w-[500px] bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                        {/* Drawer Header */}
                        <div className="p-12 pb-6 flex items-center justify-between">
                            <h2 className="text-[28px] font-black text-zinc-900 tracking-tight">Add Group</h2>
                            <button 
                                onClick={() => setIsDrawerOpen(false)}
                                className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 px-12 py-10 space-y-12 overflow-y-auto">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest block">Group name</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Royal"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 text-sm font-bold text-zinc-900 placeholder:text-zinc-200"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-widest block">Custom colour (Optional)</label>
                                <div className="relative group">
                                    <input 
                                        type="text"
                                        value={customColor}
                                        onChange={(e) => setCustomColor(e.target.value)}
                                        className="w-full px-6 py-4 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 text-sm font-bold text-zinc-900 uppercase pr-16"
                                    />
                                    <div 
                                        className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-zinc-100 shadow-sm"
                                        style={{ backgroundColor: customColor }}
                                    />
                                    <input 
                                        type="color" 
                                        value={customColor}
                                        onChange={(e) => setCustomColor(e.target.value)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest block">Preview</span>
                                <div>
                                    <span 
                                        className="inline-flex items-center px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-zinc-200/20 leading-none"
                                        style={{ backgroundColor: customColor }}
                                    >
                                        {groupName || 'Preview'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer matched to screenshot */}
                        <div className="p-12 pt-6 border-t border-zinc-50 flex items-center justify-center gap-4">
                            <button 
                                onClick={() => setIsDrawerOpen(false)}
                                className="px-12 py-4 border border-[#2D3282] text-[#2D3282] rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-[#2D3282]/5 hover:bg-zinc-50 transition-all flex-1"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={!groupName || isSaving}
                                className={clsx(
                                    "px-12 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all flex-1 shadow-lg",
                                    (!groupName || isSaving) ? "bg-zinc-200 text-white cursor-not-allowed" : "bg-[#2D3282] text-white hover:opacity-90"
                                )}
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
