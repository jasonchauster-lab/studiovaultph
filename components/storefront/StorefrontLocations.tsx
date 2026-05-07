'use client'

import { memo } from 'react'

import { Globe, ExternalLink, MapPin } from 'lucide-react'
import clsx from 'clsx'

interface StorefrontLocationsProps {
    studioName: string
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontLocations({ studioName, config, theme, isMobile = false }: StorefrontLocationsProps) {
    const content = config?.content || {}
    const isPremium = theme?.layoutStyle === 'premium'
    const sectionTitle = content.title || 'Our Flagship Studio Sanctuary.'
    const sectionSubtitle = content.subtitle || 'Tap below to find your way to our serene practice space.'
    const mapButtonLabel = content.btnText || 'Open in Maps'
    const mapButtonLink = content.btnLink || content.mapUrl

    const handleMapClick = () => {
        if (!mapButtonLink) return

        if (mapButtonLink.startsWith('#')) {
            document.getElementById(mapButtonLink.slice(1))?.scrollIntoView({ behavior: 'smooth' })
            return
        }

        window.open(mapButtonLink, '_blank', 'noopener,noreferrer')
    }

    if (!config?.enabled) return null

    return (
        <section 
            id="locations" 
            className={clsx(
                "relative overflow-hidden group transition-colors duration-500",
                isMobile ? "py-20 px-4" : "py-40 px-6 md:px-12"
            )}
            style={{ backgroundColor: isPremium ? 'transparent' : '#ffffff' }}
        >
            {/* Background Accent - Strictly contained and scaled for mobile performance */}
            <div className="absolute top-0 right-0 w-[240px] md:w-[600px] h-[240px] md:h-[600px] bg-[var(--primary-brand)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[40px] md:blur-[120px] opacity-30 pointer-events-none" />
            
            <div className="max-w-6xl mx-auto relative z-10 space-y-24">
                {/* Headers */}
                <div className={`flex flex-col ${isPremium ? 'items-center text-center' : 'items-start text-left'} space-y-6 animate-in fade-in slide-in-from-bottom duration-1000`}>
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-[var(--primary-brand)]/5 border border-[var(--primary-brand)]/10 rounded-full">
                        <MapPin className="w-4 h-4 text-[var(--primary-brand)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--primary-brand)]">Locate Us</span>
                    </div>
                    <h2 
                        className={clsx(
                            "text-zinc-900 leading-[0.9] font-bold tracking-tighter break-words px-2",
                            isMobile ? "text-4xl" : "text-4xl sm:text-6xl md:text-[6rem]"
                        )}
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {content.title ? (
                            sectionTitle
                        ) : (
                            <>
                                Our Flagship <span className="text-[var(--primary-brand)] italic">Studio Sanctuary.</span>
                            </>
                        )}
                    </h2>
                </div>

                {/* Main Card */}
                <div className="relative group/card animate-in fade-in zoom-in duration-1000 delay-300">
                    <div className="absolute -inset-4 md:-inset-8 bg-[var(--primary-brand)]/5 rounded-[3rem] md:rounded-[5rem] group-hover/card:bg-[var(--primary-brand)]/10 transition-colors duration-700 -z-10 blur-2xl md:blur-3xl opacity-50" />
                    
                    <div className={clsx(
                        "bg-white border border-zinc-100 shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col divide-y divide-zinc-50",
                        isMobile ? "rounded-[2rem]" : "rounded-[2.5rem] md:rounded-[4rem]",
                        !isMobile && "lg:flex-row lg:divide-y-0 lg:divide-x"
                    )}>
                        {/* Map/Visual Aspect */}
                        <div className={clsx(
                            "flex-1 bg-zinc-50 flex flex-col items-center justify-center text-center relative overflow-hidden",
                            isMobile ? "min-h-[380px] p-8" : "min-h-[500px] p-12"
                        )}>
                            {/* Decorative background for the map side */}
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--primary-brand)_1px,_transparent_1px)] [background-size:20px_20px]" />
                            </div>

                            {content.imageUrl ? (
                                <div className="relative z-10 w-full h-full absolute inset-0">
                                    <img src={content.imageUrl} alt={`${studioName} location`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-white/35 backdrop-blur-[1px]" />
                                </div>
                            ) : (
                                <div className={clsx(
                                    "relative z-10 rounded-full bg-white shadow-2xl flex items-center justify-center text-[var(--primary-brand)] mb-10 transition-transform duration-700 group-hover/card:scale-110",
                                    isMobile ? "w-24 h-24" : "w-32 h-32"
                                )}>
                                    <Globe className={isMobile ? "w-12 h-12" : "w-16 h-16"} />
                                </div>
                            )}
                            
                            <div className="relative z-10 space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Navigation</h4>
                                <p 
                                    className="text-zinc-600 italic text-2xl leading-relaxed max-w-sm"
                                    style={{ fontFamily: 'var(--font-body)' }}
                                >
                                    {sectionSubtitle}
                                </p>
                                
                                {mapButtonLink && (
                                    <button 
                                        onClick={handleMapClick}
                                        className={clsx(
                                            "group/link inline-flex items-center gap-4 rounded-full text-[11px] font-bold uppercase tracking-[0.4em] transition-all shadow-2xl hover:scale-105 active:scale-95",
                                            isMobile ? "mt-8 px-8 py-4" : "mt-12 px-12 py-6"
                                        )}
                                        style={{ backgroundColor: 'var(--button-color)', color: '#ffffff' }}
                                    >
                                        {mapButtonLabel}
                                        <ExternalLink className="w-4 h-4 text-white/50 group-hover/link:text-white transition-colors" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Contact/Address Info */}
                        <div className={clsx(
                            "flex-1 flex flex-col justify-center bg-white relative",
                            isMobile ? "p-8 space-y-8" : "p-8 md:p-16 lg:p-24 space-y-12 md:space-y-16"
                        )}>
                            <div className="space-y-6">
                                <div className="inline-block px-4 py-1.5 bg-zinc-50 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Physical Address</div>
                                <p 
                                    className={clsx(
                                        "text-zinc-900 leading-[1.1] font-bold tracking-tight",
                                        isMobile ? "text-xl" : "text-2xl sm:text-3xl md:text-5xl"
                                    )}
                                    style={{ fontFamily: 'var(--font-heading)' }}
                                >
                                    {content.address || 'Flagship Gallery & Studio Space'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontLocations)
