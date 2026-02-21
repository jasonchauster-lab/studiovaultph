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

    const hasEquipment = (name: string) => studio.equipment?.includes(name)
    const otherEquipment = studio.equipment?.filter(e => !['Reformer', 'Cadillac', 'Tower'].includes(e)).join(', ')

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
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-charcoal-900">Studio Settings</h3>
                            <button onClick={() => setIsOpen(false)} className="text-charcoal-400 hover:text-charcoal-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={handleUpdate} className="space-y-4">
                            <input type="hidden" name="studioId" value={studio.id} />

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Studio Name</label>
                                <input name="name" required defaultValue={studio.name} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Contact Number</label>
                                <input name="contactNumber" required defaultValue={studio.contact_number} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Location</label>
                                <select name="location" required defaultValue={studio.location} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white">
                                    <option value="Makati">Makati</option>
                                    <option value="BGC">BGC</option>
                                    <option value="Alabang">Alabang</option>
                                    <option value="Ortigas">Ortigas</option>
                                    <option value="Quezon City">Quezon City</option>
                                    <option value="Mandaluyong">Mandaluyong</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Detailed Address</label>
                                <textarea
                                    name="address"
                                    required
                                    defaultValue={studio.address}
                                    placeholder="e.g. Unit 302, One Building, Ayala Ave"
                                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 h-20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Equipment</label>
                                <div className="space-y-2 mb-3">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="reformer" defaultChecked={hasEquipment('Reformer')} className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                                        <span className="text-charcoal-700">Reformer</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="cadillac" defaultChecked={hasEquipment('Cadillac')} className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                                        <span className="text-charcoal-700">Cadillac</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" name="tower" defaultChecked={hasEquipment('Tower')} className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                                        <span className="text-charcoal-700">Tower</span>
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    name="otherEquipment"
                                    defaultValue={otherEquipment}
                                    placeholder="Other equipment (comma separated)"
                                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Hourly Rate (₱)</label>
                                <input name="hourlyRate" type="number" required defaultValue={studio.hourly_rate} className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900" />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-charcoal-900 text-cream-50 rounded-lg font-medium hover:bg-charcoal-800 transition-colors">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
