'use client'

import { useState, useRef, useEffect } from 'react'
import { addCertification, deleteCertification } from '@/app/(dashboard)/instructor/profile/actions'
import { Award, Plus, Trash2, Loader2, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

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
        <div className="glass-card p-10 relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between border-b border-cream-100 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Award className="w-5 h-5 text-rose-gold" />
                            <h2 className="text-2xl font-serif text-charcoal tracking-tight">Accreditations</h2>
                        </div>
                        <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">Verified Teaching Credentials & Lineage</p>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-charcoal text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-charcoal/10"
                        >
                            <span className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-gold" />
                                Manifest New
                            </span>
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-alabaster/50 p-8 rounded-[2.5rem] border border-cream-100 space-y-8 mb-10 animate-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3 ml-4">Certification Body</label>
                                <select
                                    name="certificationBody"
                                    required
                                    defaultValue=""
                                    className="w-full px-6 py-4 bg-white border border-cream-100 rounded-[2rem] text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:border-rose-gold/30 transition-all uppercase tracking-[0.15em] cursor-pointer appearance-none shadow-sm"
                                >
                                    <option value="" disabled>SELECT ACCREDITATION TYPE...</option>
                                    <option value="STOTT">STOTT PILATES</option>
                                    <option value="BASI">BASI</option>
                                    <option value="Balanced Body">BALANCED BODY</option>
                                    <option value="Polestar">POLESTAR</option>
                                    <option value="Classical">CLASSICAL</option>
                                    <option value="Other">OTHER SEQUENCE</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3 ml-4">Credential Proof (PDF/IMG)</label>
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
                                    className="w-full px-6 py-2.5 bg-white border border-cream-100 rounded-[2rem] text-charcoal/40 text-[10px] font-black outline-none focus:ring-4 focus:ring-rose-gold/10 focus:border-rose-gold/30 transition-all uppercase tracking-[0.15em] cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:bg-charcoal file:text-white file:uppercase file:tracking-widest"
                                />
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="bg-white p-6 rounded-3xl border border-cream-100 inline-block">
                                <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest mb-4">Verification Preview</p>
                                <div className="w-40 h-40 rounded-2xl overflow-hidden shadow-inner bg-alabaster">
                                    <img src={previewUrl} alt="Certificate preview" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                                <AlertCircle className="w-4 h-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false)
                                    setPreviewUrl(null)
                                }}
                                className="px-8 py-4 text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] hover:text-charcoal transition-all"
                            >
                                ABORT
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-3 bg-charcoal text-white px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-charcoal/10 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                                ) : (
                                    <CheckCircle className="w-4 h-4 text-gold" />
                                )}
                                {isSubmitting ? 'PROCESSING...' : 'COMMIT FOR VERIFICATION'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certifications.length === 0 ? (
                        <div className="col-span-2 py-16 text-center">
                            <Award className="w-12 h-12 text-cream-200 mx-auto mb-4 opacity-50" />
                            <p className="text-charcoal/30 text-[10px] font-black uppercase tracking-[0.25em] italic">Zero accreditations on record</p>
                        </div>
                    ) : (
                        certifications.map((cert) => (
                            <div key={cert.id} className="group relative glass-card p-6 border-cream-100 hover:border-rose-gold/30 hover:shadow-2xl hover:shadow-rose-gold/5 transition-all duration-500 overflow-hidden">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-alabaster rounded-2xl group-hover:bg-white transition-colors duration-500 border border-cream-100 shadow-sm relative overflow-hidden">
                                        <Award className="w-7 h-7 text-charcoal/60 relative z-10" />
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-serif text-charcoal text-xl tracking-tight mb-1">{cert.certification_body}</h4>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-charcoal/30 uppercase tracking-widest">
                                                <FileText className="w-3.5 h-3.5 opacity-50" />
                                                SUBMITTED
                                            </div>
                                            <div className={clsx(
                                                "flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border transition-all duration-500",
                                                cert.verified
                                                    ? 'bg-sage text-white border-sage'
                                                    : 'bg-gold/5 text-gold border-gold/20'
                                            )}>
                                                {cert.verified ? (
                                                    <><CheckCircle className="w-3 h-3" /> VERIFIED</>
                                                ) : (
                                                    <><Clock className="w-3 h-3" /> PENDING</>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(cert.id)}
                                        className="p-3 text-charcoal/20 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                                        title="Purge Accreditation"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
