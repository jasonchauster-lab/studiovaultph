'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import { Globe } from 'lucide-react'

interface StorefrontHeroProps {
    studioName: string
    logoUrl?: string | null
    bannerUrl?: string | null
    location: string
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontHero({ studioName, logoUrl, bannerUrl, location, config, theme, isMobile = false }: StorefrontHeroProps) {
    const content = config?.content || {}
    const title = content.title || studioName
    const subtitle = content.subtitle || 'Experience the movement. Redefine your limits.'
    const isPremium = theme?.layoutStyle === 'premium'
    
    // Slideshow Images Aggregation
    const slideshowImages = useMemo(() => {
        return (content.images && content.images.length > 0) 
            ? content.images 
            : [bannerUrl ? getSupabaseAssetUrl(bannerUrl, 'studios') : null].filter(Boolean)
    }, [content.images, bannerUrl])

    const [currentIdx, setCurrentIdx] = useState(0)

    useEffect(() => {
        if (slideshowImages.length <= 1) return
        
        const timer = setInterval(() => {
            setCurrentIdx((prev) => (prev + 1) % slideshowImages.length)
        }, 4000)

        return () => clearInterval(timer)
    }, [slideshowImages.length])

    const heroImage = slideshowImages[currentIdx]
    const overlayOpacity = content.overlayOpacity ?? (isPremium ? 0.3 : 0.5)
    const textColor = content.textColor || '#ffffff'

    return (
        <section 
            id={config.id || 'hero'}
            className={clsx(
                "relative flex flex-col items-center justify-center text-center overflow-hidden transition-all duration-700",
                isMobile ? "px-4" : "px-6",
                isPremium 
                    ? (isMobile ? 'min-h-[80dvh] py-12' : 'min-h-[85dvh] md:min-h-screen py-16 md:py-32') 
                    : (isMobile ? 'min-h-[75dvh] py-12' : 'min-h-[80dvh] md:min-h-[90dvh] bg-charcoal-900 py-12 md:py-0')
            )}
        >
            {/* Background Content with Slideshow */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIdx}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1.05 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="absolute inset-0"
                    >
                        {heroImage ? (
                            <Image 
                                loader={supabaseLoader}
                                src={heroImage} 
                                fill
                                className="object-cover transition-all duration-700" 
                                alt={`${studioName} Hero`}
                                priority={currentIdx === 0}
                                sizes="100vw"
                                quality={90}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-20 opacity-20">
                                <div className="w-full h-full border-4 border-dashed border-white/10 rounded-[4rem] flex flex-col items-center justify-center gap-6">
                                    <Globe className="w-20 h-20 text-white/30" />
                                    <p className="text-xl font-black uppercase tracking-[0.5em] text-white/40">Atmosphere Slideshow</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
                {/* Dynamic Overlay */}
                <div 
                    className="absolute inset-0 bg-black transition-opacity duration-700" 
                    style={{ opacity: overlayOpacity }}
                />
            </div>

            {/* Main Hero Content - STRICTLY CENTERED */}
            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center space-y-8 md:space-y-12">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center space-y-4 md:space-y-8"
                >
                    <h1 
                        className={clsx(
                            "font-serif font-bold tracking-tight leading-[1.1] drop-shadow-2xl break-words w-full",
                            isMobile ? "text-3xl px-2" : "text-4xl md:text-7xl lg:text-8xl px-4 md:px-0"
                        )}
                        style={{ fontFamily: 'var(--font-heading)', color: textColor }}
                    >
                        {title}
                    </h1>
                    
                    <p 
                        className="text-base md:text-xl lg:text-2xl font-medium max-w-2xl mx-auto tracking-tight leading-relaxed drop-shadow-lg"
                        style={{ fontFamily: 'var(--font-body)', color: textColor, opacity: 0.9 }}
                    >
                        {subtitle}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="flex flex-col items-center gap-6 md:gap-10 w-full"
                >
                    <div className={clsx(
                        "flex flex-col sm:flex-row items-center justify-center gap-4 w-full",
                        isMobile ? "px-6" : "px-4"
                    )}>
                        {(content.primaryBtnText || !content.secondaryBtnText) && (
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
                                    "text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl hover:scale-105 active:scale-95 bg-white text-zinc-900 rounded-full w-full sm:w-auto",
                                    isMobile ? "px-8 py-4" : "px-12 md:px-20 py-5 md:py-6"
                                )}
                            >
                                {content.primaryBtnText || 'Reserve Spot'}
                            </button>
                        )}

                        {content.secondaryBtnText && (
                            <button
                                onClick={() => {
                                    const link = content.secondaryBtnLink || '#pricing'
                                    if (link.startsWith('#')) {
                                        document.getElementById(link.slice(1))?.scrollIntoView({ behavior: 'smooth' })
                                    } else {
                                        window.location.href = link
                                    }
                                }}
                                className={clsx(
                                    "text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] transition-all border border-white/20 hover:bg-white/10 text-white rounded-full w-full sm:w-auto",
                                    isMobile ? "px-8 py-4" : "px-12 md:px-20 py-5 md:py-6"
                                )}
                            >
                                {content.secondaryBtnText}
                            </button>
                        )}
                    </div>

                    <div 
                        className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-[0.5em]"
                        style={{ color: textColor, opacity: 0.4 }}
                    >
                        <div className="w-8 h-[1px] bg-current opacity-20" />
                        <span>{location}</span>
                        <div className="w-8 h-[1px] bg-current opacity-20" />
                    </div>
                </motion.div>

            </div>
            
            {/* Pagination Dots */}
            {slideshowImages.length > 1 && (
                <div className="absolute bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
                    {slideshowImages.map((_: any, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIdx(idx)}
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ 
                                width: currentIdx === idx ? '40px' : '6px',
                                backgroundColor: textColor,
                                opacity: currentIdx === idx ? 1 : 0.3
                            }}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

export default memo(StorefrontHero)
