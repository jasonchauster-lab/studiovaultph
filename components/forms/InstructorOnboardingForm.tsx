'use client'

import { useState } from 'react'
import { submitInstructorOnboarding } from '@/app/(dashboard)/instructor/onboarding/actions'
import Link from 'next/link'
import { Upload, CheckCircle, AlertCircle, Loader2, ShieldCheck, ArrowRight, X } from 'lucide-react'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import ImageCropper from '@/components/shared/ImageCropper'
import clsx from 'clsx'
import { isValidPhone, phoneErrorMessage } from '@/lib/validation'
import Image from 'next/image'

export default function InstructorOnboardingForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [certificationBody, setCertificationBody] = useState('')
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [govIdFileName, setGovIdFileName] = useState<string | null>(null)
    const [govIdPreviewUrl, setGovIdPreviewUrl] = useState<string | null>(null)
    const [birFileName, setBirFileName] = useState<string | null>(null)
    const [birPreviewUrl, setBirPreviewUrl] = useState<string | null>(null)

    // Actual files to be submitted
    const [certFile, setCertFile] = useState<File | null>(null)
    const [govIdFile, setGovIdFile] = useState<File | null>(null)
    const [birFile, setBirFile] = useState<File | null>(null)

    // Cropper State
    const [cropperConfig, setCropperConfig] = useState<{
        isOpen: boolean;
        image: string;
        aspectRatio: number;
        onCrop: (file: File) => void;
        title: string;
    } | null>(null)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        const formData = new FormData(event.currentTarget)

        const contactNumber = formData.get('contactNumber') as string
        if (contactNumber && !isValidPhone(contactNumber)) {
            setMessage({ type: 'error', text: phoneErrorMessage })
            setIsSubmitting(false)
            return
        }

        try {
            if (certFile) formData.set('certificateFile', certFile)
            if (govIdFile) formData.set('govIdFile', govIdFile)
            if (birFile) formData.set('birFile', birFile)

            const result = await submitInstructorOnboarding(formData)
            if (result?.error) {
                setMessage({ type: 'error', text: result.error })
            } else {
                setMessage({ type: 'success', text: 'Application submitted successfully!' })
                // Reset form
                setCertificationBody('')
                setSelectedFileName(null)
                if (previewUrl) URL.revokeObjectURL(previewUrl)
                setPreviewUrl(null)
                setGovIdFileName(null)
                if (govIdPreviewUrl) URL.revokeObjectURL(govIdPreviewUrl)
                setGovIdPreviewUrl(null)
                setBirFileName(null)
                if (birPreviewUrl) URL.revokeObjectURL(birPreviewUrl)
                setBirPreviewUrl(null)
                if (event.target instanceof HTMLFormElement) {
                    event.target.reset()
                }
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="atelier-card w-full bg-white shadow-tight overflow-hidden mb-12 border border-border-grey">
            <div className="p-10 border-b border-border-grey bg-off-white/30">
                <h2 className="text-2xl font-serif text-burgundy mb-2 tracking-tight">Technical details</h2>
                <p className="text-[11px] font-bold text-charcoal/40 uppercase tracking-[0.2em]">Partner Registration & Credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                {/* Personal Info Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Full Name */}
                    <div className="space-y-3">
                        <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                            Full Legal Name <span className="text-burgundy">*</span>
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            required
                            className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all placeholder:text-charcoal/20 text-sm"
                            placeholder="e.g. Maria Clara"
                        />
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-3">
                        <label htmlFor="dateOfBirth" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                            Date of Birth <span className="text-burgundy">*</span>
                        </label>
                        <input
                            type="date"
                            id="dateOfBirth"
                            name="dateOfBirth"
                            required
                            className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Instagram Handle */}
                    <div className="space-y-3">
                        <label htmlFor="instagramHandle" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                            Instagram Profile <span className="text-burgundy">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-charcoal/30 font-bold">@</span>
                            <input
                                type="text"
                                id="instagramHandle"
                                name="instagramHandle"
                                required
                                className="w-full pl-12 pr-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all placeholder:text-charcoal/20 text-sm"
                                placeholder="handle"
                            />
                        </div>
                    </div>

                    {/* Contact Number */}
                    <div className="space-y-3">
                        <label htmlFor="contactNumber" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                            Mobile Number <span className="text-burgundy">*</span>
                        </label>
                        <input
                            type="tel"
                            id="contactNumber"
                            name="contactNumber"
                            required
                            maxLength={13}
                            className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all placeholder:text-charcoal/20 text-sm"
                            placeholder="0917XXXXXXX"
                        />
                    </div>
                </div>

                {/* Certification Group */}
                <div className="pt-8 border-t border-border-grey">
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-burgundy/40 mb-8">Professional Credentials</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Certification Body */}
                        <div className="space-y-3">
                            <label htmlFor="certificationBody" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                                Certification Body <span className="text-burgundy">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    id="certificationBody"
                                    name="certificationBody"
                                    required
                                    value={certificationBody}
                                    onChange={(e) => setCertificationBody(e.target.value)}
                                    className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all appearance-none cursor-pointer text-sm"
                                >
                                    <option value="" disabled>Select Body...</option>
                                    <option value="STOTT">STOTT Pilates</option>
                                    <option value="BASI">BASI</option>
                                    <option value="Balanced Body">Balanced Body</option>
                                    <option value="Polestar">Polestar</option>
                                    <option value="Classical">Classical</option>
                                    <option value="Other">Other (Specify)</option>
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/30">
                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                </div>
                            </div>
                        </div>

                        {/* Other Certification Field (Conditional) */}
                        {certificationBody === 'Other' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label htmlFor="otherCertification" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                                    Certification Name
                                </label>
                                <input
                                    type="text"
                                    id="otherCertification"
                                    name="otherCertification"
                                    required
                                    className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all text-sm"
                                    placeholder="e.g. Classic Pilates UK"
                                />
                            </div>
                        )}
                    </div>

                    {/* Certificate Upload */}
                    <div className="mt-8 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                            Certificate of Qualification <span className="text-burgundy">*</span>
                        </label>
                        <div className="border-2 border-dashed border-forest/20 rounded-2xl p-8 flex flex-col items-center justify-center bg-forest/5 hover:bg-forest/10 transition-colors relative cursor-pointer group">
                            <input
                                type="file"
                                id="certificateFile"
                                name="certificateFile"
                                accept=".pdf,.jpg,.jpeg,.png"
                                required
                                onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    setSelectedFileName(file.name)
                                    if (file.type.startsWith('image/')) {
                                        const processed = await normalizeImageFile(file)
                                        setCropperConfig({
                                            isOpen: true,
                                            image: URL.createObjectURL(processed),
                                            aspectRatio: 3 / 4,
                                            title: 'Crop Certificate',
                                            onCrop: (cropped) => {
                                                setCertFile(cropped)
                                                setPreviewUrl(URL.createObjectURL(cropped))
                                            }
                                        })
                                    } else {
                                        setCertFile(file)
                                        setPreviewUrl(null)
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {previewUrl ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 z-20 group">
                                    <Image
                                        src={previewUrl}
                                        alt="Certificate Preview"
                                        fill
                                        className="object-contain bg-white"
                                    />
                                    <div className="absolute top-4 right-4 bg-burgundy/80 p-2 rounded-full text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => { e.preventDefault(); setPreviewUrl(null); setSelectedFileName(null); }}>
                                        <X className="w-4 h-4" />
                                    </div>
                                </div>
                            ) : (
                                <div className={clsx(
                                    "w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all",
                                    selectedFileName ? "bg-forest text-white" : "bg-white text-forest shadow-tight group-hover:scale-110"
                                )}>
                                    {selectedFileName ? (
                                        <CheckCircle className="w-6 h-6" />
                                    ) : (
                                        <Upload className="w-6 h-6" />
                                    )}
                                </div>
                            )}
                            <p className="text-xs font-bold text-charcoal uppercase tracking-widest">
                                {selectedFileName || 'Add Certificate'}
                            </p>
                            <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-[0.2em] mt-2">PDF, JPG, or PNG (max 5MB)</p>
                        </div>
                    </div>
                </div>

                {/* Legal Group */}
                <div className="pt-8 border-t border-border-grey space-y-8">
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-burgundy/40 mb-8">Verification & Payouts</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* TIN */}
                        <div className="space-y-3">
                            <label htmlFor="tin" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                                Tax ID (TIN) <span className="text-burgundy">*</span>
                            </label>
                            <input
                                type="text"
                                id="tin"
                                name="tin"
                                required
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-mono font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all placeholder:text-charcoal/20 text-sm"
                                placeholder="000-000-000-000"
                            />
                        </div>

                        {/* ID Expiry */}
                        <div className="space-y-3">
                            <label htmlFor="govIdExpiry" className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                                ID Expiration <span className="text-burgundy">*</span>
                            </label>
                            <input
                                type="date"
                                id="govIdExpiry"
                                name="govIdExpiry"
                                required
                                className="w-full px-6 py-4 bg-off-white border border-border-grey rounded-2xl text-charcoal font-bold focus:ring-2 focus:ring-forest/20 focus:border-forest outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* ID Upload */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">
                            Valid Government ID <span className="text-burgundy">*</span>
                        </label>
                        <div className="border-2 border-dashed border-forest/20 rounded-2xl p-8 flex flex-col items-center justify-center bg-forest/5 hover:bg-forest/10 transition-colors relative cursor-pointer group">
                            <input
                                type="file"
                                name="govIdFile"
                                accept=".jpg,.jpeg,.png,.pdf"
                                required
                                onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    setGovIdFileName(file.name)
                                    if (file.type.startsWith('image/')) {
                                        const processed = await normalizeImageFile(file)
                                        setCropperConfig({
                                            isOpen: true,
                                            image: URL.createObjectURL(processed),
                                            aspectRatio: 4 / 3,
                                            title: 'Crop Government ID',
                                            onCrop: (cropped) => {
                                                setGovIdFile(cropped)
                                                setGovIdPreviewUrl(URL.createObjectURL(cropped))
                                            }
                                        })
                                    } else {
                                        setGovIdFile(file)
                                        setGovIdPreviewUrl(null)
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {govIdPreviewUrl ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-4 z-20 group">
                                    <Image
                                        src={govIdPreviewUrl}
                                        alt="ID Preview"
                                        fill
                                        className="object-contain bg-white"
                                    />
                                    <div className="absolute top-4 right-4 bg-burgundy/80 p-2 rounded-full text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => { e.preventDefault(); setGovIdPreviewUrl(null); setGovIdFileName(null); }}>
                                        <X className="w-4 h-4" />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <ShieldCheck className="w-10 h-10 text-forest mb-4" />
                                    <p className="text-xs font-bold text-charcoal uppercase tracking-widest">
                                        {govIdFileName || 'Add ID Image'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Policy Group */}
                <div className="pt-8 border-t border-border-grey space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 px-1">Platform Policies</label>
                    <div className="earth-card bg-off-white border border-border-grey p-8 space-y-4">
                        <div className="h-40 overflow-y-auto pr-4 text-[11px] text-charcoal/60 space-y-6 scrollbar-thin scrollbar-thumb-forest/20 leading-relaxed font-medium">
                            <div>
                                <p className="font-black text-burgundy uppercase tracking-widest mb-2">1. The 24-Hour Strict Cancellation Rule</p>
                                <p>Studio Vault PH enforces a strict 24-hour cancellation policy. Any session cancelled less than 24 hours before the scheduled start time is considered a "Late Cancellation" and is subject to automated penalties.</p>
                            </div>
                            <div>
                                <p className="font-black text-burgundy uppercase tracking-widest mb-2">2. Instructor-Initiated Late Cancellations</p>
                                <p>If an Instructor cancels within the 24-hour window: The Client receives a 100% refund. The Instructor’s Wallet will be immediately deducted the cost of the Studio Rental Fee, which is credited to the Studio.</p>
                            </div>
                            <div>
                                <p className="font-black text-burgundy uppercase tracking-widest mb-2">3. Studio-Initiated Late Cancellations</p>
                                <p>If a Studio cancels within the 24-hour window: The Client receives a 100% refund. The Studio’s Wallet is deducted a Displacement Fee (equal to the Studio Rental Rate), which is credited to the Instructor’s Wallet.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 px-2">
                        <input
                            id="policyAgree"
                            name="policyAgree"
                            type="checkbox"
                            required
                            className="w-5 h-5 mt-0.5 text-forest border-border-grey rounded-lg focus:ring- forest/20 cursor-pointer"
                        />
                        <label htmlFor="policyAgree" className="text-xs text-charcoal font-medium leading-relaxed cursor-pointer">
                            I verify that all information provided is accurate and I agree to the <Link href="/terms-of-service" target="_blank" className="text-forest font-bold hover:underline underline-offset-4">Studio Vault Professional Terms</Link>.
                        </label>
                    </div>
                </div>

                {/* Notifications */}
                {message && (
                    <div className={clsx(
                        "p-6 rounded-2xl flex items-center gap-4 text-xs font-bold uppercase tracking-widest border animate-in fade-in slide-in-from-top-4 duration-500",
                        message.type === 'success' ? "bg-forest/5 text-forest border-forest/20" : "bg-burgundy/5 text-burgundy border-burgundy/20"
                    )}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                        {message.text}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-6 px-8 bg-forest text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-forest/10 disabled:opacity-50 group mt-12"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <span>Submit Application</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

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
        </div>
    )
}
