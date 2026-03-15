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
            <div className="flex flex-col items-center gap-4 border-b border-cream-200 pb-8">
                <div className="relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-cream-100 flex items-center justify-center">
                        {logoPreview ? (
                            <Image
                                src={logoPreview}
                                alt="Studio Logo"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center p-4">
                                <User className="w-8 h-8 text-charcoal-300 mx-auto mb-1" />
                                <span className="text-[10px] font-medium text-charcoal-400 uppercase tracking-widest">Logo</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <Camera className="w-6 h-6 text-white" />
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
                <div className="text-center">
                    <h3 className="text-sm font-serif font-bold text-charcoal-900">Studio Logo</h3>
                    <p className="text-xs text-charcoal-500">Click to upload or change</p>
                </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900 border-b border-cream-200 pb-2">Basic Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Studio Name</label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={studio.name}
                            required
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Location Area</label>
                        <select
                            name="location"
                            defaultValue={studio.location}
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
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
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Full Address</label>
                        <textarea
                            name="address"
                            defaultValue={studio.address || ''}
                            required
                            rows={2}
                            placeholder="e.g. Unit 204, 2nd Floor, The Podium, ADB Ave, Ortigas Center"
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Google Maps Link <span className="text-rose-gold font-bold">*</span></label>
                        <input
                            type="url"
                            name="googleMapsUrl"
                            defaultValue={studio.google_maps_url || ''}
                            required
                            placeholder="e.g. https://maps.app.goo.gl/..."
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Studio Bio / Description</label>
                        <textarea
                            name="bio"
                            defaultValue={studio.bio || studio.description || ''}
                            rows={3}
                            placeholder="Describe your vibe and nearby BGC/Makati landmarks..."
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-gold/50 resize-none"
                        />
                        <p className="text-[10px] text-charcoal-400 mt-1 italic">Help clients find you — mention landmarks, parking, and what makes your studio unique.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Reception / Contact Number</label>
                        <input
                            type="tel"
                            name="contactNumber"
                            defaultValue={studio.contact_number || ''}
                            required
                            maxLength={13}
                            placeholder="e.g. 09171234567"
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                        />
                        <p className="text-[11px] text-charcoal-400 mt-1">Format: 09XXXXXXXXX or +639XXXXXXXXX (11 digits)</p>
                    </div>
                </div>
            </div>

            {/* Space Photos */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-serif font-bold text-charcoal-900 border-b border-cream-200 pb-2">Photos of the Space</h2>
                    <button
                        type="button"
                        onClick={() => spacePhotosInputRef.current?.click()}
                        className="flex items-center gap-2 bg-charcoal text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-sm active:scale-95"
                    >
                        <Upload className="w-4 h-4 text-gold" />
                        Add New Photos
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

                <div className="relative group/gallery">
                    <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 gap-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                        {/* New Photos (Ready to Upload) */}
                        {newSpacePhotos.map((file, index) => {
                            const objectUrl = URL.createObjectURL(file);
                            return (
                                <div key={'new_' + index} className="relative flex-none w-[280px] aspect-[4/5] rounded-[2rem] overflow-hidden bg-white/40 border-2 border-dashed border-rose-gold/30 shadow-sm snap-center group">
                                    <div className="absolute top-2 left-2 z-20 bg-rose-gold text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-sm">
                                        Pending Upload
                                    </div>
                                    <img
                                        src={objectUrl}
                                        alt={`New Photo ${index + 1}`}
                                        className="w-full h-full object-cover opacity-60"
                                    />
                                    <button
                                        onClick={(e) => removeNewPhoto(e, index)}
                                        className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-20"
                                        title="Remove Photo"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        })}

                        {/* Existing Photos */}
                        {existingPhotos.map((url, index) => (
                            <div key={'ext_' + index} className="relative flex-none w-[280px] aspect-[4/5] rounded-[2rem] overflow-hidden bg-white/40 border border-cream-200 shadow-sm snap-center group">
                                <Image
                                    src={url}
                                    alt={`Space Photo ${index + 1}`}
                                    fill
                                    quality={92}
                                    sizes="280px"
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <button
                                    onClick={(e) => removeExistingPhoto(e, url)}
                                    className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Remove Photo"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-charcoal-900/20 to-transparent pointer-events-none" />
                            </div>
                        ))}

                        {/* Empty State / Add Placeholder if none */}
                        {existingPhotos.length === 0 && newSpacePhotos.length === 0 && (
                            <div 
                                onClick={() => spacePhotosInputRef.current?.click()}
                                className="flex-none w-[280px] aspect-[4/5] rounded-[2rem] border-2 border-dashed border-cream-300 flex flex-col items-center justify-center gap-4 bg-cream-50/30 cursor-pointer hover:bg-cream-50 hover:border-rose-gold/30 transition-all"
                            >
                                <div className="p-4 bg-white rounded-full shadow-sm">
                                    <Camera className="w-8 h-8 text-charcoal-300" />
                                </div>
                                <p className="text-[10px] font-black text-charcoal-400 uppercase tracking-widest">No Photos Added Yet</p>
                            </div>
                        )}
                    </div>

                    {/* Scroll Indicators */}
                    {(existingPhotos.length + newSpacePhotos.length) > 1 && (
                        <>
                            <div className="flex items-center justify-center gap-1.5 mt-2 sm:hidden">
                                {[...Array(existingPhotos.length + newSpacePhotos.length)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-rose-gold/20" />
                                ))}
                            </div>
                            <div className="sm:hidden flex items-center justify-center gap-2 mt-2 text-[8px] font-black text-rose-gold/40 uppercase tracking-[0.3em] animate-pulse">
                                <span>Swipe to explore the space</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Equipment & Inventory */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900 border-b border-cream-200 pb-2">Equipment, Inventory &amp; Pricing</h2>
                <div className="space-y-3">
                    {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                        return (
                            <div key={eq} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-cream-200 rounded-lg bg-cream-50 group">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name={`eq_${eq}`}
                                        className="w-5 h-5 shrink-0 accent-rose-gold border-cream-300 rounded focus:ring-rose-gold"
                                        defaultChecked={studio.equipment?.includes(eq)}
                                    />
                                    <span className="text-charcoal-900 font-medium">{eq}</span>
                                </label>

                                <div className="flex items-center justify-end gap-4 flex-wrap sm:flex-nowrap opacity-50 group-has-[:checked]:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-charcoal-500 font-medium">Qty:</span>
                                        <input
                                            type="number"
                                            name={`qty_${eq}`}
                                            defaultValue={studio.inventory?.[eq] || (eq === 'Reformer' ? studio.reformers_count : 1)}
                                            min="0"
                                            className="w-20 px-3 py-1.5 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-gold/50 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-charcoal-500 font-medium">Rate:</span>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1.5 text-charcoal-400 text-sm">₱</span>
                                            <input
                                                type="number"
                                                name={`price_${eq}`}
                                                defaultValue={studio.pricing?.[eq] || ''}
                                                placeholder="0"
                                                min="0"
                                                step="1"
                                                className="w-28 pl-7 pr-3 py-1.5 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-gold/50 text-sm"
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
            <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900 border-b border-cream-200 pb-2">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STUDIO_AMENITIES.map((amenity) => (
                        <label key={amenity} className="flex items-start gap-2.5 p-3 border border-cream-200 rounded-lg bg-white cursor-pointer hover:bg-rose-gold/5 hover:border-rose-gold/30 transition-colors min-h-[52px] group">
                            <input
                                type="checkbox"
                                name="amenities"
                                value={amenity}
                                defaultChecked={studio.amenities?.includes(amenity)}
                                className="w-4 h-4 mt-0.5 shrink-0 accent-rose-gold border-cream-300 rounded focus:ring-rose-gold"
                            />
                            <span className="text-charcoal-700 text-sm font-medium leading-tight group-hover:text-charcoal-900 transition-colors">{amenity}</span>
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

            <div className="pt-10 border-t border-cream-200">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-16 py-6 bg-charcoal text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-gold" /> : <Save className="w-5 h-5 text-gold stroke-[2px]" />}
                    {isLoading ? 'SAVING...' : 'SAVE SETTINGS'}
                </button>
            </div>
        </form>
    )
}
