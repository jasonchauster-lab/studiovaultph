'use client'

import { useState, useRef, useEffect } from 'react'
import { addCertification, deleteCertification } from '@/app/(dashboard)/instructor/profile/actions'
import { Award, Plus, Trash2, Loader2, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { normalizeImageFile } from '@/lib/utils/image-utils'

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
            const certificateFile = formData.get('certificateFile') as File
            if (certificateFile) {
                const processedFile = await normalizeImageFile(certificateFile)
                formData.set('certificateFile', processedFile)
            }

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
        <div className="glass-card p-6 sm:p-12 relative overflow-hidden">
            {/* Decorative background bloom */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />

            <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/60 pb-6 mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
                            <h2 className="text-2xl sm:text-3xl font-serif text-charcoal tracking-tighter">Accreditations</h2>
                        </div>
                        <p className="text-[10px] font-black text-charcoal/60 uppercase tracking-[0.4em]">Verified Teaching Credentials & Lineage</p>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-forest text-white px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 w-full sm:w-auto"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <Plus className="w-4 h-4 text-gold stroke-[3px]" />
                                ADD NEW
                            </span>
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/60 space-y-10 mb-12 animate-in slide-in-from-top-4 duration-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <label className="block text-[10px] font-black text-charcoal/60 uppercase tracking-[0.3em] mb-4 ml-6">Certification Body</label>
                                <select
                                    name="certificationBody"
                                    required
                                    defaultValue=""
                                    className="w-full px-8 py-5 bg-white/40 border border-white/60 rounded-[2rem] text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer appearance-none shadow-sm"
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
                                <label className="block text-[10px] font-black text-charcoal/60 uppercase tracking-[0.3em] mb-4 ml-6">Credential Proof (PDF/IMG)</label>
                                <input
                                    type="file"
                                    name="certificateFile"
                                    ref={fileInputRef}
                                    required
                                    accept=".pdf,image/*,.heic,.heif"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) {
                                            setPreviewUrl(null)
                                            return
                                        }

                                        try {
                                            const previewFile = await normalizeImageFile(file)
                                            if (previewFile.type.startsWith('image/')) {
                                                const url = URL.createObjectURL(previewFile)
                                                setPreviewUrl(url)
                                            } else {
                                                setPreviewUrl(null)
                                            }
                                        } catch (err) {
                                            console.error('Preview error:', err)
                                            setPreviewUrl(null)
                                        }
                                    }}
                                    className="w-full px-8 py-3.5 bg-white/40 border border-white/60 rounded-[2rem] text-charcoal/60 text-[10px] font-black outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer file:mr-6 file:py-2.5 file:px-6 file:rounded-[20px] file:border-0 file:text-[9px] file:font-black file:bg-charcoal file:text-white file:uppercase file:tracking-[0.25em] shadow-sm"
                                />
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/60 inline-block shadow-sm">
                                <p className="text-[10px] font-black text-charcoal/60 uppercase tracking-[0.4em] mb-6">Verification Preview</p>
                                <div className="w-48 h-48 rounded-[20px] overflow-hidden shadow-cloud bg-alabaster/50 border border-white/60">
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

                        <div className="flex justify-end gap-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false)
                                    setPreviewUrl(null)
                                }}
                                className="px-10 py-5 text-[10px] font-black text-charcoal/60 uppercase tracking-[0.3em] hover:text-charcoal hover:bg-white/40 rounded-[20px] transition-all"
                            >
                                ABORT
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-4 bg-forest text-white px-12 py-5 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 disabled:opacity-50"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {certifications.length === 0 ? (
                        <div className="col-span-2 py-32 text-center glass-card border-dashed bg-white/20">
                            <Award className="w-16 h-16 text-charcoal/5 mx-auto mb-8 animate-pulse" />
                            <p className="text-charcoal/60 text-[10px] font-black uppercase tracking-[0.5em] italic">Zero accreditations on record</p>
                        </div>
                    ) : (
                        certifications.map((cert) => (
                            <div key={cert.id} className="group relative glass-card p-8 sm:p-12 border-white/60 hover:shadow-2xl hover:shadow-gold/5 transition-all duration-1000 overflow-hidden bg-white/40 active:scale-[0.98]">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-gold/10 transition-colors duration-1000" />
                                
                                <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10 relative z-10">
                                    <div className="p-6 bg-white rounded-[2.5rem] group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000 border border-white/60 shadow-sm relative shrink-0">
                                        <Award className="w-8 h-8 text-gold" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 text-center sm:text-left">
                                        <h4 className="font-serif text-charcoal text-2xl sm:text-3xl tracking-tighter mb-4">{cert.certification_body}</h4>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                                            <div className="flex items-center gap-2.5 text-[9px] font-black text-charcoal/50 uppercase tracking-[0.2em] shrink-0">
                                                <FileText className="w-3.5 h-3.5" />
                                                SUBMITTED
                                            </div>
                                            <div className={clsx(
                                                "flex items-center gap-2.5 text-[8px] font-black uppercase tracking-[0.25em] px-6 py-2 rounded-full border transition-all duration-1000 shadow-sm whitespace-nowrap",
                                                cert.verified
                                                    ? 'bg-sage text-white border-sage/20 shadow-sage/10'
                                                    : 'bg-gold/5 text-gold border-gold/20 shadow-gold/5'
                                            )}>
                                                {cert.verified ? (
                                                    <><CheckCircle className="w-3.5 h-3.5" /> VERIFIED</>
                                                ) : (
                                                    <><Clock className="w-3.5 h-3.5" /> PENDING</>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleDelete(cert.id)}
                                        className="p-5 text-charcoal/40 hover:text-red-500 hover:bg-red-50/50 rounded-full transition-all duration-700 opacity-100 sm:opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-100 active:scale-90"
                                        title="Purge Accreditation"
                                    >
                                        <Trash2 className="w-5 h-5" />
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
