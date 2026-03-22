import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { clsx } from 'clsx'

import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import { isHeicFile } from '@/lib/utils/image-utils'

interface AvatarProps {
    src?: string | null
    alt?: string
    size?: number
    className?: string
    fallbackName?: string
    isOnline?: boolean
}

export default function Avatar({ 
    src, 
    alt = "User Profile", 
    size = 40, 
    className,
    fallbackName,
    isOnline = false
}: AvatarProps) {
    const [error, setError] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Reset error when src changes
    useEffect(() => {
        setError(false)
    }, [src])

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2)
    }

    const showFallback = error || !src || src === '/default-avatar.svg'
    const isHeic = isHeicFile(src)
    
    // Use the centralized Supabase Render Engine transformation for all Supabase assets
    // This handles HEIC to WebP/JPG conversion and resizing automatically
    const finalSrc = (src && src.includes('supabase.co')) 
        ? getSupabaseAssetUrl(src, 'avatars', { width: size * 2, quality: 80, format: 'webp' })
        : (src && !src.startsWith('http') && !src.startsWith('blob:'))
            ? getSupabaseAssetUrl(src, 'avatars', { width: size * 2, quality: 80 })
            : src;

    if (!isMounted) {
        return <div style={{ width: size, height: size }} className={clsx("rounded-full bg-cream-100 animate-pulse", className)} />
    }

    return (
        <div className="relative inline-block shrink-0" style={{ width: size, height: size }}>
            <div 
                className={clsx(
                    "relative rounded-full overflow-hidden flex items-center justify-center w-full h-full",
                    showFallback ? "bg-burgundy/10 text-burgundy font-bold" : "bg-cream-50",
                    className
                )}
            >
                {showFallback ? (
                    fallbackName ? (
                        <span style={{ fontSize: size * 0.4 }}>
                            {getInitials(fallbackName)}
                        </span>
                    ) : (
                        <User style={{ width: size * 0.6, height: size * 0.6 }} className="text-burgundy/40" />
                    )
                ) : (
                    <Image
                        src={finalSrc || ''}
                        alt={alt}
                        width={size}
                        height={size}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                            console.warn(`[Avatar] Failed to load image: ${finalSrc}. Falling back to initials.`, e)
                            setError(true)
                        }}
                        // Only use unoptimized for HEIC if it's NOT a Supabase URL (already transformed)
                        // or for blob URLs
                        unoptimized={(isHeic && !src?.includes('supabase.co')) || src?.startsWith('blob:')}
                    />
                )}
            </div>

            {/* Live Presence Dot */}
            {isOnline && (
                <span className="absolute bottom-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-forest opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-forest border-2 border-white"></span>
                </span>
            )}
        </div>
    )
}
