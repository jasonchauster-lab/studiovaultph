'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { clsx } from 'clsx'

interface AvatarProps {
    src?: string | null
    alt?: string
    size?: number
    className?: string
    fallbackName?: string
}

export default function Avatar({ 
    src, 
    alt = "User Profile", 
    size = 40, 
    className,
    fallbackName 
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

    if (!isMounted) {
        return <div style={{ width: size, height: size }} className={clsx("rounded-full bg-cream-100 animate-pulse", className)} />
    }

    return (
        <div 
            className={clsx(
                "relative rounded-full overflow-hidden flex items-center justify-center shrink-0",
                showFallback ? "bg-burgundy/10 text-burgundy font-bold" : "bg-cream-50",
                className
            )}
            style={{ width: size, height: size }}
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
                    src={src}
                    alt={alt}
                    width={size}
                    height={size}
                    className="object-cover w-full h-full"
                    onError={() => {
                        console.warn(`[Avatar] Failed to load image: ${src}`)
                        setError(true)
                    }}
                    unoptimized={src?.includes('.heic') || src?.includes('.HEIC')} // Temporary measure if it's still HEIC
                />
            )}
        </div>
    )
}
