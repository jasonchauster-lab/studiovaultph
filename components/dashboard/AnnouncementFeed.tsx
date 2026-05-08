import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { Plus, Video, Tag, MessageCircle, ChevronRight, Store, Megaphone, Star, Zap, Bell, Info, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const iconMap: Record<string, any> = {
    Plus, Video, Tag, MessageCircle, ChevronRight, Store, Megaphone, Star, Zap, Bell, Info
}

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
}

const getCachedAnnouncements = cache(async (role: string, position: string) => {
    const supabase = await createClient()
    const { data } = await supabase
        .from('platform_announcements')
        .select('*')
        .eq('is_active', true)
        .in('target_role', [role, 'all'])
        .eq('type', position === 'main' ? 'banner' : 'sidebar_card')
        .order('created_at', { ascending: false })
    return data
})

export default async function AnnouncementFeed({ role, position }: { role: 'studio' | 'instructor', position: 'main' | 'sidebar' }) {
    const announcements = await getCachedAnnouncements(role, position)

    if (!announcements || announcements.length === 0) return null

    return (
        <>
            {announcements.map((a: Announcement) => {
                if (position === 'main') {
                    return (
                        <div key={a.id} className="bg-zinc-900 rounded-[2.5rem] p-10 relative overflow-hidden group border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 mb-12">
                            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-1000">
                                <Plus className="w-64 h-64 text-primary" />
                            </div>
                            <div className="flex items-start gap-8 relative z-10">
                                <div className="w-20 h-20 shrink-0 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10">
                                    <Sparkles className="w-10 h-10 text-primary" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-black text-white max-w-lg leading-tight uppercase tracking-tightest">
                                        {a.title}
                                    </h3>
                                    <p className="text-sm text-zinc-400 max-w-lg leading-relaxed font-medium">
                                        {a.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                                {a.action_url && (
                                    <Link 
                                        href={a.action_url}
                                        className="bg-primary text-white px-10 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {a.action_label || 'Learn More'}
                                    </Link>
                                )}
                                {a.video_url && (
                                    <Link 
                                        href={a.video_url}
                                        className="bg-white/5 text-white border border-white/10 px-10 py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all shadow-md flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <Video className="w-4 h-4" />
                                        Watch Video
                                    </Link>
                                )}
                            </div>
                        </div>
                    )
                } else {
                    // Sidebar Card
                    const IconComponent = iconMap[a.icon_name] || Tag
                    return (
                        <div key={a.id} className="bg-primary text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group border border-primary/20 mb-10">
                            <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                                <IconComponent className="w-48 h-48" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                <Bell className="w-4 h-4" />
                                Feature Update
                            </h3>
                            <h4 className="text-xl font-black leading-tight mb-4 tracking-tightest uppercase">{a.title}</h4>
                            <p className="text-xs font-medium mb-8 leading-relaxed text-white/80">
                                {a.description}
                            </p>
                            {a.action_url && (
                                <Link 
                                    href={a.action_url}
                                    className="block w-full py-4 bg-white text-primary rounded-xl text-[10px] font-black text-center uppercase tracking-[0.2em] transition-all hover:bg-white/90 shadow-lg"
                                >
                                    {a.action_label || 'Check It Out'}
                                </Link>
                            )}
                        </div>
                    )
                }
            })}
        </>
    )
}
