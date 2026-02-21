'use client'

import { useState } from 'react'
import { submitInstructorOnboarding } from '@/app/(dashboard)/instructor/onboarding/actions'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function InstructorOnboardingForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [certificationBody, setCertificationBody] = useState('')
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsSubmitting(true)
        setMessage(null)

        const formData = new FormData(event.currentTarget)

        try {
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
        <div className="w-full max-w-lg mx-auto bg-card border border-cream-300 rounded-xl shadow-sm overflow-hidden">
            <div className="p-8 bg-cream-50 border-b border-cream-200">
                <h2 className="text-2xl font-serif text-charcoal-900 mb-2">Instructor Application</h2>
                <p className="text-charcoal-600">Join the StudioVaultPH network. Please provide your details and certification.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white/50 backdrop-blur-sm">

                {/* Full Name */}
                <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-sm font-medium text-charcoal-800">
                        Full Name
                    </label>
                    <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        className="w-full px-4 py-2 bg-cream-50 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-400"
                        placeholder="e.g. Jane Doe"
                    />
                </div>

                {/* Instagram Handle */}
                <div className="space-y-2">
                    <label htmlFor="instagramHandle" className="block text-sm font-medium text-charcoal-800">
                        Instagram Handle
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-500">@</span>
                        <input
                            type="text"
                            id="instagramHandle"
                            name="instagramHandle"
                            required
                            className="w-full pl-8 pr-4 py-2 bg-cream-50 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-400"
                            placeholder="pilatesjane"
                        />
                    </div>
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-charcoal-800">
                        Contact Number
                    </label>
                    <input
                        type="tel"
                        id="contactNumber"
                        name="contactNumber"
                        required
                        className="w-full px-4 py-2 bg-cream-50 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-400"
                        placeholder="e.g. +63 917 123 4567"
                    />
                </div>

                {/* Certification Body */}
                <div className="space-y-2">
                    <label htmlFor="certificationBody" className="block text-sm font-medium text-charcoal-800">
                        Certification Body
                    </label>
                    <div className="relative">
                        <select
                            id="certificationBody"
                            name="certificationBody"
                            required
                            value={certificationBody}
                            onChange={(e) => setCertificationBody(e.target.value)}
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-300 rounded-lg focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all appearance-none cursor-pointer text-charcoal-800"
                        >
                            <option value="" disabled>Select your certification...</option>
                            <option value="STOTT">STOTT Pilates</option>
                            <option value="BASI">BASI Pilates</option>
                            <option value="Balanced Body">Balanced Body</option>
                            <option value="Polestar">Polestar Pilates</option>
                            <option value="Other">Other (Type below)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Other Certification Field (Conditional) */}
                {certificationBody === 'Other' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label htmlFor="otherCertification" className="block text-sm font-medium text-charcoal-800">
                            Certification Name
                        </label>
                        <input
                            type="text"
                            id="otherCertification"
                            name="otherCertification"
                            required
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-300 rounded-lg text-charcoal-900 focus:ring-2 focus:ring-charcoal-900 focus:border-transparent outline-none transition-all placeholder:text-charcoal-400"
                            placeholder="e.g. Classic Pilates UK"
                        />
                    </div>
                )}

                {/* Certificate Upload */}
                <div className="space-y-2">
                    <label htmlFor="certificateFile" className="block text-sm font-medium text-charcoal-800">
                        Upload Certificate
                    </label>
                    <div className="border-2 border-dashed border-cream-300 rounded-lg p-6 flex flex-col items-center justify-center bg-cream-50/50 hover:bg-cream-100/50 transition-colors relative cursor-pointer group">
                        <input
                            type="file"
                            id="certificateFile"
                            name="certificateFile"
                            accept=".pdf,.jpg,.jpeg,.png"
                            required
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                setSelectedFileName(file ? file.name : null)
                                if (file && file.type.startsWith('image/')) {
                                    const url = URL.createObjectURL(file)
                                    setPreviewUrl(url)
                                } else {
                                    setPreviewUrl(null)
                                }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {previewUrl ? (
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
                                <img
                                    src={previewUrl}
                                    alt="Certificate Preview"
                                    className="w-full h-full object-contain bg-cream-100"
                                />
                                <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <p className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Click to change</p>
                                </div>
                            </div>
                        ) : (
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors",
                                selectedFileName ? "bg-green-100" : "bg-cream-200 group-hover:bg-cream-300"
                            )}>
                                {selectedFileName ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <Upload className="w-5 h-5 text-charcoal-700" />
                                )}
                            </div>
                        )}
                        <p className="text-sm font-medium text-charcoal-700">
                            {selectedFileName || 'Click to upload or drag and drop'}
                        </p>
                        <p className="text-xs text-charcoal-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
                    </div>
                </div>

                {/* Notifications */}
                {message && (
                    <div className={clsx(
                        "p-3 rounded-lg flex items-center gap-3 text-sm",
                        message.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
                    )}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {message.text}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-charcoal-900 text-cream-50 rounded-lg font-medium hover:bg-charcoal-800 focus:ring-4 focus:ring-charcoal-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Application'
                    )}
                </button>
            </form>
        </div>
    )
}
