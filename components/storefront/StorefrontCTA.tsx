'use client'

import { memo } from 'react'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface StorefrontCTAProps {
    config: any
    theme?: any
    isMobile?: boolean
    isPreview?: boolean
    onNavigate?: (id: string) => void
}

function StorefrontCTA({ config, theme, isMobile = false, isPreview = false, onNavigate }: StorefrontCTAProps) {
    const content = config?.content || {}
    const title = content.title || 'Start Your Pilates Journey Today'
    const subtitle = content.subtitle || 'Experience the movement. Redefine your limits with our expert guidance.'
    const heroImage = content.heroImage || content.image
    const isPremium = theme?.layoutStyle === 'premium'

    const overlayOpacity = content.overlayOpacity ?? (isPremium ? 0.3 : 0.6)
    const textColor = content.textColor || '#ffffff'

    const handleLink = (link: string) => {
        if (isPreview) {
            onNavigate?.(link.replace(/^\/|\/$/g, '').replace(/^#/, ''))
            return
        }
        if (link.startsWith('#')) {
            const element = document.getElementById(link.slice(1))
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            window.location.href = link
        }
    }

    return (
        <section 
            className={clsx(
                "relative overflow-hidden transition-all duration-700",
                isMobile ? "py-12 px-4" : "px-6 md:px-12",
                (isPremium && !isMobile) ? 'my-10 md:my-20' : ''
            )}
            style={{ 
                paddingBlock: content.verticalSpacing || (isMobile ? '3rem' : '8rem'),
                backgroundColor: isPremium ? (content.customBgColor || 'var(--primary-brand)') : undefined
            }}
        >
            {/* Background Content with Parallax-ready styling */}
            <div 
                className={clsx(
                    "absolute inset-0 z-0 overflow-hidden transition-all duration-700",
                    isPremium 
                        ? (isMobile ? 'rounded-[3rem] mx-2' : 'rounded-[5rem] mx-4 md:mx-12') 
                        : 'bg-charcoal-900'
                )}
                style={{ backgroundColor: isPremium ? 'var(--primary-brand)' : undefined }}
            >
                {heroImage && (
                    <motion.img 
                        initial={{ scale: 1.1 }}
                        whileInView={{ scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        src={heroImage} 
                        className="w-full h-full object-cover" 
                        alt="CTA Background" 
                    />
                )}
                <div 
                    className="absolute inset-0 bg-black/60 transition-opacity duration-700" 
                    style={{ 
                        opacity: overlayOpacity,
                        background: isPremium ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${overlayOpacity}) 100%)` : undefined
                    }}
                />
                
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[var(--primary-brand)]/40 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-bl from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className={clsx(
                "relative z-10 max-w-7xl mx-auto flex flex-col space-y-8 md:space-y-12",
                (isPremium && !isMobile) ? 'items-center text-center lg:items-start lg:text-left lg:pl-32' : 'items-center text-center'
            )}>
                <div className="space-y-8 max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-[0.4em] ${isPremium ? 'bg-white/10 backdrop-blur-2xl border-white/20' : 'bg-white/10 border-white/20'}`}
                        style={{ color: textColor }}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>{content.tagline || "Private Sanctuary"}</span>
                    </motion.div>
                    
                    <motion.h2
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        className={clsx(
                            "font-bold leading-[0.85] tracking-tightest px-4 md:px-0 break-words uppercase",
                            isMobile ? "text-5xl" : "text-6xl sm:text-8xl md:text-9xl"
                        )}
                        style={{ fontFamily: 'var(--font-heading)', color: textColor }}
                    >
                        {title}
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="text-xl md:text-3xl max-w-2xl font-medium tracking-tight leading-snug pt-4 px-4 md:px-0 opacity-80"
                        style={{ fontFamily: 'var(--font-body)', color: textColor }}
                    >
                        {subtitle}
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className={clsx(
                        "flex items-center gap-6 w-full sm:w-auto px-4 md:px-0",
                        isMobile ? "flex-col" : "flex-col sm:flex-row"
                    )}
                >
                    <button
                        onClick={() => handleLink(content.primaryBtnLink || '#booking')}
                        className={clsx(
                            "group px-12 py-8 text-[11px] font-black uppercase transition-all shadow-2xl hover:scale-105 active:scale-95 w-full sm:w-auto relative overflow-hidden",
                            isMobile ? "tracking-[0.2em]" : "md:px-20 tracking-[0.4em]"
                        )}
                        style={{
                            backgroundColor: isPremium ? textColor : (theme?.buttonColor || theme?.primaryColor || '#1a1a1a'),
                            color: isPremium ? 'var(--primary-brand)' : '#ffffff',
                            borderRadius: 'var(--button-radius, 99px)',
                            fontFamily: 'var(--font-body)'
                        }}
                    >
                        <span className="relative z-10">{content.primaryBtnText || 'Book Appointment'}</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    </button>
                    
                    {(content.secondaryBtnText || !isPremium) && (
                        <button
                            onClick={() => handleLink(content.secondaryBtnLink || '#pricing')}
                            className={clsx(
                                "px-12 py-8 bg-transparent border-2 text-[11px] font-black uppercase transition-all hover:scale-105 active:scale-95 w-full sm:w-auto backdrop-blur-sm",
                                isMobile ? "tracking-[0.2em]" : "md:px-20 tracking-[0.4em] hover:bg-white hover:text-charcoal-900"
                            )}
                            style={{
                                color: textColor,
                                borderColor: `${textColor}30`,
                                borderRadius: 'var(--button-radius, 99px)',
                                fontFamily: 'var(--font-body)'
                            }}
                        >
                            {content.secondaryBtnText || 'Explore Packages'}
                        </button>
                    )}
                </motion.div>
            </div>
        </section>
    )
}

export default memo(StorefrontCTA)
