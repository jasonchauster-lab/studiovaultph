'use client'

import React, { useState, useMemo } from 'react'
import { X, Search, ChevronRight, HelpCircle } from 'lucide-react'
import { BUILDER_TIPS, BuilderTip } from '@/lib/studio/builder-tips'
import clsx from 'clsx'

interface TipGuideModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function TipGuideModal({ isOpen, onClose }: TipGuideModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const categories = Array.from(new Set(BUILDER_TIPS.map(tip => tip.category)))

    const filteredTips = useMemo(() => {
        return BUILDER_TIPS.filter(tip => {
            const matchesSearch = tip.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                tip.content.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = !selectedCategory || tip.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [searchQuery, selectedCategory])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div 
                className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-[3rem] shadow-2xl border border-zinc-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between border-b border-zinc-100">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <HelpCircle className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Comprehensive Tip Guide</h2>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Master the Studio Vault Builder</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all border border-transparent hover:border-zinc-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-8 py-6 bg-zinc-50/50 flex flex-col sm:flex-row gap-4 border-b border-zinc-100">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                            type="text"
                            placeholder="Search tips, tools, or features..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-2xl py-3.5 pl-12 pr-4 text-[13px] font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all placeholder:text-zinc-300 shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                        <button 
                            onClick={() => setSelectedCategory(null)}
                            className={clsx(
                                "px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                !selectedCategory ? "bg-zinc-900 text-white shadow-lg" : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300"
                            )}
                        >
                            All Tips
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={clsx(
                                    "px-5 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                                    selectedCategory === cat ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top_left,_rgba(45,50,130,0.03),_transparent_40%)]">
                    {filteredTips.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                            {filteredTips.map((tip) => {
                                const Icon = tip.icon;
                                return (
                                    <div 
                                        key={tip.id}
                                        className="group p-8 bg-white rounded-[2.5rem] border border-zinc-100 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="relative z-10 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="w-14 h-14 rounded-2xl bg-zinc-50 text-zinc-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-all duration-500 border border-transparent group-hover:border-indigo-100 shadow-sm group-hover:shadow-md">
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <span className="px-3 py-1.5 rounded-full bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-100">
                                                    {tip.category}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-black text-zinc-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {tip.title}
                                                </h3>
                                                <p className="text-[13px] leading-relaxed text-zinc-500 font-medium italic">
                                                    {tip.content}
                                                </p>
                                            </div>

                                            <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-indigo-400 transition-colors">
                                                Learn more about {tip.title.toLowerCase()}
                                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-200">
                                <Search className="w-10 h-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-zinc-900">No tips found</h3>
                                <p className="text-sm text-zinc-400 italic font-medium">Try searching for something else, like "Colors" or "Branches".</p>
                            </div>
                            <button 
                                onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                                className="mt-4 px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between shrink-0">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                        Total {BUILDER_TIPS.length} Tips Available
                    </p>
                    <button 
                        onClick={onClose}
                        className="px-10 py-4 bg-zinc-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:shadow-xl hover:shadow-zinc-900/20 active:scale-95 transition-all"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    )
}
