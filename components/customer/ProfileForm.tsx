'use client'

import { useState, useRef } from 'react'
import { updateProfile } from '@/app/(dashboard)/customer/profile/actions'
import { 
    Loader2, 
    Camera, 
    Save, 
    User, 
    FileText, 
    MapPin, 
    Search, 
    Navigation 
} from 'lucide-react'
import { isValidPhone, isValidEmail, phoneErrorMessage } from '@/lib/validation'
import Image from 'next/image'
import WaiverUpload from '@/components/customer/WaiverUpload'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import { clsx } from 'clsx'
import { geocodeAddress, getAutocompleteSuggestions, reverseGeocode } from '@/lib/utils/location'
import Avatar from '@/components/shared/Avatar'
import ImageCropper from '@/components/shared/ImageCropper'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { useDebounce } from 'react-use'

export default function ProfileForm({ profile }: { profile: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>(profile?.teaching_equipment || [])
    const [selectedMedicalConditions, setSelectedMedicalConditions] = useState<string[]>(profile?.medical_conditions || [])

    // Home Session State
    const [offersHomeSessions, setOffersHomeSessions] = useState(profile?.offers_home_sessions || false)
    const [homeBaseAddress, setHomeBaseAddress] = useState(profile?.home_base_address || '')
    const [homeBaseLat, setHomeBaseLat] = useState(profile?.home_base_lat || '')
    const [homeBaseLng, setHomeBaseLng] = useState(profile?.home_base_lng || '')
    const [maxTravelKm, setMaxTravelKm] = useState(profile?.max_travel_km || 10)

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [geocoding, setGeocoding] = useState(false)
    const [detectingLocation, setDetectingLocation] = useState(false)
    const [noResults, setNoResults] = useState(false)
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const { detectLocation } = useGeolocation()

    // State for avatar preview and file
    const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || '/default-avatar.svg')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(profile?.banner_url || null)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const bannerInputRef = useRef<HTMLInputElement>(null)

    // Cropper State
    const [cropperConfig, setCropperConfig] = useState<{
        isOpen: boolean;
        image: string;
        aspectRatio: number;
        onCrop: (file: File) => void;
        title: string;
    } | null>(null)

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const processedFile = await normalizeImageFile(file)
                const url = URL.createObjectURL(processedFile)
                
                setCropperConfig({
                    isOpen: true,
                    image: url,
                    aspectRatio: 1,
                    title: 'Crop Profile Picture',
                    onCrop: (croppedFile) => {
                        setAvatarFile(croppedFile)
                        setPreviewUrl(URL.createObjectURL(croppedFile))
                    }
                })
            } catch (err) {
                console.error('Avatar processing failed', err)
                setMessage('Failed to process image format.')
            }
        }
    }

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const processedFile = await normalizeImageFile(file)
                const url = URL.createObjectURL(processedFile)

                setCropperConfig({
                    isOpen: true,
                    image: url,
                    aspectRatio: 21 / 9, // Wide banner
                    title: 'Crop Profile Banner',
                    onCrop: (croppedFile) => {
                        setBannerFile(croppedFile)
                        setBannerPreviewUrl(URL.createObjectURL(croppedFile))
                    }
                })
            } catch (err) {
                console.error('Banner processing failed', err)
                setMessage('Failed to process banner image.')
            }
        }
    }

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        const emergencyContactName = formData.get('emergencyContactName') as string
        const emergencyContactPhone = formData.get('emergencyContactPhone') as string

        if (contactNumber && !isValidPhone(contactNumber)) {
            setMessage(phoneErrorMessage)
            return
        }

        // For emergency contact phone, we check if it contains SOME digits if provided
        if (emergencyContactPhone && !/\d{7,}/.test(emergencyContactPhone)) {
            setMessage('Please include a valid phone number for your emergency contact.')
            return
        }

        if (!emergencyContactName && emergencyContactPhone) {
            setMessage('Please include a name for your emergency contact.')
            return
        }

        // Overwrite avatar if we have a processed one
        if (avatarFile) {
            formData.set('avatar', avatarFile)
        }

        // Overwrite banner if we have a processed one
        if (bannerFile) {
            formData.set('banner', bannerFile)
        }

        setIsLoading(true)
        setMessage(null)

        const result = await updateProfile(formData)

        if (result.success) {
            if (result.emailChangePending) {
                setMessage('Profile updated. A verification email has been sent to your new email address. Please click the link in that email to confirm the change.')
            } else {
                setMessage('Profile updated successfully!')
            }
        } else {
            setMessage('Failed to update profile. ' + (result.error || ''))
        }

        setIsLoading(false)
    }
    const handleAddressSearch = (val: string) => {
        setHomeBaseAddress(val)
        // Update debounced search term
        setDebouncedSearch(val)
    }

    useDebounce(
        async () => {
            if (debouncedSearch.length >= 3) {
                setIsSearching(true)
                setNoResults(false)
                const results = await getAutocompleteSuggestions(debouncedSearch)
                setSuggestions(results)
                setShowSuggestions(true)
                setNoResults(results.length === 0)
                setIsSearching(false)
            } else {
                setSuggestions([])
                setShowSuggestions(false)
                setNoResults(false)
            }
        },
        300,
        [debouncedSearch]
    )

    const handleSuggestionSelect = async (suggestion: string) => {
        setHomeBaseAddress(suggestion)
        setShowSuggestions(false)
        setNoResults(false)
        setGeocoding(true)
        const res = await geocodeAddress(suggestion)
        if (res) {
            setHomeBaseLat(res.lat.toString())
            setHomeBaseLng(res.lng.toString())
            setHomeBaseAddress(res.full || suggestion)
        }
        setGeocoding(false)
    }

    const handleDetectLocation = async () => {
        setDetectingLocation(true)
        try {
            const res = await detectLocation()
            if (res) {
                setHomeBaseAddress(res.full)
                setHomeBaseLat(res.lat.toString())
                setHomeBaseLng(res.lng.toString())
            }
        } catch (error) {
            console.error("Geolocation error:", error)
            alert("Failed to detect location. Please enter it manually.")
        } finally {
            setDetectingLocation(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8">

            {/* Profile Header Card: Banner & Avatar */}
            <div className="atelier-card !p-0 overflow-hidden border-none shadow-tight bg-white/40 backdrop-blur-sm">
                {/* Banner Upload (Instructors Only) */}
                {profile?.role === 'instructor' && (
                    <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] cursor-pointer group transition-all"
                        onClick={() => bannerInputRef.current?.click()}>
                        {bannerPreviewUrl ? (
                            <Image
                                src={getSupabaseAssetUrl(bannerPreviewUrl, 'avatars') || '/default-banner.svg'}
                                alt="Profile Banner"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                unoptimized={bannerPreviewUrl.startsWith('blob:')}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-charcoal-300 bg-cream-50">
                                <Camera className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Upload Banner Photo</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                <Camera className="w-6 h-6 text-charcoal-900" />
                            </div>
                        </div>
                        <input type="file" ref={bannerInputRef} className="hidden" onChange={handleBannerChange} accept="image/*,.heic,.heif" />
                    </div>
                )}
                
                <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8">
                    <div className="relative group cursor-pointer transition-transform duration-300 hover:scale-[1.02]" 
                        onClick={() => fileInputRef.current?.click()}>
                        <div className="w-36 h-36 rounded-full overflow-hidden border-[6px] border-white shadow-xl bg-cream-50 flex items-center justify-center relative z-10 transition-all duration-300 group-hover:shadow-2xl">
                            <Avatar src={previewUrl} fallbackName={profile?.fullName || profile?.full_name} size={144} className="w-full h-full transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                                <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                    <Camera className="w-6 h-6 text-charcoal-900" />
                                </div>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleAvatarChange} accept="image/*,.heic,.heif" />
                    </div>

                    <div className="text-center sm:text-left space-y-2">
                        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">Profile Identity</h3>
                        <p className="text-[11px] font-medium text-charcoal-500 max-w-xs leading-relaxed uppercase tracking-wider">
                            Manage your professional appearance across the platform.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Form Content Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Details Card */}
                <div className="atelier-card flex flex-col">
                    <div className="flex items-center gap-3 border-b border-cream-100 pb-4 mb-8">
                        <User className="w-5 h-5 text-burgundy" />
                        <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Personal Details</h3>
                    </div>
                    <div className="space-y-6 flex-1">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                            <input type="text" name="fullName" defaultValue={profile?.fullName || profile?.full_name || ''} required className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                            <input type="email" name="email" defaultValue={profile?.email || ''} required className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" />
                            {profile?.new_email && <p className="mt-2 text-[10px] text-gold font-bold uppercase tracking-widest animate-pulse">Pending verification: {profile.new_email}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Instagram Handle</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-charcoal-400 font-bold text-sm">@</span>
                                <input type="text" name="instagram" defaultValue={profile?.instagram_handle || ''} className="w-full pl-10 pr-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" placeholder="username" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact & Safety Card */}
                <div className="atelier-card flex flex-col">
                    <div className="flex items-center gap-3 border-b border-cream-100 pb-4 mb-8">
                        <FileText className="w-5 h-5 text-burgundy" />
                        <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Contact & Safety</h3>
                    </div>
                    <div className="space-y-6 flex-1">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                            <input type="tel" name="contactNumber" defaultValue={profile?.contact_number || ''} placeholder="09XXXXXXXXX" maxLength={13} className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Emergency Name</label>
                            <input type="text" name="emergencyContactName" defaultValue={profile?.emergency_contact_name || profile?.emergency_contact || ''} placeholder="Contact Name" className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Emergency Phone</label>
                            <input type="tel" name="emergencyContactPhone" defaultValue={profile?.emergency_contact_phone || ''} placeholder="09XXXXXXXXX" className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" />
                        </div>
                    </div>
                </div>

                {/* Philosophy & DOB Card */}
                <div className="lg:col-span-2 atelier-card">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="md:col-span-1 space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">Date of Birth</label>
                            <input type="date" name="birthday" defaultValue={profile?.date_of_birth || ''} className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all cursor-pointer" />
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] ml-1">About You (Philosophy)</label>
                            <textarea name="bio" defaultValue={profile?.bio || ''} rows={4} placeholder="Tell us about your fitness journey or philosophy..." className="w-full px-6 py-5 bg-off-white border border-cream-200 rounded-2xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 resize-none transition-all leading-relaxed" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Medical Conditions Card */}
            <div className="atelier-card space-y-8">
                <div className="flex items-center gap-3 border-b border-cream-100 pb-4">
                    <div className="flex flex-col gap-0.5">
                        <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Medical Conditions</h3>
                        <p className="text-[10px] font-black text-charcoal-500 uppercase tracking-widest">Select all that apply to you</p>
                    </div>
                    <div className="h-px flex-1 bg-cream-50" />
                </div>

                <div className="flex flex-wrap gap-3">
                    {['Scoliosis', 'Obesity', 'Herniated Disc', 'Post-partum', 'Chronic Back Pain', 'Hypertension', 'Diabetes', 'Asthma', 'Osteoporosis', 'Others'].map((condition) => {
                        const isSelected = selectedMedicalConditions.includes(condition);
                        return (
                            <label key={condition} className={clsx("relative flex items-center gap-3 px-5 py-3 border rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden active:scale-95 group", isSelected ? "border-forest shadow-md shadow-forest/10" : "bg-white border-cream-200 hover:border-forest/30 hover:shadow-sm")}>
                                <input type="checkbox" name="medical_conditions" value={condition} checked={isSelected} onChange={(e) => {
                                    if (e.target.checked) { setSelectedMedicalConditions([...selectedMedicalConditions, condition]) } 
                                    else { setSelectedMedicalConditions(selectedMedicalConditions.filter((item) => item !== condition)) }
                                }} className="peer absolute opacity-0" />
                                <div className={clsx("absolute inset-0 transition-opacity duration-500", isSelected ? "bg-forest opacity-100" : "bg-cream-50/30 opacity-0 group-hover:opacity-100")} />
                                <div className={clsx("relative z-10 w-4 h-4 rounded-full border-2 transition-all duration-500 flex items-center justify-center", isSelected ? "border-white" : "border-cream-200 group-hover:border-forest/40")}>
                                    <div className={clsx("w-1.5 h-1.5 rounded-full transition-all duration-500", isSelected ? "bg-white scale-100" : "bg-forest scale-0")} />
                                </div>
                                <span className={clsx("relative z-10 text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-500", isSelected ? "text-white" : "text-charcoal-600 group-hover:text-charcoal-900")}>
                                    {condition}
                                </span>
                            </label>
                        )
                    })}
                </div>
                {selectedMedicalConditions.includes('Others') && (
                    <div className="mt-4 animate-in slide-in-from-top-4 duration-500 space-y-1.5">
                        <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1">Specify Other Conditions</label>
                        <input type="text" name="otherMedicalCondition" defaultValue={profile?.other_medical_condition || ''} placeholder="Please specify your condition(s)..." className="w-full px-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-medium text-sm focus:outline-none focus:ring-charcoal-900/5 focus:ring-4 focus:border-charcoal-900 transition-all" />
                    </div>
                )}
            </div>

            {/* Teaching Expertise & Rates Card (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="atelier-card space-y-10">
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <label className="block text-[10px] font-black text-charcoal-900 uppercase tracking-[0.3em]">Equipment I can teach</label>
                            <p className="text-[10px] font-medium text-charcoal-500 italic">Select apparatuses you are qualified for</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                                const isSelected = selectedEquipment.includes(eq);
                                return (
                                    <label key={eq} className={clsx("px-6 py-3.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] cursor-pointer transition-all duration-500 border shadow-sm flex items-center gap-3 active:scale-95", isSelected ? "bg-forest text-white border-forest shadow-forest/20" : "bg-white text-charcoal/60 border-cream-200 hover:border-forest/30")}>
                                        <input type="checkbox" name="teaching_equipment" value={eq} checked={isSelected} onChange={(e) => {
                                            if (e.target.checked) { setSelectedEquipment([...selectedEquipment, eq]) } 
                                            else { setSelectedEquipment(selectedEquipment.filter((item) => item !== eq)) }
                                        }} className="hidden" />
                                        {eq}
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {/* Equipment Rates Section */}
                    {selectedEquipment.length > 0 && (
                        <div className="pt-8 border-t border-cream-100 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex flex-col gap-1">
                                <label className="block text-[10px] font-black text-charcoal-900 uppercase tracking-[0.3em]">Equipment Rates (PHP)</label>
                                <p className="text-[10px] font-medium text-charcoal-500 italic">Set your hourly rate for each apparatus</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedEquipment.map((eq) => (
                                    <div key={eq} className="relative group/rate">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-charcoal-400 group-focus-within/rate:text-forest transition-colors uppercase tracking-widest pointer-events-none">
                                            {eq}
                                        </div>
                                        <input 
                                            type="number" 
                                            name={`rate_${eq}`}
                                            defaultValue={profile?.rates?.[eq] || ''}
                                            placeholder="0.00"
                                            className="w-full pl-32 pr-5 py-4 bg-off-white border border-cream-200 rounded-xl text-charcoal-900 font-bold text-sm focus:outline-none focus:ring-forest/5 focus:ring-4 focus:border-forest transition-all text-right"
                                        />
                                        <div className="absolute left-[120px] top-1/2 -translate-y-1/2 w-px h-4 bg-cream-200" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* Service Area & Location (Instructors Only) */}
            {profile?.role === 'instructor' && (
                <div className="atelier-card space-y-10">
                    <div className="flex items-center gap-3 border-b border-cream-100 pb-4">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-xl font-serif font-bold text-charcoal-900 tracking-tight">Service Area & Location</h3>
                            <p className="text-[10px] font-black text-charcoal-500 uppercase tracking-widest">Mandatory for studio-proximity searching</p>
                        </div>
                        <div className="h-px flex-1 bg-cream-50" />
                    </div>

                    <div className="space-y-8">
                        {/* Base Location - NOW MANDATORY */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-charcoal-500 uppercase tracking-widest ml-1">Home Base Address</label>
                            <div className="relative group/address">
                                <div className="absolute left-5 top-5 text-charcoal-300 group-focus-within/address:text-forest transition-colors">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    name="homeBaseAddress"
                                    value={homeBaseAddress}
                                    onChange={(e) => handleAddressSearch(e.target.value)}
                                    onFocus={() => {
                                        if (suggestions.length > 0) setShowSuggestions(true)
                                    }}
                                    onBlur={() => {
                                        // Delay to allow clicking on a suggestion
                                        setTimeout(() => setShowSuggestions(false), 200)
                                    }}
                                    autoComplete="off"
                                    placeholder="Enter your street/community address..."
                                    className="w-full pl-14 pr-28 py-5 bg-off-white border border-cream-200 rounded-2xl text-charcoal-900 font-bold text-sm focus:outline-none focus:ring-forest/5 focus:ring-4 focus:border-forest transition-all placeholder:text-charcoal-300 placeholder:font-medium"
                                />
                                
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isSearching && (
                                        <Loader2 className="w-5 h-5 animate-spin text-forest/40" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleDetectLocation}
                                        disabled={detectingLocation}
                                        className="p-2.5 rounded-xl bg-forest/5 text-forest hover:bg-forest hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                        title="Detect current location"
                                    >
                                        {detectingLocation ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Navigation className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Suggestions Dropdown */}
                                {showSuggestions && (suggestions.length > 0 || noResults) && (
                                    <div className="relative z-[100] mt-2 bg-white border border-cream-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        {suggestions.length > 0 ? (
                                            suggestions.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleSuggestionSelect(s)}
                                                    className="w-full text-left px-6 py-4 text-xs font-bold text-charcoal-700 hover:bg-forest/5 hover:text-forest transition-colors border-b border-cream-50 last:border-0 flex items-center gap-3"
                                                >
                                                    <Search className="w-3.5 h-3.5 opacity-30" />
                                                    {s}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-6 py-4 text-xs font-bold text-charcoal-400 italic">
                                                No suggestions found.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <input type="hidden" name="homeBaseLat" value={homeBaseLat} />
                            <input type="hidden" name="homeBaseLng" value={homeBaseLng} />
                        </div>

                        {/* Travel Radius */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-end ml-1">
                                <label className="block text-[10px] font-black text-charcoal-900 uppercase tracking-[0.3em]">Maximum Travel Distance</label>
                                <span className="text-sm font-serif font-bold text-forest">{maxTravelKm} KM</span>
                            </div>
                            <div className="relative pt-1">
                                <input 
                                    type="range" 
                                    name="maxTravelKm" 
                                    min="1" 
                                    max="50" 
                                    step="1"
                                    value={maxTravelKm}
                                    onChange={(e) => setMaxTravelKm(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-charcoal-200/20 rounded-lg appearance-none cursor-pointer accent-forest transition-all"
                                    style={{
                                        background: `linear-gradient(to right, #2B3F33 0%, #2B3F33 ${((maxTravelKm - 1) / (50 - 1)) * 100}%, rgba(81, 50, 41, 0.1) ${((maxTravelKm - 1) / (50 - 1)) * 100}%, rgba(81, 50, 41, 0.1) 100%)`
                                    }}
                                />
                                <div className="flex justify-between mt-2 px-1">
                                    <span className="text-[9px] font-bold text-charcoal-500 uppercase tracking-widest">1 KM</span>
                                    <span className="text-[9px] font-bold text-charcoal-500 uppercase tracking-widest">50 KM</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-charcoal-500 leading-relaxed font-medium italic">
                                This determines which studios and home-service clients you appear near.
                            </p>
                        </div>

                        {/* Separate Toggle for Home Service Enablement */}
                        <div className="pt-6 border-t border-cream-100">
                            <label className="flex items-center gap-4 p-6 border border-burgundy/10 rounded-3xl bg-white/80 backdrop-blur-sm cursor-pointer hover:border-forest/30 transition-all group shadow-sm hover:shadow-md">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        name="offersHomeSessions" 
                                        checked={offersHomeSessions}
                                        onChange={(e) => setOffersHomeSessions(e.target.checked)}
                                        className="peer sr-only" 
                                    />
                                    <div className="w-14 h-7 bg-charcoal-200/40 rounded-full peer peer-checked:bg-forest transition-colors duration-300" />
                                    <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-7 shadow-sm border border-burgundy/5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-charcoal-900 group-hover:text-forest transition-colors">I offer Home Sessions</span>
                                    <span className="text-[10px] text-charcoal-500 italic">Allow clients to book you at their location within your radius.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {message && (
                <div className={clsx(
                    "p-5 rounded-[20px] text-xs font-bold uppercase tracking-wider animate-in slide-in-from-top-2",
                    message.includes('success') ? 'bg-sage/10 text-sage border border-sage/50 shadow-sm' : 'bg-red-50/20 text-red-600 border border-red-100'
                )}>
                    {message}
                </div>
            )}

            <div className="pt-12">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-14 py-5 bg-forest text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-110 hover:shadow-2xl hover:shadow-forest/20 transition-all duration-500 shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gold" />
                    ) : (
                        <Save className="w-4 h-4 text-gold group-hover:rotate-12 group-hover:scale-110 transition-all duration-500" />
                    )}
                    {isLoading ? 'Processing' : 'Commit Changes'}
                </button>
            </div>

            {cropperConfig && (
                <ImageCropper
                    isOpen={cropperConfig.isOpen}
                    image={cropperConfig.image}
                    aspectRatio={cropperConfig.aspectRatio}
                    title={cropperConfig.title}
                    onClose={() => setCropperConfig(null)}
                    onCrop={(file) => {
                        cropperConfig.onCrop(file)
                        setCropperConfig(null)
                    }}
                />
            )}
        </form>
    )
}
