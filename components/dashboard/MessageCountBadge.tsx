'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MessageCountBadge({ bookingId, currentUserId, isOpen }: { bookingId: string, currentUserId: string, isOpen: boolean }) {
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()

    useEffect(() => {
        const key = `last_seen_msg_count_${bookingId}`

        async function fetchInitialCount() {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('booking_id', bookingId)

            const lastSeen = parseInt(localStorage.getItem(key) || '0')
            if (count && count > lastSeen) {
                // We need to verify if the new messages are NOT from the current user
                const { data: newMsgs } = await supabase
                    .from('messages')
                    .select('sender_id')
                    .eq('booking_id', bookingId)
                    .order('created_at', { ascending: false })
                    .limit(count - lastSeen)

                const hasOthers = newMsgs?.some(m => m.sender_id !== currentUserId)
                if (hasOthers) {
                    setUnreadCount(count - lastSeen)
                }
            }
        }

        fetchInitialCount()

        const channel = supabase
            .channel(`notify-${bookingId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `booking_id=eq.${bookingId}`
                },
                (payload) => {
                    if (payload.new.sender_id !== currentUserId) {
                        setUnreadCount(prev => prev + 1)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [bookingId, currentUserId, supabase])

    // Clear the badge immediately when the chat is opened
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0)
            // Also fetch the current count so localStorage stays accurate after closing
            supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('booking_id', bookingId)
                .then(({ count }) => {
                    if (count != null) {
                        localStorage.setItem(`last_seen_msg_count_${bookingId}`, count.toString())
                    }
                })
        }
    }, [isOpen, bookingId, supabase])


    if (unreadCount === 0) return null

    return (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-bounce shadow-sm font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
    )
}
