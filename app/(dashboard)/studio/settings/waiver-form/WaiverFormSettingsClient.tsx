'use client'

import { useState } from 'react'
import { 
    Search, Plus, MoreVertical, 
    ChevronDown, Download, Trash2, Edit2
} from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/shared/Modal'
import { upsertWaiverAction, deleteWaiverAction } from '@/lib/actions/waiver'

interface WaiverRecord {
    id: string
    title: string
    content: string
    status: string
    last_updated: string
    updated_by: string
}

interface WaiverFormSettingsClientProps {
    waivers: WaiverRecord[]
}

export default function WaiverFormSettingsClient({ waivers: initialWaivers }: WaiverFormSettingsClientProps) {
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState('')
    const itemsPerPage = 20
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingWaiver, setEditingWaiver] = useState<WaiverRecord | null>(null)
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        status: 'Active'
    })

    const handleOpenModal = (waiver?: WaiverRecord) => {
        if (waiver) {
            setEditingWaiver(waiver)
            setFormData({
                title: waiver.title,
                content: waiver.content,
                status: waiver.status
            })
        } else {
            setEditingWaiver(null)
            setFormData({
                title: '',
                content: '',
                status: 'Active'
            })
        }
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.content) {
            toast('Please fill in all required fields', 'error')
            return
        }

        setIsSaving(true)
        try {
            await upsertWaiverAction({
                id: editingWaiver?.id,
                ...formData
            })
            toast(editingWaiver ? 'Waiver updated successfully' : 'Waiver created successfully', 'success')
            setIsModalOpen(false)
        } catch {
            toast('Failed to save waiver form', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this waiver form?')) return

        try {
            await deleteWaiverAction(id)
            toast('Waiver deleted successfully', 'success')
            setActiveMenuId(null)
        } catch {
            toast('Failed to delete waiver form', 'error')
        }
    }

    const handleDownload = (waiver: WaiverRecord) => {
        toast(`Generating download for ${waiver.title}...`, 'info')
        // Mock download logic
        setTimeout(() => {
            toast('Download prepared. Starting transfer...', 'success')
        }, 1500)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Header matched to screenshot */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-[32px] font-black text-zinc-900 tracking-tight leading-none">
                        Waiver Form
                    </h1>
                    <p className="text-sm font-bold text-zinc-400">
                        Manage and edit your waiver form for new customers
                    </p>
                </div>
                
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-8 py-3 bg-[#2D3282] text-white rounded-full text-sm font-black shadow-lg shadow-[#2D3282]/20 hover:bg-[#1e225a] transition-all uppercase tracking-widest leading-none"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Add Waiver Form
                </button>
            </div>

            {/* Filter Bar matched to screenshot */}
            <div className="flex flex-wrap items-center gap-3">
                 <div className="relative flex-1 md:max-w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm">
                    All status <ChevronDown className="w-4 h-4 text-zinc-300" />
                </button>

                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-800 shadow-sm">
                        <span>{itemsPerPage}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">per page</span>
                </div>
            </div>

            {/* Waiver Table - GRID SYNTAX FIXED (removed commas) */}
            <div className="bg-white border border-zinc-50 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="px-10 py-5 bg-zinc-50/50 border-b border-zinc-100 grid grid-cols-[1fr_2fr_1.5fr_1fr_0.5fr] text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 uppercase">Last updated <ChevronDown className="w-3 h-3" /></div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 uppercase">Title <ChevronDown className="w-3 h-3" /></div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 uppercase">Updated by <ChevronDown className="w-3 h-3" /></div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-600 uppercase">Status <ChevronDown className="w-3 h-3" /></div>
                    <div></div>
                </div>
                <div className="divide-y divide-zinc-50">
                    {initialWaivers.map((waiver) => (
                        <div key={waiver.id} className="px-10 py-6 grid grid-cols-[1fr_2fr_1.5fr_1fr_0.5fr] items-center gap-4 hover:bg-zinc-50/50 transition-all group">
                            <span className="text-xs font-bold text-zinc-600 tracking-tight">
                                {format(new Date(waiver.last_updated), 'dd MMM yyyy')}
                            </span>
                            <span className="text-sm font-black text-zinc-900 tracking-tight">
                                {waiver.title}
                            </span>
                            <span className="text-sm font-bold text-zinc-600">
                                {waiver.updated_by}
                            </span>
                             <div>
                                <span className={clsx(
                                    "inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md leading-none shadow-sm",
                                    waiver.status === 'Active' ? "bg-emerald-400 text-white" : "bg-zinc-100 text-zinc-400"
                                )}>
                                    {waiver.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity relative">
                                <button 
                                    onClick={() => handleDownload(waiver)}
                                    className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                    <button 
                                        onClick={() => setActiveMenuId(activeMenuId === waiver.id ? null : waiver.id)}
                                        className="p-2 text-zinc-300 hover:text-zinc-900 transition-colors"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                    
                                    {activeMenuId === waiver.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-zinc-100 rounded-2xl shadow-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                <button 
                                                    onClick={() => {
                                                        handleOpenModal(waiver)
                                                        setActiveMenuId(null)
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" /> Edit Template
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(waiver.id)}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {initialWaivers.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="text-4xl">📄</div>
                            <h3 className="text-lg font-black text-zinc-900 tracking-tight">No waiver forms found</h3>
                            <p className="text-sm font-bold text-zinc-400 max-w-xs mx-auto">Create your first waiver form to start protecting your business and informing your customers.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Add/Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingWaiver ? "Edit Waiver Form" : "New Waiver Form"}
            >
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#2D3282] transition-all"
                            placeholder="e.g. Health & Safety Waiver"
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</label>
                        <div className="flex gap-3">
                            {['Active', 'Draft', 'Archived'].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status })}
                                    className={clsx(
                                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                        formData.status === status ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Content</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={12}
                            className="w-full px-8 py-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] text-sm font-bold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#2D3282] transition-all resize-none leading-relaxed"
                            placeholder="Enter the full legal text of your waiver..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                         <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className={clsx(
                                "px-10 py-5 bg-[#2D3282] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl hover:bg-[#1e225a]",
                                isSaving && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isSaving ? 'Processing...' : (editingWaiver ? 'Update Waiver' : 'Create Waiver')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
