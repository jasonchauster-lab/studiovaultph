'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MessageCountBadge({ bookingId, currentUserId, partnerId, isOpen }: { bookingId: string, currentUserId: string, partnerId: string, isOpen: boolean }) {
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()

    useEffect(() => {
        if (!partnerId) return;

        async function fetchInitialCount() {
            // Get the last time the current user checked this specific 1-on-1 chat
            const { data: presence } = await supabase
                .from('chat_presence')
                .select('last_seen_at')
                .eq('booking_id', bookingId)
                .eq('user_id', currentUserId)
                .eq('chat_partner_id', partnerId)
                .single()

            const lastSeen = presence?.last_seen_at || new Date(0).toISOString()

            // Count messages sent TO current user BY partner, since last seen
            let query = supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('booking_id', bookingId)
                .eq('sender_id', partnerId)
                .gt('created_at', lastSeen)

            // Include backward compatibility (null recipient) OR explicit recipient
            query = query.or(`recipient_id.eq.${currentUserId},recipient_id.is.null`)

            const { count } = await query

            if (count) {
                setUnreadCount(count)
            }
        }

        fetchInitialCount()

        // Listen for new messages incoming FROM the partner
        const channel = supabase
            .channel(`notify-${bookingId}-${partnerId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `booking_id=eq.${bookingId}`
                },
                (payload: { new: { sender_id: string; recipient_id: string | null } }) => {
                    const newMsg = payload.new
                    if (newMsg.sender_id === partnerId &&
                        (newMsg.recipient_id === currentUserId || newMsg.recipient_id === null)) {
                        setUnreadCount(prev => prev + 1)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [bookingId, currentUserId, partnerId, supabase])

    // Clear the badge immediately when the chat is opened
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0)
        }
    }, [isOpen])


    if (unreadCount === 0) return null

    return (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full shadow-sm font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
    )
}
