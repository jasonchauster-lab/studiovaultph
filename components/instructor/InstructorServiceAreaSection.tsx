'use client'

import { useState } from 'react'
import { MapPin, Navigation, Loader2, Save, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { geocodeAddress } from '@/lib/utils/location'
import { updateServiceArea } from '@/app/(dashboard)/instructor/profile/actions'
import { clsx } from 'clsx'

interface ServiceAreaProps {
    profile: any
}

export default function InstructorServiceAreaSection({ profile }: ServiceAreaProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [isGeocoding, setIsGeocoding] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    
    const [offersHome, setOffersHome] = useState(profile?.offers_home_sessions || false)
    const [address, setAddress] = useState(profile?.home_base_address || '')
    const [lat, setLat] = useState<number | null>(profile?.home_base_lat || null)
    const [lng, setLng] = useState<number | null>(profile?.home_base_lng || null)
    const [radius, setRadius] = useState(profile?.max_travel_km || 10)

    const handleAddressBlur = async () => {
        if (!address.trim() || address === profile?.home_base_address) return
        
        setIsGeocoding(true)
        try {
            const coords = await geocodeAddress(address)
            if (coords) {
                setLat(coords.lat)
                setLng(coords.lng)
            } else {
                setMessage({ type: 'error', text: 'Could not verify this address. Please be more specific.' })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsGeocoding(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        setMessage(null)

        try {
            const result = await updateServiceArea({
                offers_home_sessions: offersHome,
                home_base_address: address,
                home_base_lat: lat,
                home_base_lng: lng,
                max_travel_km: radius
            })

            if (result.success) {
                setMessage({ type: 'success', text: 'Service area updated successfully!' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update settings.' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'A server error occurred.' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section className="glass-card p-8 sm:p-16 relative overflow-hidden group/service">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[120px] pointer-events-none group-hover:bg-forest/10 transition-colors duration-1000" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-5 mb-12 sm:mb-16 border-b border-white/60 pb-8 sm:pb-12">
                    <div className="p-4 bg-white/60 rounded-2xl border border-white/60 shadow-sm transition-transform duration-700 group-hover/service:-rotate-3">
                        <Navigation className="w-6 h-6 text-forest shrink-0" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-4xl font-serif text-charcoal tracking-tighter">Service Area</h2>
                        <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-[0.3em] mt-2">Define your territory for Home Sessions</p>
                    </div>
                </div>

                <div className="space-y-10 max-w-2xl">
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-6 bg-white/40 border border-white/60 rounded-3xl shadow-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-black text-charcoal uppercase tracking-widest">Offer Home Sessions</span>
                            <span className="text-[10px] text-charcoal/40 font-medium">Allow clients to book you at their residence.</span>
                        </div>
                        <button
                            onClick={() => setOffersHome(!offersHome)}
                            className={clsx(
                                "w-14 h-8 rounded-full p-1 transition-all duration-300 relative",
                                offersHome ? "bg-forest" : "bg-charcoal/10"
                            )}
                        >
                            <div className={clsx(
                                "w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300",
                                offersHome ? "translate-x-6" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    {offersHome && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                            {/* Home Base */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] ml-2">Home Base Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/20 group-focus-within:text-forest transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Enter your starting point (Street, City, Zip)..."
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        onBlur={handleAddressBlur}
                                        className="w-full pl-14 pr-6 py-5 bg-white/60 border border-white/60 rounded-3xl text-[13px] font-bold text-charcoal placeholder:text-charcoal/20 focus:outline-none focus:ring-4 focus:ring-forest/5 focus:border-forest/20 shadow-sm transition-all"
                                    />
                                    {isGeocoding && (
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-5 h-5 text-forest animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-start gap-2 ml-2">
                                    <Info className="w-3.5 h-3.5 text-forest mt-0.5" />
                                    <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-wider italic">
                                        {lat && lng ? 'Address Verified ✓' : 'Enter an address to calculate travel distance'}
                                    </p>
                                </div>
                            </div>

                            {/* Travel Radius */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between ml-2">
                                    <label className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">Max Travel Radius</label>
                                    <span className="text-[11px] font-black text-forest uppercase tracking-widest">{radius}km</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    step="1"
                                    value={radius}
                                    onChange={(e) => setRadius(parseInt(e.target.value))}
                                    className="w-full h-2 bg-charcoal/10 rounded-full appearance-none cursor-pointer accent-forest"
                                />
                                <div className="flex justify-between text-[9px] font-bold text-charcoal/20 uppercase tracking-widest mt-1">
                                    <span>1km</span>
                                    <span>25km</span>
                                    <span>50km</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {message && (
                        <div className={clsx(
                            "p-5 rounded-2xl flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest animate-in zoom-in-95 duration-300",
                            message.type === 'success' ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isGeocoding}
                        className="w-full sm:w-auto px-10 py-5 bg-charcoal text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-forest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
                        )}
                        Update Service Area
                    </button>
                </div>
            </div>
        </section>
    );
}
