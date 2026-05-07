'use client'

import { useState } from 'react'
import { Megaphone, Plus, Trash2, Power, PowerOff, ExternalLink, Video, Layout, Sidebar, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as LucideIcons from 'lucide-react'

type Announcement = {
    id: string
    title: string
    description: string
    type: 'banner' | 'sidebar_card'
    target_role: 'studio' | 'instructor' | 'all'
    is_active: boolean
    action_label: string
    action_url: string
    video_url: string
    icon_name: string
    created_at: string
}

export default function AnnouncementsManager({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
    const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'banner',
        target_role: 'all',
        action_label: '',
        action_url: '',
        video_url: '',
        icon_name: 'Tag',
        is_active: false
    })

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        const { data, error } = await supabase.from('platform_announcements').insert([formData]).select()
        if (!error && data) {
            setAnnouncements([data[0], ...announcements])
            setIsCreating(false)
            setFormData({
                title: '',
                description: '',
                type: 'banner',
                target_role: 'all',
                action_label: '',
                action_url: '',
                video_url: '',
                icon_name: 'Tag',
                is_active: false
            })
        }
        setIsLoading(false)
    }

    async function toggleActive(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('platform_announcements')
            .update({ is_active: !currentStatus })
            .eq('id', id)
        
        if (!error) {
            setAnnouncements(announcements.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a))
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this announcement?')) return
        const { error } = await supabase.from('platform_announcements').delete().eq('id', id)
        if (!error) {
            setAnnouncements(announcements.filter(a => a.id !== id))
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-black tracking-[0.2em] text-burgundy uppercase flex items-center gap-3">
                    <Megaphone className="w-4 h-4 text-forest" />
                    PLATFORM ANNOUNCEMENTS
                </h2>
                <button 
                    onClick={() => setIsCreating(!isCreating)}
                    className="btn-antigravity px-6 py-3 text-[10px] tracking-[0.1em] flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {isCreating ? 'CANCEL' : 'NEW ANNOUNCEMENT'}
                </button>
            </div>

            {isCreating && (
                <div className="atelier-card p-8 bg-zinc-50 border-zinc-200">
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Announcement Title</label>
                                    <input 
                                        required
                                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-burgundy/20 outline-none transition-all"
                                        placeholder="e.g. 2 New Features Revealed!"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Description</label>
                                    <textarea 
                                        required
                                        rows={3}
                                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-burgundy/20 outline-none transition-all"
                                        placeholder="Briefly describe the update..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Display Type</label>
                                        <select 
                                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        >
                                            <option value="banner">Banner (Top)</option>
                                            <option value="sidebar_card">Sidebar Card</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Target Role</label>
                                        <select 
                                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                                            value={formData.target_role}
                                            onChange={e => setFormData({ ...formData, target_role: e.target.value as any })}
                                        >
                                            <option value="all">All Users</option>
                                            <option value="studio">Studios Only</option>
                                            <option value="instructor">Instructors Only</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Button Label</label>
                                        <input 
                                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                                            placeholder="e.g. View Video"
                                            value={formData.action_label}
                                            onChange={e => setFormData({ ...formData, action_label: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Icon Name (Sidebar)</label>
                                        <input 
                                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                                            placeholder="Lucide name (e.g. Tag)"
                                            value={formData.icon_name}
                                            onChange={e => setFormData({ ...formData, icon_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Action URL</label>
                                    <input 
                                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                                        placeholder="https://..."
                                        value={formData.action_url}
                                        onChange={e => setFormData({ ...formData, action_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black tracking-widest text-burgundy/40 uppercase mb-2 block">Video URL (Optional)</label>
                                    <input 
                                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none"
                                        placeholder="Video link..."
                                        value={formData.video_url}
                                        onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-4">
                                    <input 
                                        type="checkbox"
                                        id="is_active"
                                        className="w-4 h-4 accent-forest"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    <label htmlFor="is_active" className="text-[10px] font-black uppercase tracking-widest text-forest cursor-pointer">Published / Active</label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-stone-200 flex justify-end">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="px-10 py-4 bg-burgundy text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-xl disabled:opacity-50"
                            >
                                {isLoading ? 'PUBLISHING...' : 'PUBLISH ANNOUNCEMENT'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className="text-center py-20 atelier-card border-dashed">
                        <p className="text-burgundy/30 text-xs italic tracking-widest uppercase">No announcements found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {announcements.map((a) => (
                            <div key={a.id} className="atelier-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                                <div className="flex items-start gap-6 flex-1 min-w-0">
                                    <div className={`p-4 rounded-2xl ${a.type === 'banner' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {a.type === 'banner' ? <Layout className="w-6 h-6" /> : <Sidebar className="w-6 h-6" />}
                                    </div>
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-burgundy text-base truncate">{a.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                                a.target_role === 'studio' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                a.target_role === 'instructor' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                'bg-zinc-50 text-zinc-600 border-zinc-200'
                                            }`}>
                                                {a.target_role}
                                            </span>
                                        </div>
                                        <p className="text-xs text-burgundy/60 leading-relaxed max-w-2xl line-clamp-2">{a.description}</p>
                                        <div className="flex gap-4 pt-2">
                                            {a.action_url && <span className="text-[8px] font-black text-forest uppercase tracking-widest flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Link Attached</span>}
                                            {a.video_url && <span className="text-[8px] font-black text-forest uppercase tracking-widest flex items-center gap-1"><Video className="w-3 h-3" /> Video Attached</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <button 
                                        onClick={() => toggleActive(a.id, a.is_active)}
                                        className={`p-3 rounded-xl transition-all border ${
                                            a.is_active 
                                            ? 'bg-forest/10 text-forest border-forest/20 hover:bg-forest/20' 
                                            : 'bg-zinc-50 text-zinc-400 border-zinc-200 hover:bg-zinc-100'
                                        }`}
                                        title={a.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {a.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(a.id)}
                                        className="p-3 bg-red-50 text-red-400 border border-red-100 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
