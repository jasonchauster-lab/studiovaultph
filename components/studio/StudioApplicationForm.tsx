'use client'

import { useState } from 'react'
import { createStudio } from '@/app/(dashboard)/studio/actions'
import { Loader2 } from 'lucide-react'

export default function StudioApplicationForm() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError(null)
        setIsLoading(true)

        // Custom validation: At least one equipment must be provided
        const hasReformer = formData.get('reformer') === 'on'
        const hasCadillac = formData.get('cadillac') === 'on'
        const hasTower = formData.get('tower') === 'on'
        const otherEq = formData.get('otherEquipment') as string

        if (!hasReformer && !hasCadillac && !hasTower && !otherEq.trim()) {
            setError('Please select at least one piece of equipment or specify other equipment.')
            setIsLoading(false)
            return
        }

        try {
            const result = await createStudio(formData)
            if (result?.error) {
                setError(result.error)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Studio Name <span className="text-red-500">*</span></label>
                <input name="name" required placeholder="e.g. Pilates Logic" className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900" />
            </div>
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                <input name="contactNumber" required placeholder="e.g. +63 917 123 4567" className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900" />
                <p className="text-[10px] text-charcoal-500 mt-1 italic">
                    We will reach out through this number to confirm your studio's application and booking details.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Location <span className="text-red-500">*</span></label>
                <select name="location" required className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white">
                    <option value="">Select a location</option>
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
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Detailed Address <span className="text-red-500">*</span></label>
                <textarea
                    name="address"
                    required
                    placeholder="e.g. Unit 302, One Building, Ayala Ave"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 h-20"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Equipment <span className="text-red-500">*</span></label>
                <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="reformer" className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                        <span className="text-charcoal-700">Reformer</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="cadillac" className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                        <span className="text-charcoal-700">Cadillac</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="tower" className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                        <span className="text-charcoal-700">Tower</span>
                    </label>
                </div>
                <input
                    type="text"
                    name="otherEquipment"
                    placeholder="Other equipment (comma separated)"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm"
                />
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-2.5 flex items-center justify-center gap-2 bg-charcoal-900 text-cream-50 rounded-lg font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-70">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Application'}
            </button>
        </form>
    )
}
