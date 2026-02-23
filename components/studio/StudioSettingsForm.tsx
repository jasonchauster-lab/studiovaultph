'use client'

import { useState } from 'react'
import { updateStudio } from '@/app/(dashboard)/studio/actions'
import { Loader2, Save, Camera, User } from 'lucide-react'
import { Studio } from '@/types'
import { isValidPhone } from '@/lib/validation'
import Image from 'next/image'
import { useRef } from 'react'

export default function StudioSettingsForm({ studio }: { studio: Studio }) {
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        const contactNumber = formData.get('contactNumber') as string
        if (contactNumber && !isValidPhone(contactNumber)) {
            setMessage('Please enter a valid contact number (at least 7 digits).')
            return
        }

        setIsLoading(true)
        setMessage(null)

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
        <form action={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl border border-cream-200 shadow-sm max-w-3xl">

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

            {/* Equipment & Inventory */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif text-charcoal-900 border-b border-cream-200 pb-2">Equipment & Inventory</h2>

                <div className="bg-cream-50 p-4 rounded-lg border border-cream-200 mb-4">
                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Total Reformer Count (Inventory)</label>
                    <input
                        type="number"
                        name="reformersCount"
                        defaultValue={studio.reformers_count}
                        required
                        min="0"
                        className="w-full md:w-1/3 px-4 py-2 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                    />
                    <p className="text-xs text-charcoal-500 mt-1">
                        Use this to track how many physical machines you have. This does not limit booking slots automatically unless confirmed otherwise.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Equipment Types</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => (
                            <label key={eq} className="flex items-center gap-2 p-3 bg-white border border-cream-200 rounded-lg hover:bg-cream-50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    name={`eq_${eq}`}
                                    className="w-4 h-4 text-charcoal-900 rounded border-cream-300 focus:ring-charcoal-500"
                                    defaultChecked={studio.equipment?.includes(eq)}
                                />
                                <span className="text-sm text-charcoal-700">{eq}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-2">
                        For &apos;Chair&apos;, &apos;Ladder Barrel&apos;, &apos;Mat&apos;, ensure the update script handles them.
                    </p>
                </div>

                {/* Equipment Pricing */}
                <div className="bg-cream-50 p-4 rounded-lg border border-cream-200 mt-4">
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Equipment Hourly Rates (PHP)</label>
                    <p className="text-xs text-charcoal-500 mb-3">
                        Set the hourly rental price for each equipment type.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => (
                            <div key={eq}>
                                <label className="block text-xs font-medium text-charcoal-600 mb-1">{eq}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-charcoal-400 text-sm">₱</span>
                                    <input
                                        type="number"
                                        name={`price_${eq}`}
                                        defaultValue={studio.pricing?.[eq] || ''}
                                        placeholder="500"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-7 pr-3 py-2 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${message.includes('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
