'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

export default function DiscoveryCardPrefetch({ 
    href, 
    children,
    className
}: { 
    href: string, 
    children: ReactNode,
    className?: string
}) {
    const router = useRouter()

    return (
        <div 
            className={className}
            onMouseEnter={() => {
                router.prefetch(href)
            }}
        >
            {children}
        </div>
    )
}
