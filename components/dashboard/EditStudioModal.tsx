'use client'

import { useState } from 'react'
import { updateStudio } from '@/app/(dashboard)/studio/actions'
import { Settings, X } from 'lucide-react'

interface Studio {
    id: string
    name: string
    location: string
    address?: string
    hourly_rate: number
    contact_number: string
    equipment: string[]
    inventory?: Record<string, number>
    pricing?: Record<string, number>
    reformers_count?: number
}

export default function EditStudioModal({ studio }: { studio: Studio }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleUpdate = async (formData: FormData) => {
        setIsSubmitting(true)
        const result = await updateStudio(formData)
        setIsSubmitting(false)

        if (result.success) {
            setIsOpen(false)
        } else {
            alert(result.error)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-white border border-cream-300 text-charcoal-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-cream-50 transition-colors"
            >
                <Settings className="w-4 h-4" /> Settings
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-cream-100 pb-4">
                            <h3 className="text-2xl font-serif text-charcoal-900">Studio Settings</h3>
                            <button onClick={() => setIsOpen(false)} className="text-charcoal-400 hover:text-charcoal-900 p-1 hover:bg-cream-50 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form action={handleUpdate} className="space-y-6">
                            <input type="hidden" name="studioId" value={studio.id} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Studio Name</label>
                                    <input name="name" required defaultValue={studio.name} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-cream-50/30" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Contact Number</label>
                                    <input name="contactNumber" required defaultValue={studio.contact_number} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-cream-50/30" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Location Area</label>
                                <select name="location" required defaultValue={studio.location} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white">
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

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Detailed Address</label>
                                <textarea
                                    name="address"
                                    required
                                    defaultValue={studio.address}
                                    placeholder="e.g. Unit 302, One Building, Ayala Ave"
                                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 h-20 bg-cream-50/30"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-charcoal-700 border-b border-cream-100 pb-2">Equipment, Inventory & Pricing</label>
                                <div className="space-y-3">
                                    {['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].map((eq) => (
                                        <div key={eq} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-cream-200 rounded-xl bg-cream-50/30 group hover:border-rose-gold/30 transition-colors">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name={`eq_${eq}`}
                                                    className="w-5 h-5 shrink-0 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900"
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
                                                        className="w-16 px-2 py-1 bg-white border border-cream-200 rounded text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-charcoal-900 text-sm"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-charcoal-500 font-medium">Rate:</span>
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1 text-charcoal-400 text-xs font-bold">₱</span>
                                                        <input
                                                            type="number"
                                                            name={`price_${eq}`}
                                                            defaultValue={studio.pricing?.[eq] || ''}
                                                            placeholder="0"
                                                            min="0"
                                                            step="1"
                                                            className="w-24 pl-5 pr-2 py-1 bg-white border border-cream-200 rounded text-charcoal-900 focus:outline-none focus:ring-1 focus:ring-charcoal-900 text-sm font-bold"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-rose-gold text-white rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-md active:scale-[0.98]">
                                {isSubmitting ? 'Saving Changes...' : 'Save All Settings'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
