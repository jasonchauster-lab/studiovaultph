'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Calendar, MessageSquare, CreditCard, ExternalLink, Sparkles, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import clsx from 'clsx'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
    id: string
    type: 'booking' | 'message' | 'transaction'
    title: string
    description: string
    timestamp: Date
    link: string
    isRead: boolean
}

export default function NotificationCenter({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()

    const fetchInitialNotifications = useCallback(async () => {
        // Fetch recent bookings as mock notifications
        const { data: bookings } = await supabase
            .from('bookings')
            .select(`
                id, 
                status, 
                updated_at,
                slots(date, start_time, studios(name))
            `)
            .or(`client_id.eq.${userId},instructor_id.eq.${userId}`)
            .order('updated_at', { ascending: false })
            .limit(10)

        const mapped: Notification[] = (bookings || []).map((b: any) => {
            const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots
            const studioName = (slot as any)?.studios?.name || 'Studio'
            let title = 'Booking Update'
            let description = `Session at ${studioName} is now ${b.status}`
            
            if (b.status === 'approved') title = 'Booking Confirmed'
            if (b.status === 'cancelled_refunded') title = 'Booking Cancelled'

            return {
                id: b.id,
                type: 'booking',
                title,
                description,
                timestamp: new Date(b.updated_at),
                link: '/instructor/history', // Adjust based on role
                isRead: true // Simplified for now
            }
        })

        setNotifications(mapped)
    }, [userId, supabase])

    useEffect(() => {
        fetchInitialNotifications()

        // Real-time subscription for bookings
        const channel = supabase
            .channel('notification-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `client_id=eq.${userId}`
                },
                () => fetchInitialNotifications()
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bookings',
                    filter: `instructor_id=eq.${userId}`
                },
                () => fetchInitialNotifications()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase, fetchInitialNotifications])

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 bg-white border border-border-grey/50 rounded-full hover:shadow-tight hover:-translate-y-0.5 transition-all relative group"
            >
                <Bell className={clsx("w-5 h-5 transition-colors", unreadCount > 0 ? "text-forest" : "text-charcoal/60 group-hover:text-charcoal")} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-forest text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white translate-x-1/4 -translate-y-1/4 animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-4 w-96 bg-white border border-border-grey/50 rounded-2xl shadow-floating z-[70] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 ease-out fill-mode-both origin-top-right ring-1 ring-charcoal/5">
                        <div className="p-6 border-b border-border-grey/30 bg-off-white/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-forest" />
                                    Activity Feed
                                </h3>
                                <p className="text-[10px] text-slate font-bold uppercase tracking-widest mt-1 opacity-60">System Updates & Live Events</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate hover:text-charcoal transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-16 h-16 bg-off-white rounded-full flex items-center justify-center mx-auto opacity-50 ring-1 ring-border-grey/10">
                                        <Bell className="w-8 h-8 text-slate" />
                                    </div>
                                    <p className="text-xs font-bold text-slate uppercase tracking-widest opacity-40 italic">All caught up here.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div 
                                        key={n.id} 
                                        className={clsx(
                                            "px-6 py-5 border-b border-border-grey/20 last:border-b-0 hover:bg-off-white/40 transition-colors relative group/notification",
                                            !n.isRead && "bg-forest/5"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-tight ring-1 ring-white",
                                                n.type === 'booking' ? "bg-forest/10 text-forest" : 
                                                n.type === 'message' ? "bg-azure/10 text-azure" : 
                                                "bg-gold/10 text-gold"
                                            )}>
                                                {n.type === 'booking' && <Calendar className="w-5 h-5" />}
                                                {n.type === 'message' && <MessageSquare className="w-5 h-5" />}
                                                {n.type === 'transaction' && <CreditCard className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start gap-4">
                                                    <h4 className="text-[11px] font-black text-charcoal uppercase tracking-wider leading-tight">{n.title}</h4>
                                                    <span className="text-[9px] font-bold text-slate uppercase tracking-widest opacity-40 whitespace-nowrap">
                                                        {formatDistanceToNow(n.timestamp)} ago
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate font-medium leading-relaxed">
                                                    {n.description}
                                                </p>
                                                <div className="pt-3 flex items-center justify-between opacity-0 group-hover/notification:opacity-100 transition-opacity">
                                                    <Link 
                                                        href={n.link} 
                                                        className="text-[9px] font-black text-forest uppercase tracking-[0.2em] flex items-center gap-1.5 hover:translate-x-1 transition-transform"
                                                        onClick={() => setIsOpen(false)}
                                                    >
                                                        VIEW DETAILS
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                    {!n.isRead && (
                                                        <button className="text-[9px] font-black text-slate hover:text-forest uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors">
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

                        <div className="p-5 bg-off-white/50 border-t border-border-grey/30">
                            <Link 
                                href="/instructor/history" 
                                className="w-full h-11 bg-white border border-border-grey/60 rounded-xl flex items-center justify-center text-[10px] font-black text-charcoal uppercase tracking-[0.3em] hover:bg-forest hover:text-white hover:border-forest transition-all shadow-tight active:scale-[0.98]"
                                onClick={() => setIsOpen(false)}
                            >
                                SEE ALL ACTIVITY
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
