'use client'

import { useState, useMemo } from 'react'
import { 
    APIProvider, 
    Map, 
    AdvancedMarker, 
    InfoWindow,
    useAdvancedMarkerRef
} from '@vis.gl/react-google-maps'
import { MapPin, Home, Star, Check } from 'lucide-react'
import Image from 'next/image'
import { cleanMapStyle } from '@/constants/mapStyles'
import clsx from 'clsx'

interface Studio {
    id: string
    name: string
    lat: number | null
    lng: number | null
    location: string
    logo_url?: string
    banner_url?: string
}

interface StudioSelectionMapProps {
    studios: Studio[]
    onSelect: (studio: Studio) => void
    apiKey: string
}

const MANILA_CENTER = { lat: 14.5995, lng: 120.9842 }

export default function StudioSelectionMap({ studios, onSelect, apiKey }: StudioSelectionMapProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // Filter out studios with missing coordinates to prevent map crashes
    const validStudios = useMemo(() => studios.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number'), [studios])
    const selectedStudio = useMemo(() => validStudios.find(s => s.id === selectedId), [validStudios, selectedId])

    const mapCenter = useMemo(() => {
        if (validStudios.length === 0) return MANILA_CENTER
        const lat = validStudios.reduce((acc, s) => acc + (s.lat || 0), 0) / validStudios.length
        const lng = validStudios.reduce((acc, s) => acc + (s.lng || 0), 0) / validStudios.length
        return { lat, lng }
    }, [validStudios])

    return (
        <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-burgundy/5 shadow-inner relative">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={mapCenter}
                    defaultZoom={12}
                    mapId="7cfbdb934b719a4f6fb584f0"
                    disableDefaultUI={true}
                    zoomControl={true}
                    gestureHandling={'greedy'}
                    className="w-full h-full"
                    styles={cleanMapStyle}
                >
                    {validStudios.map((studio) => (
                        <StudioMarker 
                            key={studio.id} 
                            studio={studio} 
                            onClick={() => setSelectedId(studio.id)}
                            isActive={selectedId === studio.id}
                        />
                    ))}

                    {selectedStudio && (
                        <InfoWindow
                            position={{ lat: selectedStudio.lat!, lng: selectedStudio.lng! }}
                            onCloseClick={() => setSelectedId(null)}
                            headerDisabled
                            className="p-0 border-none bg-transparent"
                        >
                            <div className="w-56 atelier-card overflow-hidden shadow-2xl ring-1 ring-burgundy/10 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="p-4 bg-white/95 backdrop-blur-md">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h4 className="text-[10px] font-black text-burgundy uppercase tracking-widest leading-tight">{selectedStudio.name}</h4>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin className="w-2.5 h-2.5 text-burgundy/20" />
                                        <p className="text-[8px] font-bold text-burgundy/40 uppercase tracking-tight truncate">{selectedStudio.location}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => onSelect(selectedStudio)}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-forest text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl hover:brightness-110 transition-all shadow-xl active:scale-95"
                                    >
                                        <Check className="w-3 h-3" /> Select Studio
                                    </button>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>
        </div>
    )
}

function StudioMarker({ studio, onClick, isActive }: { studio: Studio, onClick: () => void, isActive: boolean }) {
    const [markerRef] = useAdvancedMarkerRef();

    return (
        <AdvancedMarker
            ref={markerRef}
            position={{ lat: studio.lat!, lng: studio.lng! }}
            onClick={onClick}
            zIndex={isActive ? 100 : 1}
        >
            <div className={clsx(
                "group relative flex flex-col items-center cursor-pointer transition-all duration-500",
                isActive ? "scale-140 -translate-y-4" : "hover:scale-125 -translate-y-2"
            )}>
                {/* Custom Marker Pin Label */}
                <div className={clsx(
                    "flex flex-col items-center",
                    isActive ? "opacity-100" : "opacity-90 group-hover:opacity-100"
                )}>
                    {/* Circle Main Body */}
                    <div className={clsx(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-[0_0_25px_rgba(0,0,0,0.3)] transition-all duration-500 transform",
                        isActive 
                            ? "bg-forest border-white rotate-[12deg] scale-110" 
                            : "bg-burgundy border-white/40 group-hover:bg-forest"
                    )}>
                        <Home className="w-5 h-5 text-white" />
                    </div>
                    {/* Tip/Triangular point */}
                    <div className={clsx(
                        "w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] -mt-1 transition-all duration-500",
                        isActive ? "border-t-forest" : "border-t-burgundy group-hover:border-t-forest"
                    )} />
                </div>
                
                {/* Pulse Effect */}
                {isActive && (
                    <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-forest/30 animate-ping -z-10" />
                )}

                {/* Name Label (Visible on hover/active) */}
                <div className={clsx(
                    "absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-full shadow-2xl border border-burgundy/5 whitespace-nowrap opacity-0 transition-all duration-500 pointer-events-none group-hover:opacity-100 group-hover:translate-y-1 block",
                    isActive && "opacity-100 bg-burgundy border-burgundy translate-y-1"
                )}>
                    <span className={clsx(
                        "text-[9px] font-black uppercase tracking-[0.2em]",
                        isActive ? "text-white" : "text-burgundy"
                    )}>{studio.name}</span>
                </div>
            </div>
        </AdvancedMarker>
    )
}
