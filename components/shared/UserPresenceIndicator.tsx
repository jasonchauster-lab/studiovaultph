'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock } from 'lucide-react'

// Helper function to format "time ago"
function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}

// Consider a user offline if their last_seen_at is more than 5 minutes old,
// even if is_online is still true in the DB (handles missed logout events).
function isRecentlyActive(lastSeenAt: string | null): boolean {
    if (!lastSeenAt) return false
    const diffMs = Date.now() - new Date(lastSeenAt).getTime()
    return diffMs < 5 * 60 * 1000 // 5 minutes
}

interface UserPresenceIndicatorProps {
    userId: string
    initialIsOnline?: boolean
    initialLastSeenAt?: string
    showText?: boolean
    className?: string
}

export default function UserPresenceIndicator({
    userId,
    initialIsOnline = false,
    initialLastSeenAt,
    showText = true,
    className = ''
}: UserPresenceIndicatorProps) {
    // Stable ref to the singleton client — avoids re-running the effect every render
    // because createClient() previously returned a new object each call.
    const supabaseRef = useRef(createClient())
    const [isOnline, setIsOnline] = useState(initialIsOnline)
    const [lastSeenAt, setLastSeenAt] = useState<string | null>(initialLastSeenAt || null)

    useEffect(() => {
        const supabase = supabaseRef.current

        const fetchInitialData = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_online, last_seen_at')
                .eq('id', userId)
                .single()

            if (data && !error) {
                const dbOnline = data.is_online || false
                const recentlyActive = isRecentlyActive(data.last_seen_at)
                setIsOnline(dbOnline && recentlyActive)
                setLastSeenAt(data.last_seen_at)
            }
        }

        fetchInitialData()

        // Subscribe to real-time updates for this user's profile
        const channel = supabase
            .channel(`presence-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    const newProfile = payload.new
                    if (newProfile.is_online !== undefined) {
                        const recentlyActive = isRecentlyActive(newProfile.last_seen_at || null)
                        setIsOnline(newProfile.is_online && recentlyActive)
                    }
                    if (newProfile.last_seen_at !== undefined) {
                        setLastSeenAt(newProfile.last_seen_at)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            <span className="relative flex h-2.5 w-2.5">
                {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            </span>
            {showText && (
                <span className={`text-xs ${isOnline ? 'text-green-600 font-medium' : 'text-gray-400 flex items-center gap-1'}`}>
                    {isOnline ? (
                        'Online'
                    ) : (
                        <>
                            <Clock className="w-3 h-3" />
                            {lastSeenAt ? `Last active ${formatTimeAgo(lastSeenAt)}` : 'Offline'}
                        </>
                    )}
                </span>
            )}
        </div>
    )
}
