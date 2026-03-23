'use client'

import { useEffect, useState } from 'react'
import DiscoveryMap from './DiscoveryMap'
import MapToggle from './MapToggle'
import DiscoveryMapSkeleton from './DiscoveryMapSkeleton'
import { clsx } from 'clsx'

interface DiscoveryViewManagerProps {
    studios: any[]
    instructors: any[]
    slots: any[]
    apiKey: string
    listView: React.ReactNode
    isRentMode?: boolean
}

export default function DiscoveryViewManager({ 
    studios, 
    instructors, 
    slots, 
    apiKey,
    listView,
    isRentMode = false
}: DiscoveryViewManagerProps) {
    const [view, setView] = useState<'list' | 'map'>('list')
    const [isMapLoading, setIsMapLoading] = useState(true)

    useEffect(() => {
        if (view === 'map') {
            const timer = setTimeout(() => setIsMapLoading(false), 800)
            return () => clearTimeout(timer)
        } else {
            setIsMapLoading(true)
        }
    }, [view])

    return (
        <div className="relative">
            {/* View Container */}
            <div className="relative min-h-[600px]">
                {/* List View */}
                <div className={clsx(
                    "transition-all duration-700 ease-in-out",
                    view === 'list' 
                        ? "opacity-100 translate-y-0 pointer-events-auto" 
                        : "opacity-0 translate-y-12 pointer-events-none absolute inset-0"
                )}>
                    {listView}
                </div>

                {/* Map View */}
                <div className={clsx(
                    "transition-all duration-700 ease-in-out",
                    view === 'map' 
                        ? "opacity-100 translate-y-0 pointer-events-auto block" 
                        : "opacity-0 translate-y-12 pointer-events-none absolute inset-0"
                )}>
                    {view === 'map' && (
                        <>
                            {isMapLoading ? (
                                <DiscoveryMapSkeleton />
                            ) : (
                                <DiscoveryMap 
                                    studios={studios} 
                                    instructors={instructors}
                                    apiKey={apiKey} 
                                    isRentMode={isRentMode}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Toggle Switch */}
            <MapToggle view={view} onToggle={setView} />
        </div>
    )
}
