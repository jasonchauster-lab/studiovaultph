'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UserPresenceTracker() {
    const supabase = createClient()
    const isOnlineRef = useRef(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        // Only run for authenticated users
        const initPresence = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Function to ping the server
            const pingPresence = async (isOnline: boolean) => {
                // Prevent unnecessary pings if unmounting
                if (!isOnline && !isOnlineRef.current) return;

                try {
                    await supabase.rpc('update_user_presence', { is_online_status: isOnline })
                    isOnlineRef.current = isOnline
                } catch (err) {
                    console.error('Failed to update presence', err)
                }
            }

            // 1. Initial ping on mount
            pingPresence(true)

            // 2. Setup interval ping (every 60 seconds)
            intervalRef.current = setInterval(() => {
                // Only continuously ping if the document is visible
                if (document.visibilityState === 'visible') {
                    pingPresence(true)
                }
            }, 60000)

            // 3. Handle visibility changes (switching tabs)
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    pingPresence(true)
                } else {
                    pingPresence(false)
                }
            }

            // 4. Handle window close/unload
            const handleBeforeUnload = () => {
                // Attempt to send a precise offline signal before leaving
                // SendBeacon or standard RPC (might not complete in time, but we try)
                pingPresence(false)
            }

            document.addEventListener('visibilitychange', handleVisibilityChange)
            window.addEventListener('beforeunload', handleBeforeUnload)

            // Cleanup
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                window.removeEventListener('beforeunload', handleBeforeUnload)
                if (intervalRef.current) clearInterval(intervalRef.current)
                pingPresence(false)
            }
        }

        initPresence()

    }, [supabase])

    // This component renders nothing
    return null
}
