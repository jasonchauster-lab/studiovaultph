'use client'

import { Monitor, Smartphone, ExternalLink, Globe } from 'lucide-react'
import StorefrontHero from '@/components/storefront/StorefrontHero'
import StorefrontAbout from '@/components/storefront/StorefrontAbout'
import StorefrontMemberships from '@/components/storefront/StorefrontMemberships'
import StorefrontPackages from '@/components/storefront/StorefrontPackages'
import BookingSection from '@/components/customer/BookingSection'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontCTA from '@/components/storefront/StorefrontCTA'
import StorefrontAppointments from '@/components/storefront/StorefrontAppointments'
import StorefrontLocations from '@/components/storefront/StorefrontLocations'
import StorefrontContact from '@/components/storefront/StorefrontContact'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import StorefrontTimetable from '@/components/storefront/StorefrontTimetable'
import StorefrontClasses from '@/components/storefront/StorefrontClasses'
import StorefrontEvents from '@/components/storefront/StorefrontEvents'
import StorefrontBlogs from '@/components/storefront/StorefrontBlogs'
import StorefrontFAQ from '@/components/storefront/StorefrontFAQ'
import StorefrontInstructors from '@/components/storefront/StorefrontInstructors'
import { Calendar, Layout } from 'lucide-react'
import MobileActionBar from '@/components/storefront/MobileActionBar'
import WhatsAppFAB from '@/components/storefront/WhatsAppFAB'
import BackToTopFAB from '@/components/storefront/BackToTopFAB'
import { useSearchParams } from 'next/navigation'
import clsx from 'clsx'

interface BuilderPreviewProps {
    config: any
    studio: any
    previewMode: 'desktop' | 'mobile'
    setPreviewMode: (mode: 'desktop' | 'mobile') => void
    setNavPath: (path: any) => void
    setActivePage: (page: string) => void
    activePage?: string
    publicUrl: string
    packages?: any[]
    outlets?: any[]
    outlet?: any
    hoveredSectionId?: string | null
    navPath?: { view: string; id?: string }
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'

export default function BuilderPreview({ 
    config, studio, previewMode, setPreviewMode, setNavPath,
    setActivePage, activePage = 'home', publicUrl,
    memberships = [], packages = [], outlets = [], outlet, hoveredSectionId, navPath
}: BuilderPreviewProps) {
    const [currentSlide, setCurrentSlide] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)
    const searchParams = useSearchParams()
    const sections = useMemo(() => {
        return config.pages?.[activePage]?.sections || []
    }, [config.pages, activePage])




    const heroSection = sections.find((s: any) => s.type === 'hero' && s.enabled)
    const heroImages = heroSection?.content?.images || []

    useEffect(() => {
        if (heroImages.length <= 1) return
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroImages.length)
        }, 4000)
        return () => clearInterval(timer)
    }, [heroImages.length])

    const navItems = [
        { label: 'Home', key: 'home' },
        { label: 'Pricing', key: 'memberships' },
        { label: 'Schedules', key: 'schedule' },
        { label: 'Locate us', key: 'locations' },
        { label: 'Contact us', key: 'contact' }

    ]

    
    // Live Focus: Scroll to section when selected in sidebar
    useEffect(() => {
            // Auto-switch to active page if section is found there
            const isSectionInCurrentPage = sections.some((s: any) => s.id === navPath.id);
            if (!isSectionInCurrentPage) {
                // Search other pages
                const foundEntry = Object.entries(config.pages || {}).find(([page, pageConfig]: [string, any]) => 
                    pageConfig.sections?.some((s: any) => s.id === navPath.id)
                );
                if (foundEntry) {
                    setActivePage(foundEntry[0]);
                }
            }

            // Wait for render/switch
            setTimeout(() => {
                const el = scrollRef.current?.querySelector(`[data-section-id="${navPath.id}"]`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

    }, [navPath?.id, navPath?.view]);

    // Device Scaling logic: Ensure frame fits on small laptop screens
    const [deviceScale, setDeviceScale] = useState(1)
    useEffect(() => {
        const handleResize = () => {
            const viewportHeight = window.innerHeight - 200 // Account for builder UI
            const deviceHeight = 844
            if (viewportHeight < deviceHeight) {
                setDeviceScale(Math.max(0.6, viewportHeight / deviceHeight))
            } else {
                setDeviceScale(1)
            }
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const onNavigate = useCallback((id: string) => {
        if (id === 'pricing' || id === 'schedule' || id === 'hero') {
            // Map pricing to memberships for builder consistency
            const pageKey = id === 'pricing' ? 'memberships' : (id === 'hero' ? 'home' : id)
            setActivePage(pageKey as any)
            // If switching back to home/hero, also scroll to top
            if (id === 'hero') scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        // Handle dedicated sub-pages
        if (['packages', 'memberships', 'locations', 'contact', 'contact-us'].includes(id)) {
            setActivePage(id)
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        // If we are already on home, scroll to the section
        if (activePage === 'home') {
            const element = scrollRef.current?.querySelector(`#${id}`)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            // If on another page, switch to home and then (optionally) scroll after a delay
            setActivePage('home')
            setTimeout(() => {
                const element = scrollRef.current?.querySelector(`#${id}`)
                element?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        }
    }, [activePage, setActivePage])

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative bg-zinc-50/30">
            {/* Cinematic Background Canvas */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-white to-emerald-50/30 pointer-events-none" />
            
                {/* Device Mockup Shell */}
                <div 
                    className={clsx(
                        "relative bg-white transition-all duration-700 ease-out overflow-hidden isolation-isolate transform-gpu will-change-transform",
                        previewMode === 'mobile' 
                            ? 'w-[375px] h-[844px] rounded-[3.5rem] border-[12px] border-zinc-950 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.35),0_0_0_2px_rgba(0,0,0,0.05)] ring-1 ring-white/20' 
                            : 'w-full max-w-6xl h-full rounded-2xl border-[12px] border-zinc-900 shadow-[0_40px_100px_rgba(0,0,0,0.3)]'
                    )}
                    style={{ 
                        transform: previewMode === 'mobile' ? `scale(${deviceScale})` : undefined,
                        transformOrigin: 'center center'
                    }}
                >
                    {/* Premium Device Accents (iPhone 16 Pro Style) */}
                    {previewMode === 'mobile' && (
                        <>
                            {/* Dynamic Island */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-zinc-950 rounded-[2rem] z-[40] flex items-center justify-between px-4 ring-1 ring-white/5 shadow-inner pointer-events-none">
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900/50" />
                                <div className="flex items-center gap-1.5 translate-x-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                    <div className="w-4 h-1 bg-zinc-800 rounded-full opacity-30" />
                                </div>
                            </div>
                            
                            {/* Reflection Gloss */}
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-30 z-[41]" />
                        </>
                    )}

                    {/* Simulated Content Scroll Area */}
                    <div ref={scrollRef} className="w-full h-full overflow-auto scrollbar-hide relative" style={{ backgroundColor: config.theme?.backgroundColor || '#ffffff' }}>
                        {/* Real Header - Now synced with Builder state */}
                        <StorefrontHeader 
                            studioName={studio.name}
                            logoUrl={config.header?.logoUrl || studio.logo_url}
                            theme={config.theme}
                            config={config}
                            isPreview={true}
                            activePage={activePage}
                            scrollRef={scrollRef}
                            forceMobile={previewMode === 'mobile'}
                            onNavigate={onNavigate}
                        currentBranchName={outlet?.name}
                        hasMultipleBranches={(studio.outlets || []).filter((o: any) => o.is_active && (o.status === 'published' || !o.status)).length > 1}
                    />

                    {/* Themeable Content Body */}
                    <div 
                        className="flex-1 flex flex-col"
                            style={{
                                '--primary-brand': config.theme?.primaryColor || '#2D3282',
                                '--global-text': config.theme?.textColor || '#000000',
                                '--global-bg': config.theme?.backgroundColor || '#ffffff',
                                '--button-color': config.theme?.buttonColor || config.theme?.primaryColor || '#2D3282',
                                '--button-radius': config.theme?.buttonRadius || '12px',
                                '--section-padding': config.theme?.sectionPadding || '5rem',
                                '--card-shadow': config.theme?.cardShadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                '--font-heading': config.theme?.headingFont || 'Playfair Display, serif',
                                '--font-body': config.theme?.bodyFont || 'Inter, sans-serif',
                                backgroundColor: 'var(--global-bg)',
                                color: 'var(--global-text)'
                            } as any}
                        >
                            {/* Dynamic Google Fonts Link */}
                            <link 
                                rel="stylesheet" 
                                href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(config.theme?.headingFont || 'Playfair Display')}:wght@400;700;900&family=${encodeURIComponent(config.theme?.bodyFont || 'Inter')}:wght@400;700;900&display=swap`} 
                            />

                            {
                                (() => {
                                    const resolvedTheme = useMemo(() => ({
                                        layoutStyle: config.theme?.layoutStyle || 'standard',
                                        primaryColor: config.theme?.primaryColor || '#2D3282',
                                        backgroundColor: config.theme?.backgroundColor || '#ffffff',
                                        textColor: config.theme?.textColor || '#000000',
                                        buttonColor: config.theme?.buttonColor || config.theme?.primaryColor || '#2D3282',
                                        buttonRadius: config.theme?.buttonRadius || '12px',
                                        headingFont: config.theme?.headingFont,
                                        bodyFont: config.theme?.bodyFont,
                                    }), [
                                        config.theme?.layoutStyle,
                                        config.theme?.primaryColor,
                                        config.theme?.backgroundColor,
                                        config.theme?.textColor,
                                        config.theme?.buttonColor,
                                        config.theme?.buttonRadius,
                                        config.theme?.headingFont,
                                        config.theme?.bodyFont
                                    ])

                                const isPremium = resolvedTheme.layoutStyle === 'premium'
                                const isMobile = previewMode === 'mobile'
                                
                                return (
                                    <>
                                        {/* UNIFIED PAGE RENDERER */}
                                        <div className={clsx(
                                            "flex-1 flex flex-col",
                                            activePage !== 'home' && "pt-24" // Add spacing for sub-pages since they don't have large heroes usually
                                        )}>
                                            {sections.length > 0 ? (
                                                sections.map((section: any) => {
                                                    if (!section.enabled) return null
                                                    
                                                    let sectionContent = null
                                                    switch (section.type) {
                                                        case 'hero':
                                                            sectionContent = <StorefrontHero studioName={studio.name} logoUrl={config.header?.logoUrl || studio.logo_url} bannerUrl={outlet?.hero_image_url || studio.banner_url} location={outlet?.address || studio.address || studio.location} config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'about':
                                                            sectionContent = <StorefrontAbout bio={studio.bio || ''} studioName={studio.name} config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'memberships':
                                                            sectionContent = <StorefrontMemberships studioName={studio.name} studioId={studio.id} config={section} memberships={memberships} theme={resolvedTheme} isMobile={isMobile} isPreview={true} onNavigate={onNavigate} />
                                                            break
                                                        case 'packages':
                                                            sectionContent = <StorefrontPackages studioName={studio.name} studioId={studio.id} config={section} packages={packages} theme={resolvedTheme} isMobile={isMobile} isPreview={true} onNavigate={onNavigate} />
                                                            break
                                                        case 'cta':
                                                            sectionContent = <StorefrontCTA config={section} theme={resolvedTheme} isMobile={isMobile} isPreview={true} onNavigate={onNavigate} />
                                                            break
                                                        case 'locations':
                                                            sectionContent = <StorefrontLocations studioName={studio.name} config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'contact':
                                                            sectionContent = <StorefrontContact config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'appointments':
                                                            sectionContent = <StorefrontAppointments config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'classes':
                                                            sectionContent = <StorefrontClasses config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'events':
                                                            sectionContent = <StorefrontEvents config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'blogs':
                                                            sectionContent = <StorefrontBlogs config={section} theme={resolvedTheme} isMobile={isMobile} posts={config.blog || []} studioSlug={studio.slug} branchSlug={outlet?.slug} isPreview={true} onNavigate={onNavigate} />
                                                            break
                                                        case 'timetable':
                                                            sectionContent = <StorefrontTimetable studioName={studio.name} initialSlots={[]} slug="preview" theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'faq':
                                                            sectionContent = <StorefrontFAQ config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break
                                                        case 'instructors':
                                                            sectionContent = <StorefrontInstructors config={section} theme={resolvedTheme} isMobile={isMobile} />
                                                            break

                                                        case 'gallery':

                                                            const images = section.content.images || []
                                                            const layout = section.content.layout || 'grid'
                                                            if (images.length === 0) {
                                                                sectionContent = <div className="py-24 text-center bg-zinc-50 border-y border-zinc-100 italic text-zinc-400 font-serif text-xl px-12">Your studio gallery...</div>
                                                            } else if (layout === 'slideshow') {
                                                                sectionContent = (
                                                                    <div className="py-24 space-y-8 overflow-hidden bg-white">
                                                                        <div className="flex gap-4 animate-drift whitespace-nowrap">
                                                                            {[...images, ...images].map((img, i) => (
                                                                                 <div key={i} className={clsx("inline-block rounded-[2rem] overflow-hidden shadow-lg border border-zinc-100", isMobile ? "w-[240px] h-[320px]" : "w-[300px] h-[400px]")}>
                                                                                     <img src={img} className="w-full h-full object-cover" />
                                                                                 </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            } else {
                                                                sectionContent = (
                                                                    <div className={clsx("py-24 grid gap-4", isMobile ? "grid-cols-2 px-6" : "grid-cols-4 px-12")}>
                                                                        {images.map((img: string, i: number) => (
                                                                            <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-zinc-100 shadow-sm">
                                                                                <img src={img} className="w-full h-full object-cover" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )
                                                            }
                                                            break
                                                        case 'reviews':
                                                            const reviews = section.content.reviews || []
                                                            if (reviews.length === 0) {
                                                                sectionContent = <div className="py-24 text-center bg-zinc-50 italic text-zinc-400 font-serif text-xl px-12">"Testimonials build trust..."</div>
                                                            } else {
                                                                sectionContent = (
                                                                    <div className={clsx("py-24 bg-white grid gap-8", isMobile ? "grid-cols-1 px-6" : "grid-cols-3 px-12")}>
                                                                        {reviews.map((rev: any, i: number) => (
                                                                            <div key={i} className="p-8 rounded-[2rem] bg-zinc-50 border border-zinc-100 space-y-4">
                                                                                 <div className="flex gap-1 text-emerald-500 text-xs">★★★★★</div>
                                                                                 <p className="text-sm font-serif italic text-zinc-700">"{rev.text}"</p>
                                                                                 <div className="flex items-center gap-2 pt-4 border-t border-zinc-200">
                                                                                     <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden">{rev.avatar && <img src={rev.avatar} className="w-full h-full object-cover" />}</div>
                                                                                     <span className="text-[10px] font-bold uppercase tracking-widest">{rev.name}</span>
                                                                                 </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )
                                                            }
                                                            break
                                                    }

                                                    if (!sectionContent) return null

                                                    return (
                                                        <div 
                                                            key={section.id} 
                                                            data-section-id={section.id}
                                                            className={clsx(
                                                                "relative transition-all duration-500",
                                                                (hoveredSectionId === section.id || navPath?.id === section.id) && "ring-4 ring-indigo-500/30 ring-inset z-10 shadow-[0_0_50px_rgba(99,102,241,0.2)]"
                                                            )}
                                                        >
                                                            {sectionContent}
                                                            {(hoveredSectionId === section.id || navPath?.id === section.id) && <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/50 mix-blend-overlay animate-pulse" />}
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center py-40 text-center space-y-6">
                                                    <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center border border-dashed border-zinc-200">
                                                        <Layout className="w-8 h-8 text-zinc-300" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h3 className="text-xl font-serif italic text-zinc-400">This page is waiting for your touch...</h3>
                                                        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">Add segments from the sidebar to start building</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Common Footer */}
                                        <StorefrontFooter 
                                            studio={studio} 
                                            config={config} 
                                            theme={resolvedTheme} 
                                            isMobile={isMobile} 
                                            isPreview={true}
                                            onNavigate={onNavigate}
                                        />

                                        {/* Mobile Overlays & Floating Widgets in Preview */}
                                        <MobileActionBar forceShow={isMobile} />
                                        
                                        {(() => {
                                            // Handle branch/global scoping for preview
                                            const branchOverride = config.branchOverrides?.[searchParams.get('outletId') || '']?.floatingWidgets
                                            const globalConfig = config.floatingWidgets
                                            
                                            const whatsappEnabled = branchOverride?.whatsapp?.enabled ?? globalConfig?.whatsapp?.enabled ?? studio.show_whatsapp_button
                                            const whatsappNumber = branchOverride?.whatsapp?.number || globalConfig?.whatsapp?.number || studio.whatsapp_number
                                            
                                            const backToTopEnabled = branchOverride?.backToTop?.enabled ?? globalConfig?.backToTop?.enabled ?? false

                                            return (
                                                <>
                                                    {whatsappEnabled && <WhatsAppFAB phoneNumber={whatsappNumber} isMobile={isMobile} />}
                                                    {backToTopEnabled && (
                                                        <BackToTopFAB 
                                                            scrollRef={scrollRef} 
                                                            threshold={200}
                                                            isMobile={isMobile}
                                                        />
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </>
                                )
                            })()
                        }

                    </div>
                </div>
            </div>
        </div>
    )
}
