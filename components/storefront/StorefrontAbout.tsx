import React, { memo } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'

interface StorefrontAboutProps {
    bio: string
    studioName: string
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontAbout({ bio, studioName, config, theme, isMobile = false }: StorefrontAboutProps) {
    const content = config?.content || {}
    const customText = content.text || bio
    const isPremium = theme?.layoutStyle === 'premium'
    const imageBrightness = content.imageBrightness ?? 1

    if (!customText) return null

    return (
        <section 
            id="about" 
            className={clsx(
                "relative overflow-hidden transition-all duration-500",
                isMobile ? "py-12 px-4" : "px-6 md:px-12"
            )}
            style={{ 
                backgroundColor: content.customBgColor || (isPremium ? 'transparent' : '#ffffff'),
                paddingBlock: content.verticalSpacing || (isMobile ? '3rem' : 'var(--section-padding)')
            }}

        >
            <div className="max-w-7xl mx-auto">
                <div className={clsx(
                    "grid grid-cols-1 items-center gap-16 md:gap-24",
                    !isMobile && "lg:grid-cols-12"
                )}>
                    {/* Left: Image Card */}
                    <div className={clsx(
                        "relative group",
                        !isMobile && (isPremium ? 'lg:col-span-6' : 'lg:col-span-12 xl:col-span-5')
                    )}>
                        <div className={clsx(
                            "aspect-[4/5] overflow-hidden bg-zinc-50 relative z-10 shadow-2xl transition-all duration-700",
                            isMobile ? "rounded-[2rem]" : "rounded-[3rem]",
                            isPremium ? "hover:scale-[1.02]" : ""
                        )}>
                            {content.imageUrl ? (
                                <Image 
                                    loader={supabaseLoader}
                                    src={content.imageUrl} 
                                    fill
                                    className="object-cover transition-transform duration-1000 group-hover:scale-105" 
                                    style={{ filter: `brightness(${imageBrightness})` }}
                                    alt={studioName}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-20 grayscale">
                                    <ImageIcon className="w-12 h-12" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center px-8 leading-relaxed">Your studio atmosphere here</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-brand)]/10 to-transparent" />
                        </div>
                        {/* Decorative Shadow/Background shape */}
                        <div className={clsx(
                            "absolute -inset-6 bg-[var(--primary-brand)]/5 -z-0 blur-3xl opacity-50",
                            isMobile ? "rounded-[2.5rem]" : "rounded-[4rem]"
                        )} />
                    </div>

                    {/* Right: Text Content */}
                    <div className={clsx(
                        "space-y-12",
                        !isMobile && (isPremium ? 'lg:col-span-6' : 'lg:col-span-12 xl:col-span-7')
                    )}>
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-brand)]/5 rounded-full border border-[var(--primary-brand)]/10 text-[var(--primary-brand)] text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                Our Story
                            </div>
                            <h2 
                                className={clsx(
                                    "font-bold leading-[0.95] tracking-tight break-words px-2",
                                    isMobile ? "text-3xl" : "text-4xl sm:text-5xl md:text-7xl"
                                )}
                                style={{ fontFamily: 'var(--font-heading)', color: 'var(--global-text)' }}
                            >
                                {content.title || `About ${studioName}`}
                            </h2>
                        </div>
                        
                        <div className="space-y-12">
                            <p 
                                className={`text-lg md:text-2xl leading-[1.5] font-medium tracking-tight opacity-70`}
                                style={{ fontFamily: 'var(--font-body)', color: 'var(--global-text)' }}
                            >
                                {customText}
                            </p>
                            
                            <div className={clsx(
                                "flex items-center gap-6",
                                isMobile ? "flex-col" : "flex-col sm:flex-row"
                            )}>
                                {(content.primaryBtnText || content.primaryBtnLink) && (
                                    <button 
                                        onClick={() => {
                                            const link = content.primaryBtnLink || '#booking'
                                            if (link.startsWith('#')) {
                                                document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                                            } else {
                                                window.location.href = link
                                            }
                                        }}
                                        className={clsx(
                                            "px-8 py-6 text-white text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95 shadow-xl w-full sm:w-auto",
                                            isMobile ? "tracking-[0.2em]" : "md:px-16 tracking-[0.2em] md:tracking-[0.4em] hover:brightness-125"
                                        )}
                                        style={{ 
                                            backgroundColor: 'var(--button-color)', 
                                            borderRadius: 'var(--button-radius)',
                                            fontFamily: 'var(--font-body)'
                                        }}
                                    >
                                        {content.primaryBtnText || 'Learn More'}
                                    </button>
                                )}

                                {isPremium && (
                                    <div className={clsx(
                                        "items-center gap-4 group cursor-pointer",
                                        isMobile ? "flex" : "hidden sm:flex"
                                    )}>
                                        <div className="w-12 h-[1px] bg-charcoal-200 group-hover:w-16 transition-all" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-400 group-hover:text-charcoal-900">Explore Gallery</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontAbout)
