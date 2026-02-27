'use client'

import { useState, useRef } from 'react'
import { createStudio } from '@/app/(dashboard)/studio/actions'
import { Loader2, Upload, CheckCircle, X, ShieldCheck, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { STUDIO_AMENITIES } from '@/types'

function FileUploadBox({ name, label, required, fileName, previewUrl, accept, setFileState }: any) {
    return (
        <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">{label} {required && <span className="text-rose-gold font-bold">*</span>}</label>
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
                        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                            <img src={previewUrl} alt="Preview" className="h-full w-full object-contain cursor-pointer" />
                        </a>
                        <div className="absolute top-1 right-1 bg-charcoal-900/70 p-1 rounded-full text-white cursor-pointer opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-auto z-30" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFileState(null, null); }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                    </div>
                ) : fileName ? (
                    <div className="flex flex-col items-center justify-center w-full h-full z-20 relative group/file">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1 bg-green-100">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-[10px] text-center font-medium text-charcoal-700 px-2 line-clamp-2 max-w-[90%] break-all">{fileName}</p>
                        <div className="absolute top-1 right-1 bg-charcoal-900/70 p-1 rounded-full text-white cursor-pointer opacity-0 group-hover/file:opacity-100 transition-opacity pointer-events-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFileState(null, null); }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </div>
                    </div>
                ) : (
                    <>
                        <Upload className="w-5 h-5 text-rose-gold mb-1" />
                        <p className="text-[10px] text-center font-medium text-charcoal-700 px-2">Click to upload</p>
                        {accept && <p className="text-[8px] text-center text-charcoal-500 mt-0.5 max-w-[90%] break-words">{accept.replace(/,/g, ', ')}</p>}
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

    const [spacePhotos, setSpacePhotos] = useState<File[]>([])
    const spacePhotosInputRef = useRef<HTMLInputElement>(null)
    const [selectedEquipment, setSelectedEquipment] = useState<Record<string, boolean>>({})

    const handleEquipmentChange = (id: string, checked: boolean) => {
        setSelectedEquipment(prev => ({ ...prev, [id]: checked }))
    }

    const handleSpacePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const imageFiles = files.filter(f => f.type.startsWith('image/'))
        if (imageFiles.length > 0) {
            setSpacePhotos(prev => [...prev, ...imageFiles])
        }
        if (spacePhotosInputRef.current) {
            spacePhotosInputRef.current.value = ''
        }
    }

    const removeSpacePhoto = (e: React.MouseEvent, indexToRemove: number) => {
        e.preventDefault()
        setSpacePhotos(prev => prev.filter((_, idx) => idx !== indexToRemove))
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        setError(null)
        setIsLoading(true)

        if (spacePhotos.length === 0) {
            setError('Please upload at least one photo of the space.')
            setIsLoading(false)
            return
        }

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
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('You must be logged in to apply.')
            }

            const timestamp = Date.now()

            // Upload BIR
            const birFile = formData.get('birCertificate') as File
            if (birFile && birFile.size > 0) {
                const ext = birFile.name.split('.').pop()
                const path = `studios/${user.id}/bir_${timestamp}.${ext}`
                const { error: birErr } = await supabase.storage.from('certifications').upload(path, birFile)
                if (birErr) throw new Error('Failed to upload BIR Certificate: ' + birErr.message)

                const { data: { publicUrl } } = supabase.storage.from('certifications').getPublicUrl(path)
                formData.set('birCertificateUrl', publicUrl)
            }
            formData.delete('birCertificate')

            // Upload Gov ID
            const govIdFile = formData.get('govId') as File
            if (govIdFile && govIdFile.size > 0) {
                const ext = govIdFile.name.split('.').pop()
                const path = `studios/${user.id}/govid_${timestamp}.${ext}`
                const { error: govErr } = await supabase.storage.from('certifications').upload(path, govIdFile)
                if (govErr) throw new Error('Failed to upload Government ID: ' + govErr.message)

                const { data: { publicUrl } } = supabase.storage.from('certifications').getPublicUrl(path)
                formData.set('govIdUrl', publicUrl)
            }
            formData.delete('govId')

            // Upload Insurance
            const insuranceFile = formData.get('insurance') as File
            if (insuranceFile && insuranceFile.size > 0) {
                const ext = insuranceFile.name.split('.').pop()
                const path = `studios/${user.id}/insurance_${timestamp}.${ext}`
                const { error: insErr } = await supabase.storage.from('certifications').upload(path, insuranceFile)
                if (insErr) throw new Error('Failed to upload Insurance/Permit: ' + insErr.message)

                const { data: { publicUrl } } = supabase.storage.from('certifications').getPublicUrl(path)
                formData.set('insuranceUrl', publicUrl)
            }
            formData.delete('insurance')

            // Upload Space Photos directly (bypassing append to formData previously)
            for (let i = 0; i < spacePhotos.length; i++) {
                const file = spacePhotos[i]
                if (file.size > 0) {
                    const ext = file.name.split('.').pop()
                    const path = `studios/${user.id}/space_${timestamp}_${i}.${ext}`
                    const { error: photoErr } = await supabase.storage.from('avatars').upload(path, file)
                    if (photoErr) throw new Error('Failed to upload space photo: ' + photoErr.message)

                    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
                    formData.append('spacePhotosUrls', publicUrl)
                }
            }
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
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Studio Name <span className="text-rose-gold font-bold">*</span></label>
                <input name="name" required placeholder="e.g. Pilates Logic" className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 transition-all" />
            </div>
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Contact Number <span className="text-rose-gold font-bold">*</span></label>
                <input name="contactNumber" required placeholder="e.g. +63 917 123 4567" className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 transition-all font-mono" />
                <p className="text-[10px] text-charcoal-500 mt-1 italic">
                    We will reach out through this number to confirm your studio's application and booking details.
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Date of Birth of Authorized Representative <span className="text-rose-gold font-bold">*</span></label>
                <input type="date" name="dateOfBirth" required className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white transition-all" />
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Location <span className="text-rose-gold font-bold">*</span></label>
                <select name="location" required className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white transition-all">
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
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Detailed Address <span className="text-rose-gold font-bold">*</span></label>
                <textarea
                    name="address"
                    required
                    placeholder="e.g. Unit 302, One Building, Ayala Ave"
                    className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 h-24 transition-all"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Google Maps Link (Optional)</label>
                <input
                    type="url"
                    name="googleMapsUrl"
                    placeholder="e.g. https://maps.app.goo.gl/..."
                    className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <FileUploadBox
                        name="birCertificate"
                        label="BIR Certificate (Form 2303)"
                        required={true}
                        fileName={birFileName}
                        previewUrl={birPreviewUrl}
                        accept=".jpg,.jpeg,.png,.pdf"
                        setFileState={(name: string | null, url: string | null) => { setBirFileName(name); setBirPreviewUrl(url); }}
                    />
                    <p className="text-[10px] text-charcoal-500 mt-2 italic flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-rose-gold" />
                        Used only for secure identity verification and automated payouts.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <FileUploadBox
                        name="govId"
                        label="Valid Government ID"
                        required={true}
                        fileName={govIdFileName}
                        previewUrl={govIdPreviewUrl}
                        accept=".jpg,.jpeg,.png,.pdf"
                        setFileState={(name: string | null, url: string | null) => { setGovIdFileName(name); setGovIdPreviewUrl(url); }}
                    />
                    <p className="text-[10px] text-charcoal-500 mt-2 italic flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-rose-gold" />
                        Used only for secure identity verification and automated payouts.
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1">ID Expiration Date <span className="text-rose-gold font-bold">*</span></label>
                    <input type="date" required name="govIdExpiry" className="w-full px-5 py-3 border border-cream-200 bg-cream-50/20 rounded-xl text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm transition-all" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadBox
                    name="insurance"
                    label="Insurance Policy (Optional)"
                    required={false}
                    fileName={insuranceFileName}
                    previewUrl={insurancePreviewUrl}
                    accept=".jpg,.jpeg,.png,.pdf"
                    setFileState={(name: string | null, url: string | null) => { setInsuranceFileName(name); setInsurancePreviewUrl(url); }}
                />
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-0.5">Insurance Expiration Date</label>
                    <p className="text-[10px] text-charcoal-500 italic mb-1">Optional</p>
                    <input type="date" name="insuranceExpiry" className="w-full px-3 py-1.5 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm" />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">Photos of the Space <span className="text-rose-gold font-bold">*</span></label>
                <div className="bg-cream-50 p-6 rounded-lg border border-cream-200">
                    {spacePhotos.length > 0 && (
                        <div className="mb-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {spacePhotos.map((file, i) => {
                                    const url = URL.createObjectURL(file)
                                    return (
                                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-cream-200 shadow-sm z-30">
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                <img src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" alt={`Space Photo ${i + 1}`} />
                                            </a>
                                            <button
                                                onClick={(e) => removeSpacePhoto(e, i)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm z-40 opacity-0 group-hover:opacity-100"
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

                    <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-cream-300 rounded-lg hover:bg-cream-100/50 transition-colors cursor-pointer" onClick={() => spacePhotosInputRef.current?.click()}>
                        <Upload className="w-6 h-6 text-charcoal-400 mb-2" />
                        <p className="text-sm font-medium text-charcoal-700">Click to add photos</p>
                        <p className="text-[10px] text-charcoal-500 mt-1 italic text-center">Images only. Show the studio layout, equipment, and amenities.</p>
                        <input type="file" accept="image/*" multiple onChange={handleSpacePhotosChange} ref={spacePhotosInputRef} className="hidden" />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-2">Available Equipment & Quantities <span className="text-rose-gold font-bold">*</span></label>
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
                            <div key={eq.id} className="flex flex-col gap-3 p-4 border border-cream-200 rounded-lg bg-cream-50 transition-all">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name={eq.id} checked={isChecked} onChange={(e) => handleEquipmentChange(eq.id, e.target.checked)} className="w-4 h-4 shrink-0 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900" />
                                    <span className="text-charcoal-700 text-sm font-bold">{eq.label}</span>
                                </label>
                                <div className={clsx("flex items-center gap-4 transition-all", !isChecked && "opacity-30 pointer-events-none")}>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-charcoal-500 font-bold uppercase tracking-tight">Qty:</span>
                                        <input
                                            type="number"
                                            name={`qty_${eq.label}`}
                                            min="1"
                                            defaultValue="1"
                                            disabled={!isChecked}
                                            className="w-16 px-2 py-1.5 border border-cream-200 rounded-lg text-sm text-center text-charcoal-900 bg-white focus:ring-2 focus:ring-charcoal-900 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 grow">
                                        <span className="text-[10px] text-charcoal-500 font-bold uppercase tracking-tight">Rate:</span>
                                        <div className="relative grow">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs">₱</span>
                                            <input
                                                type="number"
                                                name={`price_${eq.label}`}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                disabled={!isChecked}
                                                className="w-full pl-7 pr-3 py-1.5 border border-cream-200 rounded-lg text-sm text-charcoal-900 bg-white focus:ring-2 focus:ring-charcoal-900 outline-none"
                                            />
                                        </div>
                                    </div>
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
                        <label key={amenity} className="flex items-start gap-2.5 p-3 border border-cream-200 rounded-lg bg-cream-50 cursor-pointer hover:bg-cream-100 transition-colors min-h-[52px]">
                            <input
                                type="checkbox"
                                name="amenities"
                                value={amenity}
                                className="w-4 h-4 mt-0.5 shrink-0 text-charcoal-900 border-cream-300 rounded focus:ring-charcoal-900"
                            />
                            <span className="text-charcoal-700 text-sm font-medium leading-tight">{amenity}</span>
                        </label>
                    ))}
                </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-4 flex items-center justify-center gap-3 bg-rose-gold text-white rounded-xl font-bold text-lg hover:brightness-110 transition-all shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-70 group">
                {isLoading ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-white/80 font-medium tracking-wide">Processing application...</span>
                    </>
                ) : (
                    <>
                        <span>Submit Application</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
        </form>
    )
}
