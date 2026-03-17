'use client'

import { X, Star, Award, Instagram } from 'lucide-react'
import Link from 'next/link'

interface InstructorPreviewModalProps {
    instructor: any
    details: any
    loading: boolean
    onClose: () => void
}

export default function InstructorPreviewModal({ instructor, details, loading, onClose }: InstructorPreviewModalProps) {
    if (!instructor) return null

    const avatarUrl = (() => {
        const url = details?.instructor?.avatar_url || instructor?.avatar_url
        if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.full_name || 'I')}&background=F5F2EB&color=2C3230`
        if (url.startsWith('http')) return url
        return `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${url}`
    })()

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm text-charcoal/40 hover:text-charcoal hover:bg-white transition-all shadow-sm"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="overflow-y-auto flex-1 p-6 scrollbar-hide">
                    {/* Header */}
                    <div className="flex flex-col items-center mt-2 mb-5 text-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-tight relative z-10 bg-cream-50">
                            <img 
                                src={avatarUrl} 
                                className="w-full h-full object-cover" 
                                alt={instructor.full_name} 
                                loading="lazy"
                            />
                        </div>
                        <h3 className="text-2xl font-serif text-charcoal tracking-tight leading-tight">{instructor.full_name}</h3>
                        
                        {(details?.instructor?.instagram_handle || instructor.instagram_handle) && (
                            <a 
                                href={`https://instagram.com/${details?.instructor?.instagram_handle || instructor.instagram_handle}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-burgundy/40 hover:text-burgundy transition-colors"
                            >
                                <Instagram className="w-3 h-3" />
                                @{details?.instructor?.instagram_handle || instructor.instagram_handle}
                            </a>
                        )}

                        {!loading && details && (
                            <div className="flex items-center gap-1 mt-4 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 shadow-sm">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < Math.round(details.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
                                ))}
                                {details.totalCount > 0 && (
                                    <span className="text-[10px] text-amber-900/60 font-bold ml-1">{details.totalCount} REVIEW{details.totalCount === 1 ? '' : 'S'}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-charcoal/30">
                            <div className="w-8 h-8 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Hydrating Instructor Registry...</p>
                        </div>
                    )}

                    {!loading && details && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {details.instructor?.bio && (
                                <div className="bg-cream-50 p-5 rounded-2xl border border-cream-100/50 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-burgundy/10 group-hover:bg-burgundy/30 transition-colors" />
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-2 opacity-40">MISSION</h4>
                                    <p className="text-[13px] text-charcoal/70 leading-relaxed italic font-medium">"{details.instructor.bio}"</p>
                                </div>
                            )}

                            {details.certifications?.length > 0 && (
                                <div className="bg-off-white/50 p-5 rounded-2xl border border-charcoal/5">
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-3 opacity-40 flex items-center gap-2">
                                        <Award className="w-3.5 h-3.5" /> ACCREDITATIONS
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {details.certifications.map((cert: any, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-white text-charcoal/70 text-[10px] font-black uppercase tracking-widest rounded-lg border border-charcoal/5 shadow-sm">
                                                {cert.certification_name}{cert.certification_body ? ` — ${cert.certification_body}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {details.instructor?.gallery_images?.length > 0 && (
                                <div>
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-3 opacity-40 px-1">TEACHING GALLERY</h4>
                                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                                        {details.instructor.gallery_images.map((img: string, i: number) => (
                                            <div key={i} className="flex-none w-40 aspect-[4/5] bg-cream-50 overflow-hidden rounded-2xl border border-cream-100 snap-start shadow-sm group">
                                                <img 
                                                    src={img} 
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                    alt="" 
                                                    loading="lazy"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[8px] font-black text-charcoal/20 uppercase tracking-[0.4em] text-center mt-1 animate-pulse">Swipe to explore registry</p>
                                </div>
                            )}

                            {details.reviews?.length > 0 ? (
                                <div>
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-3 opacity-40 px-1">CLIENT REVIEWS</h4>
                                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                                        {details.reviews.slice(0, 5).map((r: any) => {
                                            const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
                                            return (
                                                <div key={r.id} className="bg-off-white rounded-2xl p-4 border border-charcoal/5 hover:border-burgundy/10 transition-colors">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <img
                                                            src={reviewer?.avatar_url
                                                                ? (reviewer.avatar_url.startsWith('http') ? reviewer.avatar_url : `https://wzacmyemiljzpdskyvie.supabase.co/storage/v1/object/public/avatars/${reviewer.avatar_url}`)
                                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230`}
                                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230` }}
                                                            className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"
                                                            alt=""
                                                            loading="lazy"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px] font-black text-charcoal uppercase tracking-widest">{reviewer?.full_name || 'Anonymous'}</span>
                                                                <div className="flex items-center gap-0.5">
                                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                                        <Star key={i} className={`w-2.5 h-2.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-charcoal/10'}`} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {r.comment && <p className="text-[11px] text-charcoal/50 leading-relaxed italic">"{r.comment}"</p>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : !details.instructor?.bio && !details.certifications?.length && !details.instructor?.gallery_images?.length ? (
                                <div className="text-center py-8">
                                    <p className="text-[10px] text-charcoal/30 font-black uppercase tracking-widest italic">Node Registry Complete - No additional data found.</p>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-charcoal/5 flex bg-off-white/50 backdrop-blur-md">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-forest text-white rounded-xl text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-110 transition-all shadow-md active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
