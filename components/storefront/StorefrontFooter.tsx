'use client'

import { memo } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { MapPin, Instagram, Facebook, Twitter, Chrome as TikTok, Globe } from 'lucide-react'
import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface StorefrontFooterProps {
    studio: any
    config: any
    theme?: any
    isMobile?: boolean
    onNavigate?: (id: string) => void
    isPreview?: boolean
}

const LEGACY_HREF_MAP: Record<string, string> = {
    '/faq': '#faq',
    '/locations': '#locations',
    '/contact-us': '#contact',
    '/terms-of-service': '/policies/terms',
    '/privacy': '/policies/privacy'
}

function StorefrontFooter({ studio, config, theme, isMobile = false, onNavigate, isPreview = false }: StorefrontFooterProps) {
    const params = useParams<{ slug?: string; branchSlug?: string }>()
    const pathname = usePathname()
    const router = useRouter()
    const footerConfig = config?.footer || {}
    const logoUrl = config?.header?.logoUrl || studio.logo_url
    const sections = config?.pages?.home?.sections || config?.sections || []
    const enabledSections = sections.filter((section: any) => section?.enabled !== false)
    const hasSection = (type: string) => enabledSections.some((section: any) => section?.type === type)
    const hasPricing = hasSection('memberships') || hasSection('packages')
    const hasSchedule = hasSection('timetable')
    const hasLocations = hasSection('locations')
    const hasAbout = hasSection('about')
    const hasFaq = hasSection('faq')
    const hasContact = hasSection('contact')
    const baseStorefrontPath = params?.branchSlug
        ? `/s/${params.slug}/${params.branchSlug}`
        : `/s/${params?.slug || studio.slug}`

    const defaultFooterLinks = [
        hasAbout && { label: 'About Us', href: '#about' },
        hasPricing && { label: 'Pricing', href: '/pricing' },
        hasSchedule && { label: 'Schedule', href: '/schedule' },
        hasLocations && { label: 'Locations', href: '#locations' },
        hasFaq && { label: 'FAQ', href: '#faq' },
        hasContact && { label: 'Contact', href: '#contact' }
    ].filter(Boolean) as { label: string; href: string; hidden?: boolean }[]

    const footerLinks = (() => {
        const configuredLinks = (config?.navigation?.footer || [])
            .map((link: any) => ({ ...link, href: LEGACY_HREF_MAP[link.href] ?? link.href }))
            .filter((link: any) => !link.hidden && (link.itemType !== 'link' || link.href))
        if (configuredLinks.length === 0) return defaultFooterLinks

        const hasFaqLink = configuredLinks.some((link: any) => (link.label || '').toLowerCase().includes('faq') || link.href === '#faq' || link.href === '/faq')
        return hasFaq && !hasFaqLink
            ? [...configuredLinks, { label: 'FAQ', href: '#faq' }]
            : configuredLinks
    })()

    const resolveFooterHref = (href?: string) => {
        if (!href) return baseStorefrontPath
        if (href.startsWith('http')) return href
        if (href.startsWith('#')) return `${baseStorefrontPath}${href}`
        if (href.startsWith('/')) return `${baseStorefrontPath}${href}`
        return href
    }

    const navigateFooterLink = (href?: string) => {
        if (!href) {
            if (isPreview && onNavigate) {
                onNavigate('hero')
                return
            }
            router.push(baseStorefrontPath)
            return
        }

        if (href.startsWith('http')) {
            window.open(href, '_blank', 'noopener,noreferrer')
            return
        }

        // Builder Mode Interception
        if (isPreview && onNavigate) {
            const h = href.toLowerCase()
            if (h.includes('pricing') || h.includes('membership') || h.includes('package')) {
                onNavigate('pricing')
                return
            }
            if (h.includes('schedule') || h.includes('class')) {
                onNavigate('schedule')
                return
            }
            if (h === '/' || h === '#hero' || h === '' || h === 'home') {
                onNavigate('hero')
                return
            }
            
            // Handle anchors by stripping #
            if (href.startsWith('#')) {
                onNavigate(href.slice(1))
                return
            }
            
            // Generic page navigation in builder
            onNavigate(href.replace(/^\/|\/$/g, ''))
            return
        }

        if (href.startsWith('#')) {
            if (pathname === baseStorefrontPath) {
                const target = document.getElementById(href.slice(1))
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    return
                }
            }
            router.push(resolveFooterHref(href))
            return
        }

        router.push(resolveFooterHref(href))
    }
    
    return (
        <footer 
            className={clsx(
                "py-24 border-t border-zinc-100 transition-colors duration-500",
                isMobile ? "px-4 pb-32" : "px-6 md:px-12"
            )}
            id="footer"
            style={{ 
                backgroundColor: theme?.backgroundColor || '#ffffff',
                color: theme?.textColor || '#1a1a1a'
            }}
        >
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
                {/* Logo & Tagline */}
                <div className="flex flex-col items-center gap-6">
                    {footerConfig.logoStyle === 'seal' && logoUrl ? (
                        <div className="w-16 h-16 rounded-full border border-zinc-100 overflow-hidden shadow-zinc-100 shadow-xl">
                            <img src={logoUrl} className="w-full h-full object-cover" alt={studio.name} />
                        </div>
                    ) : footerConfig.logoStyle === 'standard' && logoUrl ? (
                        <img src={logoUrl} className="h-10 w-auto object-contain" alt={studio.name} />
                    ) : logoUrl ? (
                        <img src={logoUrl} className="h-10 w-auto object-contain" alt={studio.name} />
                    ) : (
                        <h2 className="text-2xl font-serif font-black uppercase tracking-tighter text-charcoal-900" style={{ color: 'var(--global-text)' }}>{studio.name}</h2>
                    )}
                        <p 
                        className="max-w-xs text-center text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-60"
                        style={{ color: 'var(--global-text)' }}
                    >
                        {footerConfig.tagline || 'Move Stronger • Live Better'}
                    </p>
                </div>

                {/* Social Links */}
                <div className="flex items-center justify-center gap-6">
                    {(() => {
                        const links = config?.socialLinks || footerConfig.socialLinks || {};
                        const linkArray = Array.isArray(links) 
                            ? links 
                            : Object.entries(links)
                                .filter(([_, url]) => url)
                                .map(([platform, url]) => ({ platform, url: url as string }));

                        if (linkArray.length > 0) {
                            return linkArray.map((link: any, idx: number) => {
                                const platform = link.platform?.toLowerCase() || ''
                                
                                return (
                                    <a 
                                        key={idx} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-11 h-11 rounded-full border border-zinc-100 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-zinc-200 group relative overflow-hidden bg-white/5"
                                        style={{ 
                                            color: theme?.primaryColor || '#1a1a1a',
                                            borderColor: (theme?.primaryColor || '#1a1a1a') + '20' 
                                        }}
                                        title={link.platform}
                                    >
                                        <div className="relative z-10">
                                            {platform === 'instagram' ? <Instagram className="w-4.5 h-4.5 group-hover:rotate-6 transition-transform" /> :
                                             platform === 'facebook' ? <Facebook className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" /> :
                                             platform === 'twitter' || platform === 'x' ? <Twitter className="w-4.5 h-4.5" /> :
                                             platform === 'tiktok' ? (
                                                <svg className="w-4.5 h-4.5 group-hover:animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                                                </svg>
                                             ) : (
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {link.platform?.charAt(0) || 'S'}
                                                </span>
                                             )}
                                        </div>
                                        <div className="absolute inset-0 bg-zinc-50 opacity-0 group-hover:opacity-10 transition-opacity" />
                                    </a>
                                )
                            });
                        }

                        return null; // Hide if no links
                    })()}
                </div>

                <div className="w-full pt-12 border-t border-zinc-50 flex flex-col items-center gap-8">
                    <div className={clsx(
                        "flex flex-wrap items-center justify-center",
                        isMobile ? "gap-6" : "gap-10"
                    )}>
                        {footerLinks.map((link: any) => (
                            <button 
                                key={link.label} 
                                type="button"
                                onClick={() => navigateFooterLink(link.href)}
                                className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400 hover:text-zinc-900 transition-all duration-300 relative group"
                            >
                                {link.label}
                                <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-zinc-900 transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
                            </button>
                        ))}
                    </div>

                    
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[10px] md:text-[11px] text-zinc-500 font-bold uppercase tracking-[0.2em] md:tracking-[0.45em] text-center px-4 leading-relaxed">
                            &copy; {new Date().getFullYear()} {studio.name} &bull; Powered by StudioVault
                        </p>
                        {studio.address && (
                            <p className={clsx(
                                "text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 text-center leading-relaxed",
                                isMobile ? "px-4" : "px-6"
                            )}>
                                <MapPin className="w-3 h-3 text-zinc-300" />
                                {studio.address}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default memo(StorefrontFooter)
