'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'
import clsx from 'clsx'

interface SupportNotificationBadgeProps {
    showIcon?: boolean
    className?: string
}

export default function SupportNotificationBadge({ showIcon = false, className }: SupportNotificationBadgeProps) {
    const [unreadCount, setUnreadCount] = useState<number>(0)
    const supabase = createClient()

    useEffect(() => {
        const fetchUnreadCount = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { count, error } = await supabase
                .from('support_messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .neq('sender_id', user.id) // Only count messages NOT from me

            if (!error && count !== null) {
                setUnreadCount(count)
            }
        }

        fetchUnreadCount()

        // Real-time subscription for new messages
        const channel = supabase
            .channel('support_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'support_messages' },
                () => {
                    fetchUnreadCount()
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'support_messages' },
                () => {
                    fetchUnreadCount()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (unreadCount === 0 && !showIcon) return null

    return (
        <div className={clsx("inline-flex items-center gap-1", className)}>
            {showIcon && <MessageCircle className="w-4 h-4" />}
            {unreadCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </div>
    )
}
