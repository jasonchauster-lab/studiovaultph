'use client'

import { useState, useRef } from 'react'
import { updateStudio } from '@/app/(dashboard)/studio/actions'
import { Loader2, Save, Camera, User, X, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { STUDIO_AMENITIES } from '@/types'
import { isValidPhone, phoneErrorMessage } from '@/lib/validation'
import Image from 'next/image'
import { normalizeImageFile, uploadContentType } from '@/lib/utils/image-utils'

export default function StudioSettingsForm({ studio }: { studio: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const logoInputRef = useRef<HTMLInputElement>(null)
    const spacePhotosInputRef = useRef<HTMLInputElement>(null)

    const [logo, setLogo] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(studio.logo_url)

    const [existingPhotos, setExistingPhotos] = useState<string[]>(studio.space_photos_urls || studio.space_photos || [])
    const [newSpacePhotos, setNewSpacePhotos] = useState<File[]>([])

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            try {
                const normalized = await normalizeImageFile(file)
                setLogo(normalized)
                setLogoPreview(URL.createObjectURL(normalized))
            } catch (err) {
                console.error('Logo processing error:', err)
                setError('Failed to process logo image.')
            }
        }
    }

    const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const validFiles: File[] = []

        for (const file of files) {
            try {
                const normalized = await normalizeImageFile(file)
                validFiles.push(normalized)
            } catch (err) {
                console.error('Image processing error:', err)
            }
        }

        if (validFiles.length > 0) {
            setNewSpacePhotos(prev => [...prev, ...validFiles])
        }
        if (spacePhotosInputRef.current) {
            spacePhotosInputRef.current.value = ''
        }
    }

    const removeExistingPhoto = (e: React.MouseEvent, urlToRemove: string) => {
        e.preventDefault()
        setExistingPhotos(existingPhotos.filter(url => url !== urlToRemove))
    }

    const removeNewPhoto = (e: React.MouseEvent, indexToRemove: number) => {
        e.preventDefault()
        setNewSpacePhotos(newSpacePhotos.filter((_, idx) => idx !== indexToRemove))
    }

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        if (contactNumber && !isValidPhone(contactNumber)) {
            setError(phoneErrorMessage)
            return
        }

        setIsLoading(true)
        setError(null)
        setSuccess(false)

        try {
            // Pass existing photos list so the server action knows what to keep
            formData.set('existingPhotos', JSON.stringify(existingPhotos))

            // Append new photo files directly — server action uploads via admin client
            for (const file of newSpacePhotos) {
                formData.append('newSpacePhoto', file)
            }

            // Append logo if changed
            if (logo) {
                formData.set('logo', logo)
            }

            const result = await updateStudio(formData)
            if (result?.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setNewSpacePhotos([])
                setLogo(null)
            }
        } catch (err: any) {
            console.error('Settings update error:', err)
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8 bg-white p-4 sm:p-8 rounded-2xl border border-cream-200 shadow-sm">

            <input type="hidden" name="studioId" value={studio.id} />

            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-6 border-b border-cream-200/60 pb-10">
                <div 
                    className="relative group cursor-pointer transition-transform duration-300 hover:scale-[1.02]" 
                    onClick={() => logoInputRef.current?.click()}
                >
                    <div className="w-36 h-36 rounded-3xl overflow-hidden border-[6px] border-white shadow-xl bg-cream-50 flex items-center justify-center transition-all duration-300 group-hover:shadow-2xl group-hover:border-cream-50">
                        {logoPreview ? (
                            <Image
                                src={logoPreview}
                                alt="Studio Logo"
                                width={144}
                                height={144}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center p-6 flex flex-col items-center">
                                <User className="w-10 h-10 text-charcoal-200 mb-2" />
                                <span className="text-[10px] font-bold text-charcoal-300 uppercase tracking-[0.2em]">Upload Logo</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-3xl backdrop-blur-[2px]">
                            <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                <Camera className="w-6 h-6 text-charcoal-900" />
                            </div>
                        </div>
                    </div>
                    <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        ref={logoInputRef}
                        className="hidden"
                        onChange={handleLogoChange}
                    />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="text-lg font-serif font-bold text-charcoal-900">Studio Brand</h3>
                    <p className="text-xs text-charcoal-400 font-medium">Click the frame above to upload your studio logo</p>
                </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3">
                    <h2 className="text-xl font-serif font-bold text-charcoal-900">Basic Details</h2>
                    <div className="h-px flex-1 bg-cream-100/50" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Studio Name</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={studio.name}
                            required
                            placeholder="Enter studio name"
                            className="w-full px-5 py-3.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all placeholder:text-charcoal-300"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Location Area</label>
                        <div className="relative">
                            <select
                                name="location"
                                defaultValue={studio.location}
                                className="w-full px-5 py-3.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all appearance-none cursor-pointer"
                            >
                                <optgroup label="Alabang">
                                    <option value="Alabang - Madrigal/Ayala Alabang">Alabang - Madrigal / Ayala Alabang</option>
                                    <option value="Alabang - Filinvest City">Alabang - Filinvest City</option>
                                    <option value="Alabang - Alabang Town Center Area">Alabang - Alabang Town Center Area</option>
                                    <option value="Alabang - Others">Alabang - Others</option>
                                </optgroup>
                                <optgroup label="BGC">
                                    <option value="BGC - High Street">BGC - High Street</option>
                                    <option value="BGC - Central Square/Uptown">BGC - Central Square / Uptown</option>
                                    <option value="BGC - Forbes Town">BGC - Forbes Town</option>
                                    <option value="BGC - Others">BGC - Others</option>
                                </optgroup>
                                <optgroup label="Ortigas">
                                    <option value="Ortigas - Ortigas Center">Ortigas - Ortigas Center</option>
                                    <option value="Ortigas - Greenhills">Ortigas - Greenhills</option>
                                    <option value="Ortigas - San Juan">Ortigas - San Juan</option>
                                    <option value="Ortigas - Others">Ortigas - Others</option>
                                </optgroup>
                                <optgroup label="Makati">
                                    <option value="Makati - CBD/Ayala">Makati - CBD / Ayala</option>
                                    <option value="Makati - Poblacion/Rockwell">Makati - Poblacion / Rockwell</option>
                                    <option value="Makati - San Antonio/Gil Puyat">Makati - San Antonio / Gil Puyat</option>
                                    <option value="Makati - Others">Makati - Others</option>
                                </optgroup>
                                <optgroup label="Mandaluyong">
                                    <option value="Mandaluyong - Ortigas South">Mandaluyong - Ortigas South</option>
                                    <option value="Mandaluyong - Greenfield/Shaw">Mandaluyong - Greenfield / Shaw</option>
                                    <option value="Mandaluyong - Boni/Pioneer">Mandaluyong - Boni / Pioneer</option>
                                </optgroup>
                                <optgroup label="Quezon City">
                                    <option value="QC - Tomas Morato">QC - Tomas Morato</option>
                                    <option value="QC - Katipunan">QC - Katipunan</option>
                                    <option value="QC - Eastwood">QC - Eastwood</option>
                                    <option value="QC - Cubao">QC - Cubao</option>
                                    <option value="QC - Fairview/Commonwealth">QC - Fairview / Commonwealth</option>
                                    <option value="QC - Novaliches">QC - Novaliches</option>
                                    <option value="QC - Diliman">QC - Diliman</option>
                                    <option value="QC - Maginhawa/UP Village">QC - Maginhawa / UP Village</option>
                                </optgroup>
                                <optgroup label="Paranaque">
                                    <option value="Paranaque - BF Homes">Paranaque - BF Homes</option>
                                    <option value="Paranaque - Moonwalk / Merville">Paranaque - Moonwalk / Merville</option>
                                    <option value="Paranaque - Bicutan / Sucat">Paranaque - Bicutan / Sucat</option>
                                    <option value="Paranaque - Others">Paranaque - Others</option>
                                </optgroup>
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Full Address</label>
                        <textarea
                            name="address"
                            defaultValue={studio.address || ''}
                            required
                            rows={2}
                            placeholder="e.g. Unit 204, 2nd Floor, The Podium, ADB Ave, Ortigas Center"
                            className="w-full px-5 py-3.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all resize-none placeholder:text-charcoal-300"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Google Maps Link <span className="text-rose-gold">*</span></label>
                        <input
                            type="url"
                            name="googleMapsUrl"
                            defaultValue={studio.google_maps_url || ''}
                            required
                            placeholder="e.g. https://maps.app.goo.gl/..."
                            className="w-full px-5 py-3.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all placeholder:text-charcoal-300"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Studio Bio / Description</label>
                        <textarea
                            name="bio"
                            defaultValue={studio.bio || studio.description || ''}
                            rows={4}
                            placeholder="Describe your vibe and nearby BGC/Makati landmarks..."
                            className="w-full px-5 py-3.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all resize-none placeholder:text-charcoal-300"
                        />
                        <p className="text-[10px] text-charcoal-400 mt-1 italic leading-relaxed">Help clients find you — mention landmarks, parking, and what makes your studio unique.</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-charcoal-500 uppercase tracking-wider ml-1">Reception / Contact Number</label>
                    <input
                        type="tel"
                        name="contactNumber"
                        defaultValue={studio.contact_number || ''}
                        required
                        maxLength={13}
                        placeholder="e.g. 09171234567"
                        className="w-full px-5 py-3.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all placeholder:text-charcoal-300"
                    />
                    <p className="text-[11px] text-charcoal-400 mt-1">Format: 09XXXXXXXXX or +639XXXXXXXXX (11 digits)</p>
                </div>
            </div>

            {/* Space Photos */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-cream-200/60 pb-3">
                    <h2 className="text-xl font-serif font-bold text-charcoal-900">Photos of the Space</h2>
                    <button
                        type="button"
                        onClick={() => spacePhotosInputRef.current?.click()}
                        className="group flex items-center gap-2 text-charcoal-900 text-[10px] font-black uppercase tracking-widest hover:text-charcoal-600 transition-colors"
                    >
                        <div className="p-2 bg-cream-50 rounded-full group-hover:bg-cream-100 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                        </div>
                        Add Photos
                    </button>
                    <input
                        type="file"
                        multiple
                        accept="image/*,.heic,.heif"
                        ref={spacePhotosInputRef}
                        className="hidden"
                        onChange={handlePhotosChange}
                    />
                </div>

                <div className="relative">
                    <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 gap-6 -mx-4 px-4 sm:-mx-8 sm:px-8">
                        {/* New Photos (Ready to Upload) */}
                        {newSpacePhotos.map((file, index) => {
                            const objectUrl = URL.createObjectURL(file);
                            return (
                                <div key={'new_' + index} className="relative flex-none w-[260px] aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-cream-50 border-2 border-dashed border-charcoal-200/40 shadow-sm snap-center group">
                                    <div className="absolute top-4 left-4 z-20 bg-charcoal-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                                        Pending Upload
                                    </div>
                                    <img
                                        src={objectUrl}
                                        alt={`New Photo ${index + 1}`}
                                        className="w-full h-full object-cover opacity-70"
                                    />
                                    <button
                                        onClick={(e) => removeNewPhoto(e, index)}
                                        className="absolute top-4 right-4 p-2.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-xl z-20 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )
                        })}

                        {/* Existing Photos */}
                        {existingPhotos.map((url, index) => (
                            <div key={'ext_' + index} className="relative flex-none w-[260px] aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-cream-100 shadow-xl snap-center group">
                                <Image
                                    src={url}
                                    alt={`Space Photo ${index + 1}`}
                                    fill
                                    quality={92}
                                    sizes="260px"
                                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                                <button
                                    onClick={(e) => removeExistingPhoto(e, url)}
                                    className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-rose-600 transition-all shadow-xl z-20 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                        ))}

                        {/* Plus Card for adding more */}
                        {(existingPhotos.length > 0 || newSpacePhotos.length > 0) && (
                            <div 
                                onClick={() => spacePhotosInputRef.current?.click()}
                                className="flex-none w-[260px] aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-cream-300 flex flex-col items-center justify-center gap-4 bg-cream-50/20 cursor-pointer hover:bg-cream-50 hover:border-charcoal-200 transition-all snap-center"
                            >
                                <div className="p-5 bg-white rounded-full shadow-lg">
                                    <Camera className="w-8 h-8 text-charcoal-200" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">Add More Photos</p>
                                    <p className="text-[8px] text-charcoal-300 font-bold uppercase mt-1">PNG, JPG, HEIC</p>
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {existingPhotos.length === 0 && newSpacePhotos.length === 0 && (
                            <div 
                                onClick={() => spacePhotosInputRef.current?.click()}
                                className="flex-none w-full aspect-[16/9] rounded-[2.5rem] border-2 border-dashed border-cream-300 flex flex-col items-center justify-center gap-5 bg-cream-50/30 cursor-pointer hover:bg-cream-50 hover:border-charcoal-200 transition-all group"
                            >
                                <div className="p-6 bg-white rounded-full shadow-xl transition-transform group-hover:scale-110 duration-500">
                                    <Camera className="w-10 h-10 text-charcoal-200" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-charcoal-400 uppercase tracking-[0.3em]">No Photos Added Yet</p>
                                    <p className="text-[10px] text-charcoal-300 font-medium mt-2">Showcase your beautiful studio space</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scroll Indicators */}
                    {(existingPhotos.length + newSpacePhotos.length) > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-2 sm:hidden">
                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(5, existingPhotos.length + newSpacePhotos.length))].map((_, i) => (
                                    <div key={i} className="w-1 h-1 rounded-full bg-charcoal-200" />
                                ))}
                            </div>
                            <span className="text-[9px] font-bold text-charcoal-300 uppercase tracking-widest ml-2 italic">Scroll to view</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Equipment & Inventory */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3">
                    <h2 className="text-xl font-serif font-bold text-charcoal-900">Equipment & Pricing</h2>
                    <div className="h-px flex-1 bg-cream-100/50" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                        return (
                            <div key={eq} className="flex flex-col p-5 border border-cream-200 rounded-[1.5rem] bg-white transition-all duration-300 hover:shadow-md hover:border-charcoal-900/10 group">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="flex items-center gap-3 cursor-pointer group/label">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                name={`eq_${eq}`}
                                                className="peer w-6 h-6 opacity-0 absolute cursor-pointer"
                                                defaultChecked={studio.equipment?.includes(eq)}
                                            />
                                            <div className="w-6 h-6 bg-cream-50 border border-cream-200 rounded-lg peer-checked:bg-forest peer-checked:border-forest transition-all flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </div>
                                        <span className="text-charcoal-900 font-bold tracking-tight transition-colors group-hover/label:text-charcoal-600">{eq}</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cream-100/60 opacity-40 group-has-[:checked]:opacity-100 transition-all duration-500">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest ml-1">Quantity</span>
                                        <input
                                            type="number"
                                            name={`qty_${eq}`}
                                            defaultValue={studio.inventory?.[eq] || (eq === 'Reformer' ? studio.reformers_count : 1)}
                                            min="0"
                                            className="w-full px-4 py-2.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest ml-1">Hourly Rate</span>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm font-bold">₱</span>
                                            <input
                                                type="number"
                                                name={`price_${eq}`}
                                                defaultValue={studio.pricing?.[eq] || ''}
                                                placeholder="0"
                                                min="0"
                                                step="1"
                                                className="w-full pl-8 pr-4 py-2.5 bg-cream-50/50 border border-cream-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900/5 focus:border-charcoal-900 transition-all text-sm font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Amenities Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-cream-200/60 pb-3">
                    <h2 className="text-xl font-serif font-bold text-charcoal-900">Amenities</h2>
                    <div className="h-px flex-1 bg-cream-100/50" />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {STUDIO_AMENITIES.map((amenity) => (
                        <label key={amenity} className="relative flex items-center gap-3 p-4 border border-cream-200 rounded-[1.25rem] bg-white cursor-pointer transition-all duration-300 hover:border-charcoal-900/20 group overflow-hidden">
                            <input
                                type="checkbox"
                                name="amenities"
                                value={amenity}
                                defaultChecked={studio.amenities?.includes(amenity)}
                                className="peer absolute opacity-0"
                            />
                            <div className="absolute inset-0 bg-cream-50/50 peer-checked:bg-forest transition-colors duration-300" />
                            <div className="relative z-10 w-5 h-5 flex-none rounded-full border-2 border-cream-200 peer-checked:border-white transition-all flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-charcoal-900 peer-checked:bg-white scale-0 peer-checked:scale-100 transition-transform" />
                            </div>
                            <span className="relative z-10 text-charcoal-700 text-[11px] font-bold uppercase tracking-widest peer-checked:text-white transition-colors duration-300 leading-tight">
                                {amenity}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Status Message */}
            {success && (
                <div className="p-4 rounded-lg text-sm font-medium flex items-center gap-2 bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    Settings updated successfully!
                </div>
            )}
            {error && (
                <div className="p-4 rounded-lg text-sm font-medium flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="pt-12">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-12 py-5 bg-forest text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-110 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 transition-all duration-500"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : <Save className="w-4 h-4 text-gold" />}
                    {isLoading ? 'Processing' : 'Commit Changes'}
                </button>
            </div>
        </form>
    )
}
