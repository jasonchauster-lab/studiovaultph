'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Menu, X, User, ChevronRight, LogOut, LayoutDashboard, Calendar, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import AuthModal from '@/components/auth/AuthModal'
import Image from 'next/image'
import supabaseLoader from '@/lib/utils/image-loader'

interface StorefrontHeaderProps {
    studioName: string
    logoUrl?: string | null
    theme: any
    config: any
    profile?: any
    avatarUrl?: string
    currentBranchName?: string
    hasMultipleBranches?: boolean
    // New props for Builder synchronization
    onNavigate?: (id: string) => void
    activePage?: string
    scrollRef?: React.RefObject<HTMLDivElement | null>
    isPreview?: boolean
    forceMobile?: boolean
    referralConfig?: any
    studioMembership?: any
}

interface NavChild {
    label: string
    id: string
    href: string
}

interface NavItem {
    label: string
    id: string
    href?: string
    itemType?: 'link' | 'group'
    hidden?: boolean
    children?: NavChild[]
}

const LEGACY_HREF_MAP: Record<string, string> = {
    '/locations': '#locations',
    '/contact-us': '#contact',
    '/terms-of-service': '',
    '/privacy': ''
}

function StorefrontHeader({
    studioName, logoUrl, theme, config, profile, avatarUrl, 
    currentBranchName, hasMultipleBranches,
    onNavigate, activePage = 'home', scrollRef, isPreview = false,
    forceMobile = false, referralConfig, studioMembership
}: StorefrontHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [expandedMobileGroups, setExpandedMobileGroups] = useState<string[]>([])
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
    const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const params = useParams()
    const pathname = usePathname()
    const router = useRouter()
    const slug = params?.slug as string
    const branchSlug = params?.branchSlug as string | undefined

    const [activeSection, setActiveSection] = useState<string>('hero')

    const toggleMobileGroup = (groupId: string) => {
        setExpandedMobileGroups((current) =>
            current.includes(groupId)
                ? current.filter((id) => id !== groupId)
                : [...current, groupId]
        )
    }

    const resolveInternalHref = (href?: string) => {
        if (!href) return branchSlug ? `/s/${slug}/${branchSlug}` : `/s/${slug}`
        if (href.startsWith('http')) return href
        if (href.startsWith('/')) return branchSlug ? `/s/${slug}/${branchSlug}${href}` : `/s/${slug}${href}`
        if (href.startsWith('#')) return branchSlug ? `/s/${slug}/${branchSlug}${href}` : `/s/${slug}${href}`
        return href
    }
    const storefrontHomePath = branchSlug ? `/s/${slug}/${branchSlug}` : `/s/${slug}`

    useEffect(() => {
        const target = scrollRef?.current || window
        const handleScroll = () => {
            const scrollY = scrollRef?.current ? scrollRef.current.scrollTop : window.scrollY
            setIsScrolled(prev => {
                const threshold = 50;
                if (prev !== (scrollY > threshold)) {
                    return scrollY > threshold;
                }
                return prev;
            });
        }
        target.addEventListener('scroll', handleScroll as any)
        return () => target.removeEventListener('scroll', handleScroll as any)
    }, [scrollRef])

    // Lock scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            const currentScrollRef = scrollRef?.current
            if (currentScrollRef) {
                currentScrollRef.style.overflow = 'hidden'
            } else {
                document.body.style.overflow = 'hidden'
            }
        } else {
            const currentScrollRef = scrollRef?.current
            if (currentScrollRef) {
                currentScrollRef.style.overflow = ''
            } else {
                document.body.style.overflow = ''
            }
        }
        return () => {
            if (scrollRef?.current) scrollRef.current.style.overflow = ''
            document.body.style.overflow = ''
        }
    }, [isMenuOpen, scrollRef])

    // Intersection Observer for scroll highlighting
    useEffect(() => {
        const sections = ['hero', 'pricing', 'schedule', 'locations', 'contact', 'about']
        const observerOptions = {
            root: scrollRef?.current || null,
            rootMargin: '-10% 0px -80% 0px',
            threshold: 0
        }

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id)
                }
            })
        }

        const observer = new IntersectionObserver(observerCallback, observerOptions)
        sections.forEach(id => {
            // Safety Check: Only observe if element exists in the DOM
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })

        return () => observer.disconnect()
    }, [scrollRef, activePage, config?.sections]) // Re-run if sections list changes in builder

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push(`/s/${slug}`)
    }

    // Click outside handler for profile dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Capture referral code from URL
    useEffect(() => {
        const ref = new URLSearchParams(window.location.search).get('ref')
        if (ref) {
            localStorage.setItem(`studio_ref_${slug}`, ref)
        }
    }, [slug])

    const headerConfig = config?.header || {}
    const navTextColor = headerConfig.textColor || '#000000'
    const headerBgColor = headerConfig.backgroundColor || '#ffffff'
    const activeLogoUrl = headerConfig.logoUrl || logoUrl
    const isPremium = theme?.layoutStyle === 'premium'

    const sections = config?.pages?.home?.sections || config?.sections || []
    const enabledSections = sections.filter((s: any) => s.enabled)

    // Map sections to navigation items
    const pricingSection = enabledSections.find((s: any) => s.type === 'memberships' || s.type === 'packages')
    const hasHero = enabledSections.some((s: any) => s.type === 'hero')
    const hasBooking = enabledSections.some((s: any) => s.type === 'booking')
    const hasLocations = enabledSections.some((s: any) => s.type === 'locations')
    const hasContact = enabledSections.some((s: any) => s.type === 'contact')

    const navigationLinks = config?.navigation?.header || []
    
    // Map hrefs to section IDs for highlighting/scrolling
    const getNavId = (href: string) => {
        const h = href.toLowerCase()
        if (h === '/' || h === '#hero' || h === '') return 'hero'
        if (h.includes('pricing') || h.includes('membership') || h.includes('package')) return 'pricing'
        if (h.includes('schedule') || h.includes('class')) return 'schedule'
        if (h.includes('location')) return 'locations'
        if (h.includes('contact')) return 'contact'
        if (h.includes('about')) return 'about'
        return href.replace(/^\//, '') || 'hero'
    }

    const sanitizeHref = (href?: string) => {
        if (!href) return ''
        return LEGACY_HREF_MAP[href] ?? href
    }

    const navItems = (navigationLinks.length > 0 
        ? navigationLinks.map((item: any): NavItem => ({
            label: item.label,
            id: getNavId(item.href || item.children?.[0]?.href || item.label || ''),
            href: sanitizeHref(item.href),
            itemType: item.itemType || (item.children?.length ? 'group' : 'link'),
            hidden: item.hidden,
            children: item.children?.filter((c: any) => !c.hidden).map((c: any): NavChild => ({
                label: c.label,
                id: getNavId(c.href),
                href: sanitizeHref(c.href)
            }))
        }))
        : [
            { id: 'hero', label: 'Home', href: storefrontHomePath },
            ...(pricingSection ? [{ id: 'pricing', label: 'Pricing', href: '#pricing' }] : []),
            ...(hasBooking ? [{ id: 'schedule', label: 'Schedule', href: '#schedule' }] : []),
            ...(profile ? [{ id: 'my-bookings', label: 'My Bookings', href: `/s/${slug}/dashboard?tab=bookings` }] : []),
            ...(referralConfig?.is_enabled ? [{ id: 'referral', label: 'Refer & Earn', href: '#referral' }] : []),
            ...(hasLocations ? [{ id: 'locations', label: 'Locations', href: '#locations' }] : []),
            ...(hasContact ? [{ id: 'contact', label: 'Contact', href: '#contact' }] : [])
        ]
    ).filter((item: any): item is NavItem => !!item && !item.hidden)

    return (
      <>
        <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[1000] focus:px-6 focus:py-3 focus:bg-white focus:text-[var(--primary-brand)] focus:rounded-xl focus:shadow-2xl focus:font-black focus:uppercase focus:tracking-widest"
        >
            Skip to content
        </a>
        <header 
            className={clsx(
                "transition-all duration-700 flex items-center border-b z-[100] w-full",
                isPreview ? (forceMobile ? "sticky top-0 px-4" : "sticky top-0 px-8") : "fixed top-0 left-0 right-0 px-4 md:px-10 lg:px-20",
                isScrolled ? 'py-2 md:py-4 shadow-tight backdrop-blur-2xl' : isPremium ? 'py-4 md:py-10' : 'py-3 md:py-8'
            )}
            style={{ 
                fontFamily: 'var(--font-heading)',
                backgroundColor: isScrolled ? `${headerBgColor}CC` : 'transparent',
                borderColor: isScrolled ? 'rgba(0,0,0,0.05)' : 'transparent',
            }}
        >
              {/* Logo: Centered on mobile absolute, left on desktop static */}
              <div className={clsx(
                  "flex-1 lg:static lg:left-0 lg:translate-x-0 flex items-center justify-start",
                  (forceMobile) ? "justify-start" : "justify-center lg:justify-start"
              )}>
                <div 
                    onClick={() => {
                        if (isPreview) {
                            onNavigate?.('hero')
                        } else {
                            router.push(`/s/${slug}`)
                        }
                    }}
                    className="cursor-pointer group flex items-center gap-4"
                >
                    {headerConfig.logoStyle === 'seal' && activeLogoUrl ? (
                        <div className={clsx(
                            "relative overflow-hidden rounded-full border border-white/10 shadow-lg transition-all duration-700",
                            isScrolled ? 'h-8 w-8 md:h-10 md:w-10' : 'h-10 w-10 md:h-14 md:w-14'
                        )}>
                            <Image 
                                loader={supabaseLoader}
                                src={activeLogoUrl} 
                                fill
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                alt={studioName} 
                                priority
                                sizes="(max-width: 768px) 40px, 56px"
                            />
                        </div>
                    ) : headerConfig.logoStyle === 'standard' && activeLogoUrl ? (
                        <div className={clsx(
                            "relative transition-all duration-700",
                            isScrolled ? 'h-5 md:h-10' : 'h-6 md:h-12'
                        )}>
                            <Image 
                                loader={supabaseLoader}
                                src={activeLogoUrl} 
                                width={200}
                                height={60}
                                className="h-full w-auto object-contain transition-all duration-700"
                                alt={studioName}
                                priority
                            />
                        </div>
                    ) : (
                        <>
                            <h1 
                                className={clsx(
                                    "text-[14px] md:text-2xl font-black tracking-tighter uppercase transition-colors duration-700 break-words max-w-[160px] md:max-w-none leading-none",
                                    isScrolled ? "text-[12px] md:text-xl" : ""
                                )}
                                style={{ 
                                    color: isScrolled ? navTextColor : '#000000',
                                    fontFamily: 'var(--font-heading)'
                                }}
                            >
                                {studioName}
                            </h1>

                        </>
                    )}
                </div>

                {hasMultipleBranches && currentBranchName && !forceMobile && (
                    <div className="hidden sm:flex flex-col border-l border-zinc-200 pl-4 py-1 ml-4">
                        <span className={clsx(
                            "text-[9px] font-bold uppercase tracking-widest transition-colors",
                            isScrolled ? "text-zinc-500" : "text-zinc-400"
                        )}>
                            {currentBranchName}
                        </span>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/s/${slug}?select=true`)
                            }}
                            className="text-[8px] font-black text-[var(--primary-brand)] uppercase tracking-tighter hover:underline text-left mt-0.5"
                        >
                            Switch Location
                        </button>
                    </div>
                )}
              </div>

             {/* Center: Navigation Links */}
             <nav className={clsx(
                 "items-center gap-8 md:gap-10",
                 (forceMobile) ? "hidden" : "hidden md:flex"
             )}>
                  {navItems.map((item: NavItem) => (
                    <div key={item.label} className="relative group/nav-item">
                        <button 
                            onClick={() => {
                                if (item.itemType === 'group' || (item.children && item.children.length > 0)) {
                                    return
                                }
                                
                                // Builder Mode - use callback
                                if (isPreview && onNavigate) {
                                    onNavigate(item.id)
                                    return
                                }

                                // Handle external links
                                if (item.href?.startsWith('http')) {
                                    window.open(item.href, '_blank')
                                    return
                                }

                                // Dedicated routes handling with branch scoping
                                if (item.id === 'pricing' || item.id === 'schedule' || item.id === 'my-bookings' || item.id === 'faq') {
                                    if (item.href && !item.href.startsWith('#')) {
                                        router.push(resolveInternalHref(item.href))
                                        return
                                    }
                                    if (branchSlug) {
                                        router.push(`/s/${slug}/${branchSlug}/${item.id}`)
                                    } else {
                                        router.push(`/s/${slug}/${item.id}`)
                                    }
                                    return
                                }

                                // Correct cross-page navigation if not on home
                                const isHome = pathname === storefrontHomePath
                                if (!isHome && item.href?.startsWith('#')) {
                                    router.push(resolveInternalHref(item.href))
                                    return
                                }

                                if (!isHome && !item.href?.startsWith('#')) {
                                    // If it's a specific internal path
                                    if (item.href?.startsWith('/')) {
                                        router.push(resolveInternalHref(item.href))
                                    } else {
                                        router.push(`${storefrontHomePath}#${item.id}`)
                                    }
                                    return
                                }

                                // Smooth scroll for home page
                                if (item.id === 'hero') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                } else {
                                    const element = document.getElementById(item.id)
                                    if (element) {
                                        const headerOffset = 120;
                                        const elementPosition = element.getBoundingClientRect().top;
                                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                        
                                    window.scrollTo({
                                        top: offsetPosition,
                                        behavior: 'smooth'
                                    });
                                    } else if (item.href?.startsWith('/')) {
                                        // Fallback to router push if element not found but href exists
                                        router.push(resolveInternalHref(item.href))
                                    } else if (item.href?.startsWith('#')) {
                                        router.push(resolveInternalHref(item.href))
                                    }
                                }
                            }}
                            aria-current={((item.id === 'hero' && activeSection === 'hero') || item.id === activeSection) ? "page" : undefined}
                            className={clsx(
                                "flex items-center gap-1.5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-700 hover:opacity-100 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-brand)] rounded-lg px-2",
                                isScrolled ? 'opacity-100' : 'opacity-60 text-black hover:opacity-100',
                                item.itemType === 'group' || (item.children && item.children.length > 0) ? 'cursor-default' : 'cursor-pointer',
                                ((item.id === 'hero' && activeSection === 'hero') || item.id === activeSection) && "opacity-100 scale-110"
                            )}
                            style={{ 
                                color: isScrolled ? navTextColor : undefined 
                            }}
                        >
                            {item.label}
                            {(item.itemType === 'group' || (item.children && item.children.length > 0)) && (
                                <ChevronRight className="w-3 h-3 rotate-90 transition-transform group-hover/nav-item:-rotate-90" aria-hidden="true" />
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {item.children && item.children.length > 0 && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 translate-y-2 pointer-events-none group-hover/nav-item:opacity-100 group-hover/nav-item:translate-y-0 group-hover/nav-item:pointer-events-auto transition-all duration-300 z-[100]">
                                <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/5 overflow-hidden min-w-[200px] p-2">
                                    {item.children.map((child: NavChild) => (
                                        <button
                                            key={child.label}
                                            onClick={() => {
                                                if (isPreview && onNavigate) {
                                                    onNavigate(child.id)
                                                    return
                                                }
                                                router.push(resolveInternalHref(child.href))
                                            }}
                                            className="w-full text-left px-5 py-3 hover:bg-zinc-50 rounded-xl transition-colors group/sub-item"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover/sub-item:text-black transition-colors">
                                                {child.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                  ))}
             </nav>
             
             {/* Right: Actions */}
             <div className="flex-1 items-center justify-end gap-2 md:gap-5 flex">
                <div className="flex items-center gap-2 sm:gap-4">
                     {profile ? (
                        <div className="flex items-center gap-3">
                             {config?.features?.wallet_enabled !== false && (
                                 <motion.div 
                                     initial={{ opacity: 0, x: 20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-full"
                                 >
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                     <span className="text-[10px] font-black tracking-widest text-[#2D3282]">
                                         ₱{(studioMembership?.available_balance || 0).toLocaleString()}
                                     </span>
                                 </motion.div>
                             )}
                             <div className="relative" ref={dropdownRef}>
                                 <button 
                                     onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                     className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-black/10 transition-transform active:scale-95 bg-zinc-100 flex items-center justify-center"
                                 >
                                     {avatarUrl ? (
                                         <img src={avatarUrl} className="w-full h-full object-cover" alt={profile?.full_name || 'User profile'} />
                                     ) : (
                                         <User className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
                                     )}
                                 </button>
                            <AnimatePresence>
                                {isProfileDropdownOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/5 overflow-hidden z-[110]"
                                    >
                                        <div className="p-2 space-y-1">
                                            <button 
                                                onClick={() => {
                                                    if (isPreview) {
                                                        onNavigate?.('dashboard')
                                                        return
                                                    }
                                                    router.push(`/s/${slug}/dashboard?tab=bookings`)
                                                    setIsProfileDropdownOpen(false)
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-black hover:bg-zinc-50 rounded-xl transition-all"
                                            >
                                                <Calendar className="w-4 h-4" aria-hidden="true" />
                                                My Bookings
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (isPreview) {
                                                        onNavigate?.('dashboard')
                                                        return
                                                    }
                                                    router.push(`/s/${slug}/dashboard`)
                                                    setIsProfileDropdownOpen(false)
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-black hover:bg-zinc-50 rounded-xl transition-all"
                                            >
                                                <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                                                Dashboard
                                            </button>
                                            {config?.features?.wallet_enabled !== false && (
                                                <button 
                                                    onClick={() => {
                                                        if (isPreview) {
                                                            onNavigate?.('dashboard')
                                                            return
                                                        }
                                                        setIsProfileDropdownOpen(false)
                                                        router.push(`/s/${slug}/dashboard?tab=wallet`)
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-black hover:bg-zinc-50 rounded-xl transition-all"
                                                >
                                                    <CreditCard className="w-4 h-4" aria-hidden="true" />
                                                    My Wallet
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    setIsProfileDropdownOpen(false)
                                                    handleSignOut()
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <LogOut className="w-4 h-4" aria-hidden="true" />
                                                Log Out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                             </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => {
                                setAuthModalMode('login')
                                setIsAuthModalOpen(true)
                            }}
                            aria-label="User Profile"
                            className={clsx(
                                "p-1.5 sm:p-2 rounded-full transition-all flex items-center justify-center",
                                isScrolled ? "bg-black/5" : "bg-white/10"
                            )}
                        >
                            <User className={clsx("w-4 h-4 sm:w-5 sm:h-5", forceMobile ? "w-3.5 h-3.5" : "")} style={{ color: isScrolled ? navTextColor : '#000000' }} />
                        </button>
                    )}

                    <button 
                        onClick={() => setIsMenuOpen(true)}
                        aria-label="Menu"
                        className={clsx(
                            "p-1.5 sm:p-2 rounded-full transition-all flex items-center justify-center",
                            isScrolled ? "bg-black/5" : "bg-white/10"
                        )}
                    >
                        <Menu className={clsx("w-4 h-4 sm:w-5 sm:h-5", forceMobile ? "w-4 h-4" : "")} style={{ color: isScrolled ? navTextColor : '#000000' }} />
                    </button>
                </div>
             </div>
        </header>
        
        {/* Mobile Navigation Drawer - Moved outside header to avoid backdrop-filter clipping */}
        <AnimatePresence>
            {isMenuOpen && (
                <motion.div 
                    key="mobile-nav-root"
                    className="fixed inset-0 z-[500]"
                >
                    {/* Backdrop */}
                    <motion.div 
                        key="nav-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMenuOpen(false)}
                        className="bg-black/40 fixed inset-0"
                    />
                    
                    {/* Drawer */}
                    <motion.div 
                        key="nav-drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
                        className="absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[201] shadow-2xl flex flex-col h-full overflow-hidden will-change-transform"
                        style={{ 
                            // Handle Safe Areas for modern devices
                            paddingTop: 'env(safe-area-inset-top, 0px)'
                        }}
                    >
                        <div className={clsx(
                            "flex items-center justify-between border-b flex-shrink-0",
                            forceMobile ? "pt-12 pb-6 px-6" : "p-6"
                        )}>
                            <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Menu</span>
                            <button 
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"
                                aria-label="Close menu"
                            >
                                <X className="w-5 h-5 text-zinc-900" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-12">
                            {/* Premium Login Card at the top */}
                            <div className="space-y-4">
                                 {profile ? (
                                    <div className="space-y-4">
                                        <button 
                                            onClick={() => {
                                                setIsMenuOpen(false)
                                                router.push(`/s/${slug}/dashboard?tab=bookings`)
                                            }}
                                            className="w-full p-6 bg-charcoal-900 text-white rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl"
                                        >
                                             <div className="flex items-center gap-4">
                                                 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                                     {avatarUrl ? (
                                                         <img src={avatarUrl} className="w-full h-full object-cover" alt={profile.full_name} />
                                                     ) : (
                                                         <User className="w-5 h-5 text-white" />
                                                     )}
                                                 </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold tracking-tight">{profile.full_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">View Bookings</p>
                                                        {config?.features?.wallet_enabled !== false && (
                                                            <>
                                                                <span className="text-white/20">•</span>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">₱{(studioMembership?.available_balance || 0).toLocaleString()}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                                        </button>
                                        <button 
                                            onClick={handleSignOut}
                                            className="w-full p-4 rounded-2xl border-2 border-zinc-100 text-zinc-500 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-[0.98]"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Log Out
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => {
                                            setIsMenuOpen(false)
                                            setAuthModalMode('login')
                                            setIsAuthModalOpen(true)
                                        }}
                                        className="w-full p-6 bg-charcoal-900 text-white rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all shadow-xl"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-sm font-bold tracking-tight">Login / Sign Up</span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-colors" />
                                    </button>
                                )}
                            </div>

                            {/* Branch Switcher for Multiple Branches */}
                            {hasMultipleBranches && currentBranchName && (
                                <div className="space-y-4">
                                    <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all" 
                                         onClick={() => {
                                             setIsMenuOpen(false)
                                             router.push(`/s/${slug}?select=true`)
                                         }}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-[var(--primary-brand)]">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Current Location</p>
                                                <p className="text-sm font-bold tracking-tight text-zinc-900">{currentBranchName}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-brand)] bg-white px-3 py-1.5 rounded-lg border border-zinc-100 shadow-sm">Switch</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex flex-col gap-6">
                                    {navItems.map((item: NavItem) => (
                                        <div key={item.label} className="space-y-4">
                                            <button 
                                                onClick={() => {
                                                    if (item.children && item.children.length > 0) {
                                                        toggleMobileGroup(item.label)
                                                        return
                                                    }

                                                    setIsMenuOpen(false)
                                                    // Builder Mode - use callback
                                                    if (isPreview && onNavigate) {
                                                        onNavigate(item.id)
                                                        return
                                                    }

                                                    // Handle external links
                                                    if (item.href?.startsWith('http')) {
                                                        window.open(item.href, '_blank')
                                                        return
                                                    }

                                                    // Dedicated routes handling
                                                    if (item.id === 'pricing' || item.id === 'schedule') {
                                                        if (item.href && !item.href.startsWith('#')) {
                                                            router.push(resolveInternalHref(item.href))
                                                            return
                                                        }
                                                        if (branchSlug) {
                                                            router.push(`/s/${slug}/${branchSlug}/${item.id}`)
                                                        } else {
                                                            router.push(`/s/${slug}/${item.id}`)
                                                        }
                                                        return
                                                    }

                                                    // Correct cross-page navigation if not on home
                                                    const isHome = pathname === storefrontHomePath
                                                    if (!isHome && item.href?.startsWith('#')) {
                                                        router.push(resolveInternalHref(item.href))
                                                        return
                                                    }

                                                    if (!isHome && !item.href?.startsWith('#')) {
                                                        if (item.href?.startsWith('/')) {
                                                            router.push(resolveInternalHref(item.href))
                                                        } else {
                                                            router.push(`${storefrontHomePath}#${item.id}`)
                                                        }
                                                        return
                                                    }

                                                    // Smooth scroll for home page
                                                    if (item.id === 'hero') {
                                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                                    } else {
                                                        const element = document.getElementById(item.id)
                                                        if (element) {
                                                            const headerOffset = 100;
                                                            const elementPosition = element.getBoundingClientRect().top;
                                                            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                                            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                                                        } else if (item.href?.startsWith('/')) {
                                                            router.push(resolveInternalHref(item.href))
                                                        } else if (item.href?.startsWith('#')) {
                                                            router.push(resolveInternalHref(item.href))
                                                        }
                                                    }
                                                }}
                                                className={clsx(
                                                    "text-xl font-black uppercase tracking-widest text-left transition-all duration-300 flex items-center justify-between w-full",
                                                    ((item.id === 'hero' && activeSection === 'hero') || item.id === activeSection) 
                                                        ? "text-charcoal-900" 
                                                        : "text-zinc-400 hover:text-zinc-900"
                                                )}
                                                style={{ fontFamily: 'var(--font-heading)' }}
                                            >
                                                {item.label}
                                                {(item.itemType === 'group' || (item.children && item.children.length > 0)) && (
                                                    <ChevronRight className={clsx(
                                                        "w-5 h-5 opacity-20 transition-transform",
                                                        expandedMobileGroups.includes(item.label) && "rotate-90"
                                                    )} />
                                                )}
                                            </button>

                                            {/* Mobile Sub-menu */}
                                            {item.children && item.children.length > 0 && expandedMobileGroups.includes(item.label) && (
                                                <div className="pl-6 border-l-2 border-zinc-100 flex flex-col gap-4 py-2">
                                                    {item.children.map((child: any) => (
                                                        <button
                                                            key={child.label}
                                                            onClick={() => {
                                                                setIsMenuOpen(false)
                                                                router.push(resolveInternalHref(child.href))
                                                            }}
                                                            className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 text-left hover:text-black transition-colors"
                                                        >
                                                            {child.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div 
                            className="p-8 border-t bg-zinc-50 mt-auto flex-shrink-0"
                            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-center">Powered by StudioVault</p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        <AuthModal 
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
            studioSlug={slug}
            studioName={studioName}
            logoUrl={activeLogoUrl}
            tagline={config.footer?.tagline}
        />
    </>
)
}

export default memo(StorefrontHeader)
