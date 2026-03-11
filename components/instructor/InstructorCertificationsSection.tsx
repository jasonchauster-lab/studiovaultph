'use client'

import { useState, useRef, useEffect } from 'react'
import { addCertification, deleteCertification } from '@/app/(dashboard)/instructor/profile/actions'
import { Award, Plus, Trash2, Loader2, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { isHeicFile, ensureJpegFile } from '@/lib/utils/image-utils'

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
            if (certificateFile && isHeicFile(certificateFile)) {
                const processedFile = await ensureJpegFile(certificateFile)
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
        <div className="glass-card p-12 relative overflow-hidden">
            {/* Decorative background bloom */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between border-b border-white/60 pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Award className="w-6 h-6 text-gold" />
                            <h2 className="text-3xl font-serif text-charcoal tracking-tighter">Accreditations</h2>
                        </div>
                        <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em]">Verified Teaching Credentials & Lineage</p>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-charcoal text-white px-8 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95"
                        >
                            <span className="flex items-center gap-3">
                                <Plus className="w-4 h-4 text-gold stroke-[3px]" />
                                MANIFEST NEW
                            </span>
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/60 space-y-10 mb-12 animate-in slide-in-from-top-4 duration-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <label className="block text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] mb-4 ml-6">Certification Body</label>
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
                                <label className="block text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] mb-4 ml-6">Credential Proof (PDF/IMG)</label>
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

                                        if (file.type.startsWith('image/') || isHeicFile(file)) {
                                            try {
                                                let previewFile = file
                                                if (isHeicFile(file)) {
                                                    previewFile = await ensureJpegFile(file)
                                                }
                                                const url = URL.createObjectURL(previewFile)
                                                setPreviewUrl(url)
                                            } catch (err) {
                                                console.error('HEIC preview error:', err)
                                            }
                                        } else {
                                            setPreviewUrl(null)
                                        }
                                    }}
                                    className="w-full px-8 py-3.5 bg-white/40 border border-white/60 rounded-[2rem] text-charcoal/20 text-[10px] font-black outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold/30 transition-all uppercase tracking-[0.2em] cursor-pointer file:mr-6 file:py-2.5 file:px-6 file:rounded-[20px] file:border-0 file:text-[9px] file:font-black file:bg-charcoal file:text-white file:uppercase file:tracking-[0.25em] shadow-sm"
                                />
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/60 inline-block shadow-sm">
                                <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-6">Verification Preview</p>
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
                                className="px-10 py-5 text-[10px] font-black text-charcoal/20 uppercase tracking-[0.3em] hover:text-charcoal hover:bg-white/40 rounded-[20px] transition-all"
                            >
                                ABORT
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-4 bg-charcoal text-white px-12 py-5 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-cloud active:scale-95 disabled:opacity-50"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {certifications.length === 0 ? (
                        <div className="col-span-2 py-24 text-center glass-card border-dashed">
                            <Award className="w-16 h-16 text-charcoal/5 mx-auto mb-6" />
                            <p className="text-charcoal/20 text-[10px] font-black uppercase tracking-[0.4em] italic">Zero accreditations on record</p>
                        </div>
                    ) : (
                        certifications.map((cert) => (
                            <div key={cert.id} className="group relative glass-card p-10 border-white/60 hover:shadow-cloud transition-all duration-700 overflow-hidden">
                                <div className="flex items-center gap-8">
                                    <div className="p-5 bg-white/40 rounded-[20px] group-hover:bg-white transition-all duration-700 border border-white/60 shadow-sm relative overflow-hidden shrink-0">
                                        <Award className="w-8 h-8 text-gold relative z-10" />
                                        <div className="absolute top-0 right-0 w-10 h-10 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-serif text-charcoal text-2xl tracking-tighter mb-2">{cert.certification_body}</h4>
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-charcoal/20 uppercase tracking-[0.25em]">
                                                <FileText className="w-4 h-4 opacity-30" />
                                                SUBMITTED
                                            </div>
                                            <div className={clsx(
                                                "flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border transition-all duration-700 shadow-sm",
                                                cert.verified
                                                    ? 'bg-sage text-charcoal border-white/60'
                                                    : 'bg-gold/10 text-gold border-gold/20'
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
                                        className="p-4 text-charcoal/10 hover:text-red-600 hover:bg-red-50/50 rounded-[20px] transition-all duration-500 opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-100"
                                        title="Purge Accreditation"
                                    >
                                        <Trash2 className="w-5 h-5 stroke-[2.5px]" />
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
