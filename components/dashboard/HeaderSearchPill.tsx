'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Calendar, Clock, ChevronDown, Navigation, Loader2, Search, X } from 'lucide-react'
import { reverseGeocode, geocodeAddress, getAutocompleteSuggestions } from '@/lib/utils/location'
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
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [isGeocoding, setIsGeocoding] = useState(false)
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const date = searchParams.get('date')
    const radius = searchParams.get('radius') || '10'

    useClickAway(containerRef, () => {
        setIsOpen(false)
        setShowSuggestions(false)
    })

    // Handle autocomplete suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (addressSearch.length > 2) {
                setLoadingSuggestions(true)
                const results = await getAutocompleteSuggestions(addressSearch)
                setSuggestions(results)
                setShowSuggestions(true)
                setLoadingSuggestions(false)
            } else {
                setSuggestions([])
                setShowSuggestions(false)
                setLoadingSuggestions(false)
            }
        }

        const debounceTimer = setTimeout(fetchSuggestions, 300)
        return () => clearTimeout(debounceTimer)
    }, [addressSearch])

    useEffect(() => {
        if (lat && lng) {
            reverseGeocode(parseFloat(lat), parseFloat(lng)).then(res => {
                if (res) {
                    setLocationName(res.short)
                    // Also populate the search input if it's empty
                    if (!addressSearch) setAddressSearch(res.full)
                }
            })
        } else {
            setLocationName(null)
            setAddressSearch('')
        }
    }, [lat, lng])

    const handleLocationDetect = () => {
        if (!navigator.geolocation) return alert('Geolocation not supported')
        setIsDetecting(true)
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const params = new URLSearchParams(searchParams.toString())
                const { latitude, longitude } = pos.coords
                params.set('lat', latitude.toString())
                params.set('lng', longitude.toString())
                if (!params.has('radius') || params.get('radius') === 'all') params.set('radius', '10')
                
                const res = await reverseGeocode(latitude, longitude)
                if (res) {
                    setAddressSearch(res.full)
                    setLocationName(res.short)
                }

                router.push(`/customer?${params.toString()}`)
                setIsDetecting(false)
                // Remove automatic closure to allow date/radius selection
                // setTimeout(() => setIsOpen(false), 800)
            },
            (err) => {
                console.error(err)
                alert('Could not detect location.')
                setIsDetecting(false)
            }
        )
    }

    const handleSuggestionSelect = async (suggestion: string) => {
        setAddressSearch(suggestion)
        setShowSuggestions(false)
        
        setIsGeocoding(true)
        const result = await geocodeAddress(suggestion)
        if (result) {
            const params = new URLSearchParams(searchParams.toString())
            params.set('lat', result.lat.toString())
            params.set('lng', result.lng.toString())
            if (!params.has('radius') || params.get('radius') === 'all') params.set('radius', '10')
            setLocationName(result.short || null)
            router.push(`/customer?${params.toString()}`)
            // setIsOpen(false)
        }
        setIsGeocoding(false)
    }

    const handleAddressSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!addressSearch.trim()) return

        setIsGeocoding(true)
        try {
            const result = await geocodeAddress(addressSearch)
            if (result) {
                const params = new URLSearchParams(searchParams.toString())
                params.set('lat', result.lat.toString())
                params.set('lng', result.lng.toString())
                if (!params.has('radius') || params.get('radius') === 'all') params.set('radius', '10')
                setLocationName(result.short || null)
                router.push(`/customer?${params.toString()}`)
                setAddressSearch('')
                // setIsOpen(false)
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
                        <div className="flex flex-col gap-3 relative">
                            <label className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em] ml-2">Where do you want to practice?</label>
                            <div className="flex items-center gap-3">
                                <form onSubmit={handleAddressSearch} className="relative flex-1 group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-burgundy/30 group-focus-within:text-forest transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="City, Zip, or Area..."
                                        value={addressSearch}
                                        onChange={(e) => setAddressSearch(e.target.value)}
                                        onFocus={() => addressSearch.length > 2 && setShowSuggestions(true)}
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
                                    className={clsx(
                                        "p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-3",
                                        isDetecting ? "bg-forest/50 text-white" : "bg-forest text-white hover:brightness-110"
                                    )}
                                    title="Search Near Me"
                                >
                                    {isDetecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                                    <span className="text-[10px] font-black uppercase tracking-wider hidden lg:block">Near Me</span>
                                </button>
                            </div>

                            {/* Autocomplete Suggestions */}
                            {showSuggestions && (
                                <div className="relative mt-2 bg-white border border-border-grey rounded-2xl shadow-xl z-10 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={handleLocationDetect}
                                        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-forest/5 text-left border-b border-border-grey/50 group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-forest/5 flex items-center justify-center group-hover:bg-forest group-hover:text-white transition-colors">
                                            {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-burgundy group-hover:text-forest">Use device location</span>
                                            <span className="text-[9px] font-bold text-burgundy/40 uppercase tracking-widest">Allow access to find studios near you</span>
                                        </div>
                                    </button>
                                    
                                    {loadingSuggestions ? (
                                        <div className="px-6 py-8 flex items-center justify-center gap-3 text-burgundy/40">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span className="text-[11px] font-bold uppercase tracking-widest">Finding addresses...</span>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        suggestions.map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSuggestionSelect(suggestion)}
                                                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-off-white text-left transition-colors border-b border-border-grey/30 last:border-0"
                                            >
                                                <MapPin className="w-4 h-4 text-burgundy/20" />
                                                <span className="text-[12px] font-bold text-burgundy truncate">{suggestion}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-6 py-8 flex flex-col items-center justify-center gap-2 text-burgundy/40 italic">
                                            <p className="text-[11px] font-bold uppercase tracking-widest">No addresses found</p>
                                            <p className="text-[9px] not-italic">Try a different city or area</p>
                                        </div>
                                    )}
                                </div>
                            )}
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
