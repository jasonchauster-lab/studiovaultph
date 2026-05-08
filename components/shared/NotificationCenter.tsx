'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Calendar, MessageSquare, CreditCard, ExternalLink, Sparkles, Check, Package, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markNotificationRead, clearAllNotifications } from '@/app/(dashboard)/studio/management/actions'
import clsx from 'clsx'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
    id: string
    type: string
    title: string
    description: string
    timestamp: Date
    link: string
    isRead: boolean
    data?: any
}

export default function NotificationCenter({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()

    const fetchNotifications = useCallback(async () => {
        if (!userId) return

        const { data: rows } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (rows) {
            const mapped: Notification[] = rows.map((r: any) => ({
                id: r.id,
                type: r.type,
                title: r.title,
                description: r.description,
                timestamp: new Date(r.created_at),
                link: r.data?.link || '#',
                isRead: r.is_read,
                data: r.data
            }))
            setNotifications(mapped)
            setUnreadCount(mapped.filter(n => !n.isRead).length)
        }
    }, [userId, supabase])

    useEffect(() => {
        fetchNotifications()

        // Real-time listener for the notifications table
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${userId}`
                },
                () => fetchNotifications()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase, fetchNotifications])

    const handleMarkRead = async (id: string) => {
        const res = await markNotificationRead(id)
        if (res.success) {
            fetchNotifications()
        }
    }

    const handleClearAll = async () => {
        const res = await clearAllNotifications()
        if (res.success) {
            fetchNotifications()
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking': return <Calendar className="w-5 h-5" />
            case 'payment': return <CreditCard className="w-5 h-5" />
            case 'onboarding': return <Users className="w-5 h-5" />
            case 'marketing': return <Sparkles className="w-5 h-5" />
            case 'system': return <Package className="w-5 h-5" />
            default: return <Bell className="w-5 h-5" />
        }
    }

    const getColorClass = (type: string) => {
        switch (type) {
            case 'booking': return "bg-primary/10 text-primary"
            case 'payment': return "bg-emerald-500/10 text-emerald-600"
            case 'onboarding': return "bg-sky-500/10 text-sky-600"
            case 'marketing': return "bg-amber-500/10 text-amber-600"
            default: return "bg-zinc-100 text-zinc-600"
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 bg-white border border-zinc-100 rounded-full hover:shadow-tight hover:-translate-y-0.5 transition-all relative group"
            >
                <Bell className={clsx("w-5 h-5 transition-colors", unreadCount > 0 ? "text-primary" : "text-zinc-400 group-hover:text-zinc-900")} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white translate-x-1/4 -translate-y-1/4 animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-4 w-96 bg-white border border-zinc-100 rounded-3xl shadow-floating z-[70] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 ease-out fill-mode-both origin-top-right ring-1 ring-zinc-900/5">
                        <div className="p-6 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    Activity Feed
                                </h3>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 opacity-60">Real-time studio updates</p>
                            </div>
                            <button onClick={handleClearAll} className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors">
                                Clear All
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
                            {notifications.length === 0 ? (
                                <div className="p-16 text-center space-y-4">
                                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto opacity-50 ring-1 ring-zinc-100">
                                        <Bell className="w-8 h-8 text-zinc-300" />
                                    </div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest opacity-40 italic">All caught up here.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div 
                                        key={n.id} 
                                        className={clsx(
                                            "px-6 py-5 border-b border-zinc-50 last:border-b-0 hover:bg-zinc-50/40 transition-colors relative group/notification",
                                            !n.isRead && "bg-primary/5"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white",
                                                getColorClass(n.type)
                                            )}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start gap-4">
                                                    <h4 className="text-[11px] font-black text-zinc-900 uppercase tracking-wider leading-tight">{n.title}</h4>
                                                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest opacity-40 whitespace-nowrap">
                                                        {formatDistanceToNow(n.timestamp)} ago
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                                                    {n.description}
                                                </p>
                                                <div className="pt-3 flex items-center justify-between">
                                                    <Link 
                                                        href={n.link} 
                                                        className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-1.5 hover:translate-x-1 transition-transform"
                                                        onClick={() => setIsOpen(false)}
                                                    >
                                                        VIEW
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                    {!n.isRead && (
                                                        <button 
                                                            onClick={() => handleMarkRead(n.id)}
                                                            className="text-[9px] font-black text-zinc-400 hover:text-primary uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            MARK READ
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-5 bg-zinc-50/50 border-t border-zinc-50">
                            <Link 
                                href="/studio/history" 
                                className="w-full h-11 bg-white border border-zinc-100 rounded-xl flex items-center justify-center text-[10px] font-black text-zinc-900 uppercase tracking-[0.3em] hover:bg-primary hover:text-white hover:border-primary transition-all shadow-tight active:scale-[0.98]"
                                onClick={() => setIsOpen(false)}
                            >
                                FULL HISTORY
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
