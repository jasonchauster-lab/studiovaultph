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
import clsx from 'clsx'

interface Studio {
    id: string
    name: string
    lat: number
    lng: number
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
    const selectedStudio = useMemo(() => studios.find(s => s.id === selectedId), [studios, selectedId])

    const mapCenter = useMemo(() => {
        if (studios.length === 0) return MANILA_CENTER
        const lat = studios.reduce((acc, s) => acc + (s.lat || 0), 0) / studios.length
        const lng = studios.reduce((acc, s) => acc + (s.lng || 0), 0) / studios.length
        return { lat, lng }
    }, [studios])

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
                >
                    {studios.map((studio) => (
                        <StudioMarker 
                            key={studio.id} 
                            studio={studio} 
                            onClick={() => setSelectedId(studio.id)}
                            isActive={selectedId === studio.id}
                        />
                    ))}

                    {selectedStudio && (
                        <InfoWindow
                            position={{ lat: selectedStudio.lat, lng: selectedStudio.lng }}
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
            position={{ lat: studio.lat, lng: studio.lng }}
            onClick={onClick}
            zIndex={isActive ? 100 : 1}
        >
            <div className={clsx(
                "group relative cursor-pointer transition-all duration-500",
                isActive ? "scale-125 -translate-y-2" : "hover:scale-110"
            )}>
                <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-2xl transform transition-all duration-500",
                    isActive ? "bg-forest border-white rotate-[15deg]" : "bg-white border-burgundy/10 group-hover:border-forest/40"
                )}>
                    <Home className={clsx(
                        "w-3 h-3 transition-colors",
                        isActive ? "text-white" : "text-burgundy group-hover:text-forest"
                    )} />
                </div>
            </div>
        </AdvancedMarker>
    )
}
