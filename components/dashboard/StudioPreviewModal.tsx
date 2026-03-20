import { memo } from 'react'
import { X, MapPin, Star, CheckCircle2, Navigation } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'

interface StudioPreviewModalProps {
    studio: any
    details: any
    loading: boolean
    onClose: () => void
}

const StudioPreviewModal = ({ studio, details, loading, onClose }: StudioPreviewModalProps) => {
    if (!studio) return null

    // Generate Google Maps URL
    const getMapsUrl = () => {
        const address = details?.studio?.address || studio.address || details?.studio?.location || studio.location
        if (!address) return null
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    }

    const mapsUrl = getMapsUrl()

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-[2px] animate-in fade-in duration-300" 
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 will-change-transform" 
                onClick={e => e.stopPropagation()}
            >
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
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden mb-3 border border-cream-200 bg-cream-50 shadow-sm">
                            {details?.studio?.logo_url || studio?.logo_url ? (
                                <Image 
                                    src={getSupabaseAssetUrl(details?.studio?.logo_url || studio.logo_url, 'avatars') || '/default-studio.svg'} 
                                    fill
                                    className="object-cover" 
                                    alt={studio.name} 
                                    sizes="80px"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-charcoal/5 text-charcoal/50 text-2xl font-serif">
                                    {(details?.studio?.name || studio.name || 'S')[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <h3 className="text-xl font-serif text-charcoal tracking-tight">{studio.name}</h3>
                            {details?.studio?.verified && (
                                <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                            )}
                        </div>
                        
                        {(details?.studio?.location || studio.location) && (
                            <div className="flex flex-col items-center gap-3 mt-2">
                                <p className="text-xs text-charcoal/50 flex items-center gap-1 font-medium italic">
                                    <MapPin className="w-3 h-3 text-burgundy/40" />
                                    {details?.studio?.location || studio.location}
                                </p>
                                
                                {mapsUrl && (
                                    <a 
                                        href={mapsUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-forest/5 hover:bg-forest/10 text-forest rounded-full border border-forest/10 transition-all active:scale-95 group"
                                    >
                                        <Navigation className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Open in Maps</span>
                                    </a>
                                )}
                            </div>
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
                            <p className="text-[10px] font-black uppercase tracking-widest">Hydrating Studio Registry...</p>
                        </div>
                    )}

                    {!loading && details && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {details.studio?.bio && (
                                <div className="bg-cream-50 p-5 rounded-2xl border border-cream-100/50 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-burgundy/10 group-hover:bg-burgundy/30 transition-colors" />
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-2 opacity-40">MISSION</h4>
                                    <p className="text-[13px] text-charcoal/70 leading-relaxed italic font-medium">"{details.studio.bio}"</p>
                                </div>
                            )}

                            {details.studio?.space_photos_urls?.length > 0 && (
                                <div>
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-3 opacity-40 px-1">THE FACILITY</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {details.studio.space_photos_urls.slice(0, 6).map((img: string, i: number) => (
                                            <div key={i} className="relative aspect-square bg-cream-50 overflow-hidden rounded-xl border border-cream-100 group">
                                                <Image 
                                                    src={getSupabaseAssetUrl(img, 'avatars') || '/default-image.svg'} 
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                                                    alt="" 
                                                    sizes="(max-width: 768px) 33vw, 150px"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {details.reviews?.length > 0 ? (
                                <div>
                                    <h4 className="text-[9px] font-black text-charcoal uppercase tracking-[0.3em] mb-3 opacity-40 px-1">MEMBER REVIEWS</h4>
                                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-hide">
                                        {details.reviews.slice(0, 5).map((r: any) => {
                                            const reviewer = Array.isArray(r.reviewer) ? r.reviewer[0] : r.reviewer
                                            return (
                                                <div key={r.id} className="bg-off-white rounded-2xl p-4 border border-charcoal/5 hover:border-burgundy/10 transition-colors">
                                                    <div className="flex items-center gap-3 mb-2">
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white shadow-sm shrink-0">
                                                    <Image
                                                        src={getSupabaseAssetUrl(reviewer?.avatar_url, 'avatars') || `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.full_name || 'A')}&background=F5F2EB&color=2C3230`}
                                                        fill
                                                        className="object-cover"
                                                        alt=""
                                                        sizes="32px"
                                                    />
                                                </div>
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
                            ) : !details.studio?.bio && !details.studio?.space_photos_urls?.length ? (
                                <div className="text-center py-8">
                                    <p className="text-[10px] text-charcoal/30 font-black uppercase tracking-widest italic">Node Registry Complete - No additional data found.</p>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-charcoal/5 flex gap-3 bg-off-white/50 backdrop-blur-md">
                    <Link
                        href={`/studios/${studio.id}`}
                        target="_blank"
                        className="flex-1 py-3.5 text-center bg-white border border-charcoal/10 text-charcoal text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-forest hover:text-white hover:border-forest transition-all shadow-sm active:scale-95"
                    >
                        View Full Profile
                    </Link>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-forest text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-sm active:scale-95"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default memo(StudioPreviewModal)
