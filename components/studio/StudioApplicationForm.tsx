'use client'

import { useState } from 'react'
import { createStudio } from '@/app/(dashboard)/studio/actions'
import { Loader2, Upload } from 'lucide-react'
import clsx from 'clsx'
import { STUDIO_AMENITIES } from '@/types'

function FileUploadBox({ name, label, required, fileName, previewUrl, accept, setFileState }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
            <div className="border-2 border-dashed border-cream-300 rounded-lg p-2 flex flex-col items-center justify-center bg-cream-50/50 hover:bg-cream-100/50 transition-colors relative cursor-pointer group h-[120px]">
                <input type="file" name={name} accept={accept} required={required}
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        const url = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null
                        setFileState(file ? file.name : null, url)
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {previewUrl ? (
                    <div className="relative w-full h-full z-20 group/preview block">
                        <img src={previewUrl} alt="Preview" className="h-full w-full object-contain cursor-pointer" onClick={(e) => { e.preventDefault(); window.open(previewUrl, '_blank'); }} />
                        <div className="absolute top-1 right-1 bg-charcoal-900/70 p-1 rounded-full text-white cursor-pointer opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-auto" onClick={(e) => { e.preventDefault(); setFileState(null, null); }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                    </div>
                ) : (
                    <>
                        <Upload className="w-5 h-5 text-charcoal-700 mb-1" />
                        <p className="text-[10px] text-center font-medium text-charcoal-700 px-2">{fileName || 'Click to upload'}</p>
                    </>
                )}
            </div>
        </div>
    )
}

export default function StudioApplicationForm() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const [birFileName, setBirFileName] = useState<string | null>(null)
    const [birPreviewUrl, setBirPreviewUrl] = useState<string | null>(null)

    const [govIdFileName, setGovIdFileName] = useState<string | null>(null)
    const [govIdPreviewUrl, setGovIdPreviewUrl] = useState<string | null>(null)

    const [insuranceFileName, setInsuranceFileName] = useState<string | null>(null)
    const [insurancePreviewUrl, setInsurancePreviewUrl] = useState<string | null>(null)

    const [spacePhotosUrls, setSpacePhotosUrls] = useState<string[]>([])
    const [selectedEquipment, setSelectedEquipment] = useState<Record<string, boolean>>({})

    const handleEquipmentChange = (id: string, checked: boolean) => {
        setSelectedEquipment(prev => ({ ...prev, [id]: checked }))
    }

    const handleSpacePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const urls = files.filter(f => f.type.startsWith('image/')).map(f => URL.createObjectURL(f))
        setSpacePhotosUrls(urls)
    }

    async function handleSubmit(formData: FormData) {
        setError(null)
        setIsLoading(true)

        // Custom validation: At least one equipment must be provided
        const hasReformer = formData.get('reformer') === 'on'
        const hasCadillac = formData.get('cadillac') === 'on'
        const hasTower = formData.get('tower') === 'on'
        const hasChair = formData.get('chair') === 'on'
        const hasLadderBarrel = formData.get('ladderBarrel') === 'on'
        const hasMat = formData.get('mat') === 'on'
        const otherEq = formData.get('otherEquipment') as string

        if (!hasReformer && !hasCadillac && !hasTower && !hasChair && !hasLadderBarrel && !hasMat && !otherEq.trim()) {
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
            console.error('Studio Form Submit Error:', err)
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
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Date of Birth of Authorized Representative <span className="text-red-500">*</span></label>
                <input type="date" name="dateOfBirth" required className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white" />
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
                    <optgroup label="Paranaque">
                        <option value="Paranaque - BF Homes">Paranaque - BF Homes</option>
                        <option value="Paranaque - Moonwalk / Merville">Paranaque - Moonwalk / Merville</option>
                        <option value="Paranaque - Bicutan / Sucat">Paranaque - Bicutan / Sucat</option>
                        <option value="Paranaque - Others">Paranaque - Others</option>
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
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Google Maps Link (Optional)</label>
                <input
                    type="url"
                    name="googleMapsUrl"
                    placeholder="e.g. https://maps.app.goo.gl/..."
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadBox
                    name="birCertificate"
                    label="BIR Certificate (Form 2303)"
                    required={true}
                    fileName={birFileName}
                    previewUrl={birPreviewUrl}
                    accept="image/*,.pdf"
                    setFileState={(name: string | null, url: string | null) => { setBirFileName(name); setBirPreviewUrl(url); }}
                />
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1">BIR Expiration Date <span className="text-red-500">*</span></label>
                    <input type="date" required name="birExpiry" className="w-full px-3 py-1.5 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadBox
                    name="govId"
                    label="Valid Government ID"
                    required={true}
                    fileName={govIdFileName}
                    previewUrl={govIdPreviewUrl}
                    accept="image/*,.pdf"
                    setFileState={(name: string | null, url: string | null) => { setGovIdFileName(name); setGovIdPreviewUrl(url); }}
                />
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1">ID Expiration Date <span className="text-red-500">*</span></label>
                    <input type="date" required name="govIdExpiry" className="w-full px-3 py-1.5 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadBox
                    name="insurance"
                    label="Insurance Policy (Optional)"
                    required={false}
                    fileName={insuranceFileName}
                    previewUrl={insurancePreviewUrl}
                    accept="image/*,.pdf"
                    setFileState={(name: string | null, url: string | null) => { setInsuranceFileName(name); setInsurancePreviewUrl(url); }}
                />
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-0.5">Insurance Expiration Date</label>
                    <p className="text-[10px] text-charcoal-500 italic mb-1">Optional</p>
                    <input type="date" name="insuranceExpiry" className="w-full px-3 py-1.5 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Photos of the Space <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-cream-300 rounded-lg p-4 bg-cream-50/50 relative cursor-pointer group">
                    <input type="file" name="spacePhotos" accept="image/*" multiple required onChange={handleSpacePhotosChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {spacePhotosUrls.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 relative z-20">
                            {spacePhotosUrls.map((url, i) => (
                                <img key={i} src={url} className="w-full aspect-square object-cover rounded cursor-pointer" onClick={(e) => { e.preventDefault(); window.open(url, '_blank'); }} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                            <Upload className="w-6 h-6 text-charcoal-700 mb-2" />
                            <p className="text-sm font-medium text-charcoal-700">Upload multiple photos</p>
                            <p className="text-[10px] text-charcoal-500 mt-1 italic text-center">showing the studio layout, equipment, and amenities.</p>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Equipment & Quantities <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    {[
                        { id: 'reformer', label: 'Reformer' },
                        { id: 'cadillac', label: 'Cadillac' },
                        { id: 'tower', label: 'Tower' },
                        { id: 'chair', label: 'Chair' },
                        { id: 'ladderBarrel', label: 'Ladder Barrel' },
                        { id: 'mat', label: 'Mat' }
                    ].map((eq) => {
                        const isChecked = selectedEquipment[eq.id] || false;
                        return (
                            <div key={eq.id} className="flex items-center gap-3 p-3 border border-cream-200 rounded-lg bg-cream-50">
                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                    <input type="checkbox" name={eq.id} checked={isChecked} onChange={(e) => handleEquipmentChange(eq.id, e.target.checked)} className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                                    <span className="text-charcoal-700 text-sm font-medium">{eq.label}</span>
                                </label>
                                <div className={clsx("flex items-center gap-2 transition-opacity", !isChecked && "opacity-30 pointer-events-none")}>
                                    <span className="text-xs text-charcoal-500">Qty:</span>
                                    <input
                                        type="number"
                                        name={`qty_${eq.label}`}
                                        min="1"
                                        defaultValue="1"
                                        disabled={!isChecked}
                                        className="w-16 px-2 py-1 border border-cream-300 rounded text-sm text-center focus:ring-1 focus:ring-charcoal-900 outline-none disabled:bg-cream-100 disabled:text-charcoal-400"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
                <input
                    type="text"
                    name="otherEquipment"
                    placeholder="Other equipment (comma separated)"
                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {STUDIO_AMENITIES.map((amenity) => (
                        <label key={amenity} className="flex items-center gap-2 p-2.5 border border-cream-200 rounded-lg bg-cream-50 cursor-pointer hover:bg-cream-100 transition-colors">
                            <input
                                type="checkbox"
                                name="amenities"
                                value={amenity}
                                className="w-4 h-4 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900"
                            />
                            <span className="text-charcoal-700 text-sm font-medium">{amenity}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-2.5 flex items-center justify-center gap-2 bg-charcoal-900 text-cream-50 rounded-lg font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-70">
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-green-400 font-semibold tracking-wide">Application submitted please wait...</span>
                    </>
                ) : 'Submit Application'}
            </button>
        </form>
    )
}
