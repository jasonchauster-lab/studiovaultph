'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ArrowRight, Building2, Globe, Clock, ShieldCheck, Check } from 'lucide-react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'

interface Outlet {
    id: string
    name: string
    address: string
    slug: string
    hero_image_url?: string
    is_active: boolean
    status?: string
}

interface OutletPickerSplashProps {
    studio: {
        name: string
        slug: string
    }
    outlets: Outlet[]
    theme?: any
    isPreview?: boolean
    tagline?: string
}


export default function OutletPickerSplash({ studio, outlets, theme, isPreview = false, tagline }: OutletPickerSplashProps) {
    const router = useRouter()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [rememberMe, setRememberMe] = useState(true)

    const handleSelect = (outlet: Outlet) => {
        setSelectedId(outlet.id)
        
        // 1. Set Sticky Cookie if requested
        if (rememberMe && !isPreview) {
            const expiry = new Date()
            expiry.setDate(expiry.getDate() + 30) // 30 days
            document.cookie = `preferred_outlet_${studio.slug}=${outlet.slug}; path=/; expires=${expiry.toUTCString()}; samesite=lax`
        }

        // 2. Navigate (Only if not in preview)
        if (isPreview) {
            console.log('[Builder] Selected outlet:', outlet.slug)
            return
        }

        router.push(`/s/${studio.slug}/${outlet.slug}`)
    }

    return (
        <div className={clsx(
            "z-[100] flex items-center justify-center bg-white overflow-y-auto",
            isPreview ? "absolute inset-0" : "fixed inset-0"
        )}>
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[var(--primary-brand)]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary-brand)]/3 rounded-full blur-[100px]" />
            </div>

            <div className="relative w-full max-w-7xl mx-auto px-6 py-20 min-h-screen flex flex-col items-center justify-center">
                {/* Brand Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-8 mb-20"
                >
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-zinc-50 border border-zinc-100 rounded-full">
                        <Building2 className="w-4 h-4 text-zinc-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Welcome to {studio.name}</span>
                    </div>
                    
                    <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[6rem] font-bold tracking-tightest leading-[0.95] text-zinc-900 font-atelier max-w-4xl mx-auto px-4 whitespace-pre-line">
                        {tagline || (
                            <>Choose Your <span className="text-[var(--primary-brand)] italic">Sanctuary.</span></>
                        )}
                    </h1>
                    
                    <p className="text-lg text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed">
                        Select a location to explore schedules, sessions, and memberships tailored to your preferred studio.
                    </p>
                </motion.div>

                {/* Outlet Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
                    {outlets.filter(o => o.status === 'published' || !o.status).map((outlet, idx) => (
                        <motion.div
                            key={outlet.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            onClick={() => handleSelect(outlet)}
                            className="group relative h-[350px] md:h-[500px] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden cursor-pointer bg-zinc-50 border border-zinc-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                        >
                            {/* Background Image/Fallback */}
                            <div className="absolute inset-0 bg-zinc-100">
                                {outlet.hero_image_url ? (
                                    <img 
                                        src={outlet.hero_image_url} 
                                        className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110" 
                                        alt={outlet.name}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[var(--primary-brand)]/5 group-hover:bg-[var(--primary-brand)]/10 transition-colors">
                                        <Building2 className="w-12 h-12 text-[var(--primary-brand)] opacity-20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            </div>

                            {/* Content Over */}
                            <div className="relative h-full p-10 flex flex-col justify-end gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Branch Location</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tightest">{outlet.name}</h3>
                                    <p className="text-xs md:text-sm text-white/60 font-medium leading-relaxed max-w-[90%] md:max-w-[80%]">{outlet.address}</p>
                                </div>

                                <div className="flex pt-4">
                                    <div className="px-8 py-4 bg-white text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 group-hover:bg-[var(--primary-brand)] group-hover:text-white transition-all shadow-xl">
                                        Enter Studio
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Persistence Toggle */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-16 flex items-center gap-4 px-8 py-4 bg-zinc-50 border border-zinc-100 rounded-[2rem] cursor-pointer hover:bg-zinc-100 transition-all"
                    onClick={() => setRememberMe(!rememberMe)}
                >
                    <div className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        rememberMe ? "bg-emerald-500 border-emerald-500" : "border-zinc-200"
                    )}>
                        {rememberMe && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Remember my location for next time</span>
                </motion.div>
            </div>
        </div>
    )
}
