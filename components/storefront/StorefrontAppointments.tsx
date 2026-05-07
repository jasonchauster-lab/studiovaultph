'use client'

import React, { memo } from 'react'
import clsx from 'clsx'

interface StorefrontAppointmentsProps {
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontAppointments({ config, theme, isMobile = false }: StorefrontAppointmentsProps) {
    const content = config?.content || {}
    const aptImg = content.imageUrl || 'https://images.unsplash.com/photo-1518611012118-2960c8bad4fe?q=80&w=2070&auto=format&fit=crop'
    const aptOverlay = content.overlayOpacity ?? 0.2
    const aptTextColor = content.textColor || '#ffffff'
    const buttonLink = content.btnLink || '#booking'

    const handleButtonClick = () => {
        if (buttonLink.startsWith('#')) {
            document.getElementById(buttonLink.slice(1))?.scrollIntoView({ behavior: 'smooth' })
            return
        }

        window.location.href = buttonLink
    }

    return (
        <section id="appointments" className={clsx(
            "py-24 px-6",
            !isMobile && "md:px-12"
        )}>
            <div className="max-w-7xl mx-auto">
                <div className={clsx(
                    "rounded-[3rem] bg-zinc-950 overflow-hidden flex flex-col relative transition-all duration-700 shadow-2xl min-h-[400px]",
                    !isMobile && "md:flex-row"
                )}>
                    <div className={clsx(
                        "relative min-h-[300px]",
                        !isMobile && "md:w-1/2 md:min-h-full"
                    )}>
                        <img src={aptImg} className="absolute inset-0 w-full h-full object-cover" alt="Appointment Banner" />
                        <div 
                            className="absolute inset-0 bg-black transition-opacity duration-700" 
                            style={{ opacity: aptOverlay }}
                        />
                    </div>
                    <div className={clsx(
                        "p-8 flex flex-col justify-center space-y-8 z-10",
                        !isMobile && "md:w-1/2 md:p-16"
                    )}>
                        <div className="space-y-4">
                            <h3 
                                className={clsx(
                                    "font-serif font-bold leading-tight",
                                    isMobile ? "text-3xl" : "text-3xl md:text-5xl"
                                )}
                                style={{ color: aptTextColor, fontFamily: 'var(--font-heading)' }}
                            >
                                {content.title || 'Start Your Journey'}
                            </h3>
                            <p 
                                className={clsx(
                                    "font-medium opacity-70 leading-relaxed",
                                    isMobile ? "text-base" : "text-base md:text-lg"
                                )}
                                style={{ color: aptTextColor, fontFamily: 'var(--font-body)' }}
                            >
                                {content.subtitle || 'Book a private session today and experience personalized movement designed specifically for your body.'}
                            </p>
                        </div>
                        
                        <button 
                            onClick={handleButtonClick}
                            className="w-full sm:w-fit px-10 py-5 bg-white text-zinc-950 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg"
                            style={{ borderRadius: 'var(--button-radius)' }}
                        >
                            {content.btnText || 'Book Now'}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontAppointments)
