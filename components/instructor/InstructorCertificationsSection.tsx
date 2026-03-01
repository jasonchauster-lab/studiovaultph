'use client'

import { useState, useRef, useEffect } from 'react'
import { addCertification, deleteCertification } from '@/app/(dashboard)/instructor/profile/actions'
import { Award, Plus, Trash2, Loader2, FileText, CheckCircle, Clock } from 'lucide-react'

interface Certification {
    id: string
    certification_body: string
    certification_name: string
    proof_url: string
    verified: boolean
}

interface InstructorCertificationsSectionProps {
    certifications: Certification[]
}

export default function InstructorCertificationsSection({ certifications }: InstructorCertificationsSectionProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Cleanup preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        setIsSubmitting(true)
        setError(null)

        try {
            const result = await addCertification(formData)

            if (result.success) {
                setShowForm(false)
                setPreviewUrl(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
            } else {
                setError(result.error || 'Failed to add certification')
            }
        } catch (err: any) {
            console.error('Submission error:', err)
            setError(err.message || 'An unexpected error occurred. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this certification?')) return

        const result = await deleteCertification(id)
        if (!result.success) {
            alert(result.error || 'Failed to delete certification')
        }
    }

    return (
        <div className="bg-white p-8 rounded-2xl border border-cream-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                <div>
                    <h2 className="text-xl font-serif text-charcoal-900">Certifications</h2>
                    <p className="text-sm text-charcoal-500">Manage your teaching credentials (STOTT, BASI, etc.)</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-charcoal-50 border border-cream-200 text-charcoal-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-cream-100 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add New
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-cream-50 p-6 rounded-xl border border-cream-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Certification Body</label>
                            <select
                                name="certificationBody"
                                required
                                defaultValue=""
                                className="w-full px-4 py-2 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm"
                            >
                                <option value="" disabled>Select a certification body…</option>
                                <option value="STOTT">STOTT Pilates</option>
                                <option value="BASI">BASI</option>
                                <option value="Balanced Body">Balanced Body</option>
                                <option value="Polestar">Polestar</option>
                                <option value="Classical">Classical</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Proof of Certification (PDF/Image)</label>
                            <input
                                type="file"
                                name="certificateFile"
                                ref={fileInputRef}
                                required
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file && file.type.startsWith('image/')) {
                                        const url = URL.createObjectURL(file)
                                        setPreviewUrl(url)
                                    } else {
                                        setPreviewUrl(null)
                                    }
                                }}
                                className="w-full px-4 py-1.5 bg-white border border-cream-200 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-charcoal-100 file:text-charcoal-700 hover:file:bg-charcoal-200 cursor-pointer"
                            />
                        </div>
                    </div>

                    {previewUrl && (
                        <div className="mt-2">
                            <p className="text-xs text-charcoal-500 mb-2">Preview:</p>
                            <div className="w-32 h-32 rounded-lg border border-cream-200 overflow-hidden bg-white">
                                <img src={previewUrl} alt="Certificate preview" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    )}

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false)
                                setPreviewUrl(null)
                            }}
                            className="px-4 py-2 text-sm font-medium text-charcoal-600 hover:text-charcoal-900"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-charcoal-900 text-cream-50 px-6 py-2 rounded-lg text-sm font-medium hover:bg-charcoal-800 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Submit for Review
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {certifications.length === 0 ? (
                    <p className="text-center py-6 text-charcoal-500 text-sm italic">No certifications added yet.</p>
                ) : (
                    certifications.map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between p-4 bg-cream-50/50 rounded-xl border border-cream-100 hover:border-cream-200 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg border border-cream-100 shadow-sm">
                                    <Award className="w-6 h-6 text-charcoal-600" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-charcoal-900">{cert.certification_body}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-xs text-charcoal-500">
                                            <FileText className="w-3 h-3" />
                                            Proof submitted
                                        </div>
                                        <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cert.verified ? 'bg-rose-gold text-white border-rose-gold' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                            {cert.verified ? (
                                                <><CheckCircle className="w-2.5 h-2.5" /> Verified</>
                                            ) : (
                                                <><Clock className="w-2.5 h-2.5" /> Pending Review</>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(cert.id)}
                                className="p-2 text-charcoal-400 hover:text-red-600 transition-colors"
                                title="Delete certification"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
