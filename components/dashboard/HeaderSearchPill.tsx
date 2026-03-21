'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Calendar, Clock, ChevronDown, Navigation, Loader2, Search, X } from 'lucide-react'
import { reverseGeocode, geocodeAddress } from '@/lib/utils/location'
import { getManilaTodayStr } from '@/lib/timezone'
import { clsx } from 'clsx'
import { useClickAway } from 'react-use'

export default function HeaderSearchPill() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isOpen, setIsOpen] = useState(false)
    const [locationName, setLocationName] = useState<string | null>(null)
    const [isDetecting, setIsDetecting] = useState(false)
    const [addressSearch, setAddressSearch] = useState('')
    const [isGeocoding, setIsGeocoding] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const date = searchParams.get('date')
    const radius = searchParams.get('radius') || '10'

    useClickAway(containerRef, () => setIsOpen(false))

    useEffect(() => {
        if (lat && lng) {
            reverseGeocode(parseFloat(lat), parseFloat(lng)).then(name => {
                if (name) {
                    // Shorten the name for the pill (e.g., just the city)
                    const shortName = name.split(',')[0].trim()
                    setLocationName(shortName)
                }
            })
        } else {
            setLocationName(null)
        }
    }, [lat, lng])

    const handleLocationDetect = () => {
        if (!navigator.geolocation) return alert('Geolocation not supported')
        setIsDetecting(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('lat', pos.coords.latitude.toString())
                params.set('lng', pos.coords.longitude.toString())
                if (!params.has('radius') || params.get('radius') === 'all') params.set('radius', '10')
                router.push(`/customer?${params.toString()}`)
                setIsDetecting(false)
                setIsOpen(false)
            },
            (err) => {
                console.error(err)
                alert('Could not detect location.')
                setIsDetecting(false)
            }
        )
    }

    const handleAddressSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!addressSearch.trim()) return

        setIsGeocoding(true)
        try {
            const coords = await geocodeAddress(addressSearch)
            if (coords) {
                const params = new URLSearchParams(searchParams.toString())
                params.set('lat', coords.lat.toString())
                params.set('lng', coords.lng.toString())
                if (!params.has('radius') || params.get('radius') === 'all') params.set('radius', '10')
                router.push(`/customer?${params.toString()}`)
                setAddressSearch('')
                setIsOpen(false)
            } else {
                alert('Could not find that address.')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsGeocoding(false)
        }
    }

    const handleRadiusChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (val === 'all') params.delete('radius')
        else params.set('radius', val)
        router.push(`/customer?${params.toString()}`)
    }

    const handleDateChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (!val) params.delete('date')
        else params.set('date', val)
        router.push(`/customer?${params.toString()}`)
    }

    return (
        <div ref={containerRef} className="relative flex-1 max-w-xl mx-auto hidden md:block">
            {/* The Pill */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full flex items-center justify-between px-6 py-3 bg-white border rounded-full shadow-tight transition-all duration-300 hover:shadow-card hover:border-burgundy/20 group",
                    isOpen ? "ring-4 ring-forest/5 border-forest/20 shadow-card" : "border-border-grey"
                )}
            >
                <div className="flex items-center gap-4 flex-1 divide-x divide-border-grey">
                    <div className="flex items-center gap-2 pr-4 min-w-[140px]">
                        <MapPin className="w-4 h-4 text-forest" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-burgundy truncate">
                            {locationName || 'Anywhere'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 px-4">
                        <Calendar className="w-4 h-4 text-burgundy/40" />
                        <span className="text-[11px] font-bold text-burgundy/60 whitespace-nowrap">
                            {date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Any Date'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                        <span className="text-[11px] font-bold text-burgundy/60 whitespace-nowrap">
                            {radius === 'all' ? 'Any Distance' : `Within ${radius}km`}
                        </span>
                    </div>
                </div>
                <div className="ml-4 w-10 h-10 rounded-full bg-forest flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Search className="w-4 h-4" />
                </div>
            </button>

            {/* Dropdown Overlay */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-4 p-8 bg-white border border-border-grey rounded-[2rem] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col gap-8">
                        {/* Location Search Row */}
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em] ml-2">Where do you want to practice?</label>
                            <div className="flex items-center gap-3">
                                <form onSubmit={handleAddressSearch} className="relative flex-1 group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-burgundy/30 group-focus-within:text-forest transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="City, Zip, or Area..."
                                        value={addressSearch}
                                        onChange={(e) => setAddressSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-off-white/50 border border-border-grey rounded-2xl text-[13px] font-bold text-burgundy placeholder:text-burgundy/20 focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 transition-all"
                                        autoFocus
                                    />
                                    {isGeocoding && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-5 h-5 text-forest animate-spin" />
                                        </div>
                                    )}
                                </form>
                                <button
                                    onClick={handleLocationDetect}
                                    className="p-4 bg-forest text-white rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
                                    title="Search Near Me"
                                >
                                    {isDetecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Date and Radius Row */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em] ml-2">When</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-burgundy/30 group-focus-within:text-forest transition-colors" />
                                    <input
                                        type="date"
                                        min={getManilaTodayStr()}
                                        value={date || ''}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-off-white/50 border border-border-grey rounded-2xl text-[13px] font-bold text-burgundy focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 transition-all cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em] ml-2">Max Distance</label>
                                <div className="relative group">
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-burgundy/30 pointer-events-none" />
                                    <select
                                        value={radius}
                                        onChange={(e) => handleRadiusChange(e.target.value)}
                                        className="w-full pl-5 pr-12 py-4 bg-off-white/50 border border-border-grey rounded-2xl text-[13px] font-bold text-burgundy appearance-none focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 transition-all cursor-pointer"
                                    >
                                        <option value="all">Any Distance</option>
                                        <option value="5">Within 5km</option>
                                        <option value="10">Within 10km</option>
                                        <option value="20">Within 20km</option>
                                        <option value="50">Within 50km</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
