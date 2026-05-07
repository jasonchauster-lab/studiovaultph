'use client'

import React from 'react'
import { Plus, Loader2 } from 'lucide-react'

interface AddCategorySectionProps {
    isAdding: boolean
    setIsAdding: (value: boolean) => void
    name: string
    setName: (value: string) => void
    onAdd: () => void
    isProcessing: boolean
    activeTab: 'memberships' | 'packages'
}

export default function AddCategorySection({
    isAdding,
    setIsAdding,
    name,
    setName,
    onAdd,
    isProcessing,
    activeTab
}: AddCategorySectionProps) {
    if (isAdding) {
        return (
            <div className="p-10 bg-white border-2 border-[var(--primary)] rounded-[2rem] shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="max-w-md mx-auto space-y-6 text-center">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary)]">New category</h4>
                    <input 
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onAdd()
                            if (e.key === 'Escape') setIsAdding(false)
                        }}
                        placeholder="Enter category name..."
                        className="w-full px-6 py-5 border border-zinc-100 rounded-2xl text-center font-black text-xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                    />
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="flex-1 py-4 bg-zinc-50 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onAdd}
                            disabled={isProcessing}
                            className="flex-1 py-4 bg-[var(--primary)] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center"
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Category'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <button 
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-300 hover:border-zinc-200 hover:text-zinc-500 transition-all group"
        >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Add {activeTab === 'memberships' ? 'membership' : 'package'} category</span>
        </button>
    )
}
