'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { 
    APIProvider, 
    Map as GoogleMap, 
    AdvancedMarker, 
    Pin, 
    InfoWindow,
    useAdvancedMarkerRef,
    useMap
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
    const map = useMap()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedType, setSelectedType] = useState<'studio' | 'instructor' | null>(null)
    const carouselRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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

    // Sync map when selected item changes
    useEffect(() => {
        if (!map || !selectedId) return

        const item = selectedType === 'studio' 
            ? validStudios.find(s => s.id === selectedId)
            : validInstructors.find(i => i.id === selectedId)

        if (item) {
            const lat = 'lat' in item ? item.lat : item.home_base_lat
            const lng = 'lng' in item ? item.lng : item.home_base_lng
            
            if (lat && lng) {
                map.panTo({ lat, lng })
                map.setZoom(15)
            }
        }
    }, [selectedId, selectedType, map, validStudios, validInstructors])

    // Scroll carousel when selected item changes
    useEffect(() => {
        if (!selectedId) return
        const card = cardRefs.current.get(selectedId)
        if (card && carouselRef.current) {
            // Only scroll if not already in view to avoid bounce
            const rect = card.getBoundingClientRect()
            const containerRect = carouselRef.current.getBoundingClientRect()
            const isVisible = rect.left >= containerRect.left && rect.right <= containerRect.right
            
            if (!isVisible) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
            }
        }
    }, [selectedId])

    const handleScroll = useCallback(() => {
        if (!carouselRef.current) return
        
        const container = carouselRef.current
        const scrollLeft = container.scrollLeft
        const itemWidth = 280 + 16 // card width + gap
        const index = Math.round(scrollLeft / itemWidth)
        
        const items = [
            ...validStudios.map(s => ({ id: s.id, type: 'studio' as const })), 
            ...(!isRentMode ? validInstructors.map(i => ({ id: i.id, type: 'instructor' as const })) : [])
        ]
        
        const activeItem = items[index]
        if (activeItem && activeItem.id !== selectedId) {
            setSelectedId(activeItem.id)
            setSelectedType(activeItem.type)
        }
    }, [selectedId, validStudios, validInstructors, isRentMode])

    return (
        <div className="w-full h-[calc(100vh-200px)] min-h-[500px] rounded-[2.5rem] overflow-hidden border border-burgundy/5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-700">
            <APIProvider apiKey={apiKey}>
                <GoogleMap
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

                </GoogleMap>
            </APIProvider>

            {/* Map Interaction Legend */}
            <div className="absolute top-6 left-6 z-10 hidden sm:flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-burgundy/5 shadow-2xl animate-in slide-in-from-left-4 duration-1000">
                <div className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                <span className="text-[9px] font-black text-burgundy uppercase tracking-[0.2em]">Live Discovery Mode</span>
            </div>

            <div 
                ref={carouselRef}
                onScroll={handleScroll}
                className="absolute bottom-10 left-0 right-0 z-10 flex gap-4 px-6 overflow-x-auto pb-6 cursor-grab active:cursor-grabbing snap-x snap-mandatory scrollbar-hide no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Combined Studios and Instructors for Carousel */}
                {[...validStudios.map(s => ({ ...s, carouselType: 'studio' as const })), 
                  ...(!isRentMode ? validInstructors.map(i => ({ ...i, carouselType: 'instructor' as const })) : [])]
                  .map((item) => (
                    <div 
                        key={item.id}
                        ref={el => { if (el) cardRefs.current.set(item.id, el) }}
                        onClick={() => {
                            setSelectedId(item.id)
                            setSelectedType(item.carouselType)
                        }}
                        className={clsx(
                            "flex-shrink-0 w-[280px] snap-center transition-all duration-500",
                            selectedId === item.id ? "scale-105" : "scale-95 opacity-90"
                        )}
                    >
                        <div className="atelier-card bg-white/95 backdrop-blur-xl overflow-hidden shadow-2xl border border-burgundy/5 group cursor-pointer hover:border-forest/30 transition-all duration-500">
                            {item.carouselType === 'studio' ? (
                                <>
                                    <div className="relative h-32 bg-walking-vinnie/10">
                                        {((item as Studio).banner_url || (item as Studio).logo_url) && (
                                            <Image 
                                                src={(item as Studio).banner_url || (item as Studio).logo_url || ''} 
                                                alt={item.name as string}
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-1000"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg border border-burgundy/5 flex items-center gap-1">
                                            <Star className="w-2.5 h-2.5 text-forest fill-forest" />
                                            <span className="text-[8px] font-black text-burgundy">4.9</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-[10px] font-black text-burgundy uppercase tracking-widest mb-1 truncate">{item.name as string}</h4>
                                        <div className="flex items-center gap-2 mb-4">
                                            <MapPin className="w-2.5 h-2.5 text-burgundy/20" />
                                            <p className="text-[8px] font-bold text-burgundy/40 uppercase tracking-tight truncate">{(item as Studio).location}</p>
                                        </div>
                                        <Link 
                                            href={`/studios/${item.id}`}
                                            className="flex items-center justify-center w-full py-2.5 bg-charcoal text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl group-hover:bg-forest transition-all duration-500 shadow-xl"
                                        >
                                            Book Studio
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="relative h-32 bg-forest/5">
                                        {(item as Instructor).avatar_url && (
                                            <Image 
                                                src={(item as Instructor).avatar_url!} 
                                                alt={(item as Instructor).full_name}
                                                fill
                                                className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-1000"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg border border-burgundy/5 flex items-center gap-1">
                                            <Award className="w-2.5 h-2.5 text-forest" />
                                            <span className="text-[8px] font-black text-burgundy uppercase tracking-widest">Certified</span>
                                        </div>
                                    </div>
                                    <div className="p-4 text-center">
                                        <h4 className="text-[10px] font-black text-burgundy uppercase tracking-widest mb-4 truncate">{(item as Instructor).full_name}</h4>
                                        <Link 
                                            href={`/instructors/${item.id}`}
                                            className="flex items-center justify-center w-full py-2.5 bg-forest text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl group-hover:bg-burgundy transition-all duration-500 shadow-xl"
                                        >
                                            View Instructor
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
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
                "group relative flex flex-col items-center cursor-pointer transition-all duration-500 animate-in zoom-in duration-700",
                isActive ? "scale-125 -translate-y-2" : "hover:scale-110"
            )}>
                {/* Airbnb Style "Information Pill" */}
                <div className={clsx(
                    "px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-2 transition-all duration-500 transform whitespace-nowrap",
                    isActive 
                        ? "bg-charcoal border-charcoal scale-110 translate-z-10" 
                        : "bg-white border-burgundy/10 group-hover:border-forest"
                )}>
                    <span className={clsx(
                        "text-[10px] font-black uppercase tracking-widest",
                        isActive ? "text-white" : "text-burgundy"
                    )}>
                        {studio.name}
                    </span>
                </div>
                
                {/* Simple pointer tip */}
                <div className={clsx(
                    "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-0.5 transition-all duration-500",
                    isActive ? "border-t-charcoal" : "border-t-white group-hover:border-t-forest"
                )} />

                {/* Pulse for active */}
                {isActive && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full bg-charcoal/30 animate-ping -z-10" />
                )}
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
                "group relative flex flex-col items-center cursor-pointer transition-all duration-500 animate-in zoom-in duration-700",
                isActive ? "scale-125 -translate-y-2" : "hover:scale-110"
            )}>
                {/* Airbnb Style "Information Pill" with Avatar */}
                <div className={clsx(
                    "flex items-center gap-2 px-2 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] border-2 transition-all duration-500 transform whitespace-nowrap",
                    isActive 
                        ? "bg-forest border-forest scale-110 translate-z-10" 
                        : "bg-white border-burgundy/10 group-hover:border-forest"
                )}>
                    {instructor.avatar_url && (
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-burgundy/10">
                            <Image 
                                src={instructor.avatar_url} 
                                alt={instructor.full_name} 
                                width={20} 
                                height={20} 
                                className="object-cover"
                            />
                        </div>
                    )}
                    <span className={clsx(
                        "text-[10px] font-black uppercase tracking-widest leading-none",
                        isActive ? "text-white" : "text-burgundy"
                    )}>
                        {instructor.full_name}
                    </span>
                </div>
                
                {/* Simple pointer tip */}
                <div className={clsx(
                    "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-0.5 transition-all duration-500",
                    isActive ? "border-t-forest" : "border-t-white group-hover:border-t-forest"
                )} />

                {/* Pulse for active */}
                {isActive && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 rounded-full bg-forest/30 animate-ping -z-10" />
                )}
            </div>
        </AdvancedMarker>
    )
}
