'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
    APIProvider, 
    Map, 
    AdvancedMarker, 
    Pin, 
    InfoWindow,
    useAdvancedMarkerRef
} from '@vis.gl/react-google-maps'
import { MapPin, Navigation, Star, Award, Home, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'
import { cleanMapStyle } from '@/constants/mapStyles'

interface Studio {
    id: string
    name: string
    lat: number | null
    lng: number | null
    location: string
    logo_url?: string
    banner_url?: string
    description?: string
}

interface Instructor {
    id: string
    full_name: string
    home_base_lat: number | null
    home_base_lng: number | null
    avatar_url?: string
    is_online?: boolean
}

interface DiscoveryMapProps {
    studios: Studio[]
    instructors?: Instructor[]
    apiKey: string
    isRentMode?: boolean
}

const MANILA_CENTER = { lat: 14.5995, lng: 120.9842 }

export default function DiscoveryMap({ studios, instructors = [], apiKey, isRentMode = false }: DiscoveryMapProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<'studio' | 'instructor' | null>(null)

    // Filter out studios/instructors with missing coordinates to prevent map crashes
    const validStudios = useMemo(() => studios.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number'), [studios])
    const validInstructors = useMemo(() => instructors.filter(i => typeof i.home_base_lat === 'number' && typeof i.home_base_lng === 'number'), [instructors])
    
    const selectedStudio = useMemo(() => validStudios.find(s => s.id === selectedId), [validStudios, selectedId])
    const selectedInstructor = useMemo(() => validInstructors.find(i => i.id === selectedId), [validInstructors, selectedId])

    const mapCenter = useMemo(() => {
        if (validStudios.length === 0) return MANILA_CENTER
        const lat = validStudios.reduce((acc, s) => acc + (s.lat || 0), 0) / validStudios.length
        const lng = validStudios.reduce((acc, s) => acc + (s.lng || 0), 0) / validStudios.length
        return { lat, lng }
    }, [validStudios])

    return (
        <div className="w-full h-[calc(100vh-200px)] min-h-[500px] rounded-[2.5rem] overflow-hidden border border-burgundy/5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-700">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={mapCenter}
                    defaultZoom={13}
                    mapId="7cfbdb934b719a4f6fb584f0" // Atelier Discovery Map ID
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
                            onClick={() => {
                                setSelectedId(studio.id)
                                setSelectedType('studio')
                            }}
                            isActive={selectedId === studio.id && selectedType === 'studio'}
                        />
                    ))}

                    {!isRentMode && validInstructors.map((instructor) => (
                        <InstructorMarker 
                            key={instructor.id} 
                            instructor={instructor} 
                            onClick={() => {
                                setSelectedId(instructor.id)
                                setSelectedType('instructor')
                            }}
                            isActive={selectedId === instructor.id && selectedType === 'instructor'}
                        />
                    ))}

                    {selectedStudio && selectedType === 'studio' && (
                        <InfoWindow
                            position={{ lat: selectedStudio.lat!, lng: selectedStudio.lng! }}
                            onCloseClick={() => {
                                setSelectedId(null)
                                setSelectedType(null)
                            }}
                            headerDisabled
                            className="p-0 border-none bg-transparent"
                        >
                            <div className="w-64 atelier-card overflow-hidden shadow-2xl ring-1 ring-burgundy/10 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="relative h-24 bg-walking-vinnie/10">
                                    {(selectedStudio.banner_url || selectedStudio.logo_url) && (
                                        <Image 
                                            src={selectedStudio.banner_url || selectedStudio.logo_url || ''} 
                                            alt={selectedStudio.name}
                                            fill
                                            className="object-cover"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                                <div className="p-4 bg-white/95 backdrop-blur-md">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h4 className="text-[10px] font-black text-burgundy uppercase tracking-widest leading-tight">{selectedStudio.name}</h4>
                                        <div className="flex items-center gap-1 bg-[#F5F2EB] px-1.5 py-0.5 rounded-md border border-burgundy/5 shrink-0">
                                            <Star className="w-2.5 h-2.5 text-forest fill-forest" />
                                            <span className="text-[8px] font-bold text-burgundy">4.9</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin className="w-2.5 h-2.5 text-burgundy/20" />
                                        <p className="text-[8px] font-bold text-burgundy/40 uppercase tracking-tight truncate">{selectedStudio.location}</p>
                                    </div>
                                    
                                    <Link 
                                        href={`/studios/${selectedStudio.id}`}
                                        className="flex items-center justify-center w-full py-2.5 bg-[#2C2121] text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-forest transition-all duration-500 shadow-xl active:scale-95"
                                    >
                                        View Full Profile
                                    </Link>
                                </div>
                            </div>
                        </InfoWindow>
                    )}

                    {selectedInstructor && selectedType === 'instructor' && (
                        <InfoWindow
                            position={{ lat: selectedInstructor.home_base_lat!, lng: selectedInstructor.home_base_lng! }}
                            onCloseClick={() => {
                                setSelectedId(null)
                                setSelectedType(null)
                            }}
                            headerDisabled
                            className="p-0 border-none bg-transparent"
                        >
                            <div className="w-64 atelier-card overflow-hidden shadow-2xl ring-1 ring-burgundy/10 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="relative h-24 bg-forest/5">
                                    {selectedInstructor.avatar_url && (
                                        <Image 
                                            src={selectedInstructor.avatar_url} 
                                            alt={selectedInstructor.full_name}
                                            fill
                                            className="object-cover opacity-60"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                                <div className="p-4 bg-white/95 backdrop-blur-md text-center">
                                    <h4 className="text-[10px] font-black text-burgundy uppercase tracking-widest leading-tight mb-4">{selectedInstructor.full_name}</h4>
                                    
                                    <Link 
                                        href={`/instructors/${selectedInstructor.id}`}
                                        className="flex items-center justify-center w-full py-2.5 bg-forest text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-burgundy transition-all duration-500 shadow-xl active:scale-95"
                                    >
                                        View Full Profile
                                    </Link>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>

            {/* Map Interaction Legend */}
            <div className="absolute top-6 left-6 z-10 hidden sm:flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-burgundy/5 shadow-2xl animate-in slide-in-from-left-4 duration-1000">
                <div className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                <span className="text-[9px] font-black text-burgundy uppercase tracking-[0.2em]">Live Discovery Mode</span>
            </div>
        </div>
    )
}

function StudioMarker({ studio, onClick, isActive }: { studio: Studio, onClick: () => void, isActive: boolean }) {
    const [markerRef, marker] = useAdvancedMarkerRef();

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

                {/* Name Label (Better visibility) */}
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

function InstructorMarker({ instructor, onClick, isActive }: { instructor: Instructor, onClick: () => void, isActive: boolean }) {
    const [markerRef, marker] = useAdvancedMarkerRef();

    return (
        <AdvancedMarker
            ref={markerRef}
            position={{ lat: instructor.home_base_lat!, lng: instructor.home_base_lng! }}
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
                    {/* Circle Main Body with Avatar */}
                    <div className={clsx(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-[0_0_25px_rgba(0,0,0,0.3)] transition-all duration-500 transform overflow-hidden bg-white",
                        isActive 
                            ? "border-forest rotate-[-12deg] scale-110" 
                            : "border-burgundy/40 group-hover:border-forest"
                    )}>
                        {instructor.avatar_url ? (
                            <Image 
                                src={instructor.avatar_url} 
                                alt={instructor.full_name} 
                                width={48} 
                                height={48} 
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <User className={clsx(
                                "w-6 h-6 transition-colors",
                                isActive ? "text-forest" : "text-burgundy"
                            )} />
                        )}
                    </div>
                    {/* Tip/Triangular point */}
                    <div className={clsx(
                        "w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] -mt-1 transition-all duration-500",
                        isActive ? "border-t-forest" : "border-t-burgundy group-hover:border-t-forest"
                    )} />
                </div>
                
                {/* Pulse Effect */}
                {isActive && (
                    <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-burgundy/20 animate-ping -z-10" />
                )}

                {/* Name Label */}
                <div className={clsx(
                    "absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-full shadow-2xl border border-burgundy/5 whitespace-nowrap opacity-0 transition-all duration-500 pointer-events-none group-hover:opacity-100 group-hover:translate-y-1 block",
                    isActive && "opacity-100 bg-forest border-forest translate-y-1"
                )}>
                    <span className={clsx(
                        "text-[9px] font-black uppercase tracking-[0.2em]",
                        isActive ? "text-white" : "text-burgundy"
                    )}>{instructor.full_name}</span>
                </div>
            </div>
        </AdvancedMarker>
    )
}
