'use client'

import { memo } from 'react'

import { Mail, Phone, MessageCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

interface StorefrontContactProps {
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontContact({ config, theme, isMobile = false }: StorefrontContactProps) {
    const content = config?.content || {}
    const isPremium = theme?.layoutStyle === 'premium'

    if (!config?.enabled) return null

    return (
        <section 
            id="contact" 
            className={clsx(
                "relative overflow-hidden transition-colors duration-500",
                isMobile ? "py-16 px-4" : "py-40 px-6 md:px-12"
            )}
            style={{ backgroundColor: isPremium ? 'transparent' : '#f9f9f9' }}
        >
            <div className={clsx(
                "max-w-7xl mx-auto grid grid-cols-1 items-center gap-16 lg:gap-32",
                !isMobile && "lg:grid-cols-2"
            )}>
                {/* Left Side: Text Content */}
                <div className="space-y-16">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-brand)]/5 rounded-full border border-[var(--primary-brand)]/10 text-[var(--primary-brand)] text-[10px] font-black uppercase tracking-[0.2em]">
                            Concierge
                        </div>
                        <h2                                className={clsx(
                                    "font-bold text-zinc-900 tracking-tighter break-words px-2",
                                    isMobile ? "text-3xl leading-[1.1]" : "text-3xl sm:text-5xl md:text-6xl lg:text-[6rem] leading-[0.95]"
                                )}
                            style={{ fontFamily: 'var(--font-heading)' }}
                        >
                            {content.title || 'Begin Your Journey.'}
                        </h2>
                        <p 
                            className="text-xl md:text-2xl text-zinc-500 font-medium max-w-md leading-relaxed tracking-tight"
                            style={{ fontFamily: 'var(--font-body)' }}
                        >
                            Have questions or ready to begin? Our team is dedicated to supporting your practice.
                        </p>
                    </div>

                    <div className={clsx(
                        "grid gap-x-12 gap-y-16",
                        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                    )}>
                        {content.email && (
                            <div className="space-y-4 group">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-zinc-400 shadow-sm border border-zinc-100 group-hover:bg-charcoal-900 group-hover:text-white transition-all duration-500">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Email</h4>
                                    <p className="text-zinc-900 font-bold text-lg">{content.email}</p>
                                </div>
                            </div>
                        )}
                        {content.phone && (
                            <div className="space-y-4 group">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-zinc-400 shadow-sm border border-zinc-100 group-hover:bg-charcoal-900 group-hover:text-white transition-all duration-500">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Phone</h4>
                                    <p className="text-zinc-900 font-bold text-lg">{content.phone}</p>
                                </div>
                            </div>
                        )}
                        {content.messengerUrl && (
                            <div className="space-y-4 group">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-zinc-400 shadow-sm border border-zinc-100 group-hover:bg-charcoal-900 group-hover:text-white transition-all duration-500">
                                    <MessageCircle className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Messenger</h4>
                                    <a 
                                        href={content.messengerUrl} 
                                        target="_blank" 
                                        className="text-[var(--primary-brand)] hover:underline font-bold text-lg"
                                    >
                                        Connect with us
                                    </a>
                                </div>
                            </div>
                        )}
                        {content.hours && (
                            <div className="space-y-4 group">
                                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-zinc-400 shadow-sm border border-zinc-100 group-hover:bg-charcoal-900 group-hover:text-white transition-all duration-500">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Hours</h4>
                                    <p className="text-zinc-900 font-bold text-lg whitespace-pre-line leading-relaxed">{content.hours}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Visual Decorative Card */}
                <div className="relative group/card">
                    <div className={clsx(
                        "absolute -inset-6 bg-[var(--primary-brand)]/5 group-hover/card:bg-[var(--primary-brand)]/10 transition-colors duration-1000 blur-3xl",
                        isMobile ? "rounded-[3rem]" : "rounded-[5rem]"
                    )} />
                    <div className={clsx(
                        "relative h-full bg-charcoal-900 overflow-hidden flex flex-col justify-end text-white shadow-2xl transition-all duration-700",
                        isMobile ? "min-h-[320px] p-8 rounded-[2.5rem]" : "min-h-[500px] md:min-h-[600px] p-12 md:p-16 rounded-[4rem]"
                    )}>
                        <div className="absolute top-16 right-16 transition-transform duration-[10s] group-hover/card:scale-110 group-hover/card:rotate-12 opacity-5">
                             <Mail className="w-96 h-96" />
                        </div>
                        <div className="space-y-10 relative z-10">
                            <h3 
                                className={clsx(
                                    "font-bold italic leading-tight tracking-tight opacity-90 break-words",
                                    isMobile ? "text-2xl" : "text-4xl md:text-6xl"
                                )}
                                style={{ fontFamily: 'var(--font-heading)' }}
                            >
                                Pilates is the complete coordination of body, mind, and spirit.
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="h-[1px] w-20 bg-white/20" />
                                <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/40">Joseph Pilates</p>
                            </div>
                        </div>
                        {/* Corner Decoration */}
                        <div className={clsx(
                            "absolute top-0 right-0 p-12 overflow-hidden pointer-events-none transition-transform duration-1000 group-hover/card:translate-x-4",
                            isMobile ? "hidden" : "block"
                        )}>
                            <div className="w-32 h-[1px] bg-white/10 rotate-45 translate-x-12 translate-y-12" />
                            <div className="w-32 h-[1px] bg-white/10 rotate-45 translate-x-12 translate-y-24" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(StorefrontContact)
