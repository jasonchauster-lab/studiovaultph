'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Calendar, CreditCard, Package, Users, Bell, 
    Sparkles, ExternalLink, ArrowUpRight 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import Link from 'next/link'

interface ActivityItem {
    id: string
    type: string
    title: string
    description: string
    timestamp: Date
    link: string
    isRead: boolean
}

export default function LiveActivityFeed({ studioId, userId }: { studioId: string, userId: string }) {
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    const fetchActivity = useCallback(async () => {
        if (!userId) return

        const { data: rows } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (rows) {
            setActivities(rows.map(r => ({
                id: r.id,
                type: r.type,
                title: r.title,
                description: r.description,
                timestamp: new Date(r.created_at),
                link: r.data?.link || '#',
                isRead: r.is_read
            })))
        }
        setIsLoading(false)
    }, [userId, supabase])

    useEffect(() => {
        fetchActivity()

        const channel = supabase
            .channel(`live-activity-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${userId}`
                },
                () => fetchActivity()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase, fetchActivity])

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking': return <Calendar className="w-4 h-4" />
            case 'payment': return <CreditCard className="w-4 h-4" />
            case 'inventory': return <Package className="w-4 h-4" />
            case 'onboarding': return <Users className="w-4 h-4" />
            default: return <Bell className="w-4 h-4" />
        }
    }

    const getColorClass = (type: string) => {
        switch (type) {
            case 'booking': return "text-primary bg-primary/10"
            case 'payment': return "text-emerald-500 bg-emerald-500/10"
            case 'inventory': return "text-amber-500 bg-amber-500/10"
            case 'onboarding': return "text-sky-500 bg-sky-500/10"
            default: return "text-zinc-400 bg-zinc-100"
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-zinc-100 rounded-2xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Live Activity</h3>
                </div>
                <Link href="/studio/history" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline">
                    View All
                </Link>
            </div>

            <div className="space-y-3">
                {activities.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-100 rounded-[2rem]">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">No recent activity.</p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <Link 
                            key={activity.id} 
                            href={activity.link}
                            className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-tight transition-all group border border-transparent hover:border-zinc-100"
                        >
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                getColorClass(activity.type)
                            )}>
                                {getIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-[11px] font-black text-zinc-900 truncate uppercase tracking-tight leading-tight">
                                        {activity.title}
                                    </h4>
                                    <span className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest shrink-0">
                                        {formatDistanceToNow(activity.timestamp)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                    {activity.description}
                                </p>
                            </div>
                            <ArrowUpRight className="w-3 h-3 text-zinc-200 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
