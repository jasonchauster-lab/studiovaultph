'use client'

import { useState } from 'react'
import { updateStudio } from '@/app/(dashboard)/studio/actions'
import { Loader2, Save, Camera, User, X, Upload } from 'lucide-react'
import { Studio, STUDIO_AMENITIES } from '@/types'
import { isValidPhone } from '@/lib/validation'
import Image from 'next/image'
import { useRef } from 'react'

export default function StudioSettingsForm({ studio }: { studio: Studio }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const [existingPhotos, setExistingPhotos] = useState<string[]>(studio.space_photos_urls || [])
    const [newSpacePhotos, setNewSpacePhotos] = useState<File[]>([])
    const spacePhotosInputRef = useRef<HTMLInputElement>(null)

    const handleSpacePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const validFiles = files.filter(f => f.type.startsWith('image/'))
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
            setMessage('Please enter a valid contact number (at least 7 digits).')
            return
        }

        setIsLoading(true)
        setMessage(null)

        // Attach space photos state to form data
        formData.set('existingPhotos', JSON.stringify(existingPhotos))
        formData.delete('spacePhotos') // ensure we use our controlled state
        newSpacePhotos.forEach(file => {
            formData.append('spacePhotos', file)
        })

        const result = await updateStudio(formData)

        if (result.success) {
            setMessage('Settings updated successfully!')
        } else {
            setMessage(result.error || 'Failed to update settings.')
        }

        setIsLoading(false)
    }

    // State for logo preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(studio.logo_url || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const url = URL.createObjectURL(file)
            setPreviewUrl(url)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl border border-cream-200 shadow-sm max-w-3xl mx-auto">

            <input type="hidden" name="studioId" value={studio.id} />

            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-4 border-b border-cream-200 pb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-cream-100 flex items-center justify-center">
                        {previewUrl ? (
                            <Image
                                src={previewUrl}
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
                        name="logo"
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleLogoChange}
                    />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-medium text-charcoal-900">Studio Logo</h3>
                    <p className="text-xs text-charcoal-500">Click to upload or change</p>
                </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif text-charcoal-900 border-b border-cream-200 pb-2">Basic Details</h2>

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
                            <option value="Alabang">Alabang</option>
                            <option value="BGC">BGC</option>
                            <option value="Ortigas">Ortigas</option>
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
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Google Maps Link (Optional)</label>
                        <input
                            type="url"
                            name="googleMapsUrl"
                            defaultValue={studio.google_maps_url || ''}
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
                            placeholder="Tell customers about your studio, vibe, and amenities."
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 resize-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Reception / Contact Number</label>
                        <input
                            type="text"
                            name="contactNumber"
                            defaultValue={studio.contact_number || ''}
                            required
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                        />
                        <p className="text-[10px] text-charcoal-500 mt-1 italic leading-relaxed">
                            We will reach out through this number to confirm your studio&apos;s application and booking details.
                        </p>

                    </div>
                </div>
            </div>

            {/* Space Photos */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif text-charcoal-900 border-b border-cream-200 pb-2">Photos of the Space</h2>
                <div className="bg-cream-50 p-6 rounded-lg border border-cream-200">
                    {/* Existing Photos Grid */}
                    {existingPhotos.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-charcoal-700 mb-3">Current Photos</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {existingPhotos.map((url, index) => (
                                    <div key={'ext_' + index} className="relative aspect-square rounded-lg overflow-hidden group border border-cream-200 shadow-sm">
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            <Image
                                                src={url}
                                                alt={`Space Photo ${index + 1}`}
                                                fill
                                                className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                        </a>
                                        <button
                                            onClick={(e) => removeExistingPhoto(e, url)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm z-10"
                                            title="Remove Photo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Photos Grid */}
                    {newSpacePhotos.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-charcoal-700 mb-3">New Photos (Ready to Upload)</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {newSpacePhotos.map((file, index) => {
                                    const objectUrl = URL.createObjectURL(file);
                                    return (
                                        <div key={'new_' + index} className="relative aspect-square rounded-lg overflow-hidden group border border-cream-200 shadow-sm">
                                            <a href={objectUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                <img
                                                    src={objectUrl}
                                                    alt={`New Photo ${index + 1}`}
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                />
                                            </a>
                                            <button
                                                onClick={(e) => removeNewPhoto(e, index)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm z-10"
                                                title="Remove Photo"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Add Photo Button */}
                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-cream-300 rounded-lg hover:bg-cream-100/50 transition-colors cursor-pointer" onClick={() => spacePhotosInputRef.current?.click()}>
                        <Upload className="w-8 h-8 text-charcoal-400 mb-2" />
                        <p className="text-sm font-medium text-charcoal-700">Click to add photos</p>
                        <p className="text-xs text-charcoal-500 mt-1">Images only (JPG, PNG)</p>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            ref={spacePhotosInputRef}
                            className="hidden"
                            onChange={handleSpacePhotosChange}
                        />
                    </div>
                </div>
            </div>

            {/* Equipment & Inventory */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif text-charcoal-900 border-b border-cream-200 pb-2">Equipment, Inventory & Pricing</h2>
                <p className="text-sm text-charcoal-600 mb-4">
                    Select the equipment available in your studio, enter the quantity, and set the hourly rental rate (if applicable).
                </p>

                <div className="space-y-3">
                    {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => {
                        return (
                            <div key={eq} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-cream-200 rounded-lg bg-cream-50 group">
                                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name={`eq_${eq}`}
                                        className="w-5 h-5 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900"
                                        defaultChecked={studio.equipment?.includes(eq)}
                                    />
                                    <span className="text-charcoal-900 font-medium">{eq}</span>
                                </label>

                                <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap opacity-50 group-has-[:checked]:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-charcoal-500 w-8">Qty:</span>
                                        <input
                                            type="number"
                                            name={`qty_${eq}`}
                                            defaultValue={studio.inventory?.[eq] || (eq === 'Reformer' ? studio.reformers_count : 1)}
                                            min="0"
                                            className="w-20 px-3 py-1.5 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-charcoal-500 w-8">Rate:</span>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1.5 text-charcoal-400 text-sm">₱</span>
                                            <input
                                                type="number"
                                                name={`price_${eq}`}
                                                defaultValue={studio.pricing?.[eq] || ''}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                className="w-28 pl-7 pr-3 py-1.5 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm"
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
                <h2 className="text-xl font-serif text-charcoal-900 border-b border-cream-200 pb-2">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STUDIO_AMENITIES.map((amenity) => (
                        <label key={amenity} className="flex items-start gap-2.5 p-3 border border-cream-200 rounded-lg bg-white cursor-pointer hover:bg-cream-50 transition-colors h-full min-w-0">
                            <div className="flex items-center h-5 shrink-0">
                                <input
                                    type="checkbox"
                                    name="amenities"
                                    value={amenity}
                                    defaultChecked={studio.amenities?.includes(amenity)}
                                    className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900"
                                />
                            </div>
                            <span className="text-charcoal-700 text-sm font-medium leading-tight pt-0.5 flex-1 min-w-0 break-words">{amenity}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${message.toLowerCase().includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="pt-4 border-t border-cream-200 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-charcoal-900 text-cream-50 px-6 py-3 rounded-lg font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Settings
                </button>
            </div>
        </form>
    )
}
