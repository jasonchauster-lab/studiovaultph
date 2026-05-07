'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { updateStudioWebsite } from '@/app/(dashboard)/studio/studio-actions'
import { 
    Save, Globe, Palette, Layout, Check, AlertCircle, 
    Loader2, ExternalLink, ArrowLeft, Laptop, Smartphone,
    HelpCircle, RefreshCw, Menu, MapPin
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'
import clsx from 'clsx'
import BuilderSidebar from './builder/BuilderSidebar'
import BuilderSectionForm from './builder/BuilderSectionForm'
import BuilderThemeSettings from './builder/BuilderThemeSettings'
import BuilderPreview from './builder/BuilderPreview'
import BuilderHeaderForm from './builder/BuilderHeaderForm'
import BuilderFloatingWidgetsForm from './builder/BuilderFloatingWidgetsForm'
import { arrayMove } from '@dnd-kit/sortable'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import OnboardingTooltip from './builder/OnboardingTooltip'
import TipGuideModal from './builder/TipGuideModal'
import { buildDefaultWebsiteConfig } from '@/lib/studio/default-website-config'

interface Section {
    id: string
    type: string
    enabled: boolean
    content: any
}

interface PageConfig {
    sections: Section[]
}

interface WebsiteConfig {
    theme: {
        themeId?: string
        primaryColor: string
        secondaryColor?: string
        accentColor?: string
        fontFamily?: string
        headingFont?: string
        bodyFont?: string
        buttonStyle?: 'rounded' | 'square' | 'pill'
        buttonRadius?: string
        backgroundColor?: string
        textColor?: string
        buttonColor?: string
    }
    pages: {
        [key: string]: PageConfig
    }
    header: {
        logoPosition: 'left' | 'center'
        sticky: boolean
        logoUrl?: string
        backgroundColor?: string
        textColor?: string
        useStoreNav?: boolean
    }
    footer: {
        socialLinks: { platform: string; url: string }[]
        copyrightText?: string
        tagline?: string
    }
    navigation?: {
        header?: any[]
        footer?: any[]
    }
    floatingWidgets: any
    is_published?: boolean
}

/**
 * Migration Utility: Converts old flat config to new Multi-page config
 */
/**
 * Migration Utility: Converts old flat config to new Multi-page config
 * Also ensures ALL required sub-pages exist.
 */
function migrateConfig(config: any, studio?: any): WebsiteConfig {
    const defaultConfig = buildDefaultWebsiteConfig({
        name: studio?.name,
        bio: studio?.bio,
        address: studio?.address
    }) as WebsiteConfig

    // 1. Initial Migration (Flat to Multi-page)
    let migrated: WebsiteConfig;
    
    // Safety: If pages exists but is an array (legacy), reset it to an object
    const rawPages = config.pages;
    const isLegacyPages = Array.isArray(rawPages);

    if (rawPages && !isLegacyPages) {
        migrated = JSON.parse(JSON.stringify(config)) as WebsiteConfig; // Deep clone to avoid mutations
    } else {
        migrated = {
            theme: config.theme || defaultConfig.theme,
            pages: {
                'home': {
                    sections: config.sections || []
                }
            },
            header: config.header || defaultConfig.header,
            footer: config.footer || defaultConfig.footer,
            navigation: config.navigation || defaultConfig.navigation,
            floatingWidgets: config.floatingWidgets || defaultConfig.floatingWidgets
        };
    }

    // 2. Ensure ALL Required Pages exist (Home, Memberships, Schedule, Locations)
    if (!migrated.pages.home || !migrated.pages.home.sections || migrated.pages.home.sections.length === 0) {
        migrated.pages.home = defaultConfig.pages.home;
    }

    if (!migrated.pages.memberships) {
        migrated.pages.memberships = defaultConfig.pages.memberships;
    }

    if (!migrated.pages.schedule) {
        migrated.pages.schedule = defaultConfig.pages.schedule;
    }

    if (!migrated.pages.locations) {
        migrated.pages.locations = defaultConfig.pages.locations;
    }

    if (!migrated.navigation) {
        migrated.navigation = defaultConfig.navigation
    }

    return migrated;
}


type NavigationPath = {
    view: 'main' | 'section' | 'settings' | 'header' | 'floating'
    id?: string // for section id
    subView?: string // for settings sub-pages
}
export default function StudioWebsiteBuilder({
    studio,
    origin,
    isFullscreen = false,
    memberships = [],
    packages = [],
    outlets = [],
    outletId
}: { 
    studio: any, 
    origin: string, 
    isFullscreen?: boolean,
    memberships?: any[],
    packages?: any[],
    outlets?: any[],
    outletId?: string
}) {
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const [slug, setSlug] = useState(studio.slug || '')
    const [customDomain, setCustomDomain] = useState(studio.custom_domain || '')
    
    // Determine the current outlet based on outletId
    const currentOutlet = useMemo(() => {
        return outlets.find(o => o.id === outletId)
    }, [outlets, outletId])
    const selectedOutletId = outletId || currentOutlet?.id || outlets[0]?.id || ''
    const selectedOutletDescription = currentOutlet
        ? `Editing ${currentOutlet.name} content and local overrides`
        : 'Choose a branch to edit branch-specific content'

    // Initialize config by merging Studio Branding (Shared) with Outlet Content (Branch Specific)
    const [config, setConfig] = useState<WebsiteConfig>(() => {
        const studioConfig = studio.website_config || {}
        const outletConfig = currentOutlet?.website_config || {}
        
        const rawConfig = {
            ...studioConfig,
            ...outletConfig
        }

        return migrateConfig(rawConfig, studio)
    })

    
    const [navPath, setNavPath] = useState<NavigationPath>({ view: 'main' })
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile')
    const [activePage, setActivePage] = useState<string>('home')
    
    const handlePageChange = (newPage: string) => {
        setActivePage(newPage)
        setNavPath({ view: 'main' }) // Clear section editing when switching pages

        // Copy implementation: If the new page has no sections, copy from 'home'
        setConfig(prev => {
            if (!prev.pages[newPage] || prev.pages[newPage].sections.length === 0) {
                return {
                    ...prev,
                    pages: {
                        ...prev.pages,
                        [newPage]: { 
                            sections: JSON.parse(JSON.stringify(prev.pages.home?.sections || []))
                        }
                    }
                }
            }
            return prev
        })
    }
    
    const [isSaving, setIsSaving] = useState(false)
    const [helpMenuOpen, setHelpMenuOpen] = useState(false)
    const [tipGuideOpen, setTipGuideOpen] = useState(false)
    const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null)
    

    // History Management
    const [history, setHistory] = useState<WebsiteConfig[]>([])
    const [future, setFuture] = useState<WebsiteConfig[]>([])
    const isInternallyUpdating = useRef(false)
    const lastPushedConfig = useRef<string>(JSON.stringify(studio.website_config || {}))

    const { shouldShow, dismissTip, tipsEnabled, toggleTips, resetOnboarding } = useOnboarding()

    const welcomeRef = useRef<HTMLAnchorElement>(null)
    const historyRef = useRef<HTMLDivElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const saveRef = useRef<HTMLButtonElement>(null)

    // Undo/Redo Functions
    const undo = () => {
        if (history.length === 0) return
        const previous = history[history.length - 1]
        const newHistory = history.slice(0, history.length - 1)
        
        isInternallyUpdating.current = true
        setFuture([config, ...future])
        setHistory(newHistory)
        setConfig(previous)
        lastPushedConfig.current = JSON.stringify(previous)
        
        setTimeout(() => { isInternallyUpdating.current = false }, 100)
        toast('Undo successful', 'success')
    }

    const redo = () => {
        if (future.length === 0) return
        const next = future[0]
        const newFuture = future.slice(1)

        isInternallyUpdating.current = true
        setHistory([...history, config])
        setFuture(newFuture)
        setConfig(next)
        lastPushedConfig.current = JSON.stringify(next)

        setTimeout(() => { isInternallyUpdating.current = false }, 100)
        toast('Redo successful', 'success')
    }

    const goBack = () => setNavPath({ view: 'main' })

    const initialData = useRef({
        slug: studio.slug || '',
        customDomain: studio.custom_domain || '',
        config: JSON.stringify(studio.website_config || buildDefaultWebsiteConfig({
            name: studio.name,
            bio: studio.bio,
            address: studio.address
        })),
        isPublished: (studio.website_config as any)?.is_published || false
    })

    const hasChanges = useMemo(() => {
        return (
            slug !== initialData.current.slug ||
            customDomain !== initialData.current.customDomain ||
            JSON.stringify(config) !== initialData.current.config ||
            (config as any).is_published !== initialData.current.isPublished
        )
    }, [slug, customDomain, config])

    const handleSave = async () => {
        setIsSaving(true)
        const formData = new FormData()
        formData.append('studioId', studio.id)
        if (outletId) formData.append('outletId', outletId)
        formData.append('slug', slug)
        formData.append('customDomain', customDomain)
        formData.append('websiteConfig', JSON.stringify(config))

        const result = await updateStudioWebsite(formData)
        if (result.success) {
            toast('Website updated successfully!', 'success')
            // Reset "dirty" state
            initialData.current = {
                slug,
                customDomain,
                config: JSON.stringify(config)
            }
        } else {
            toast(result.error || 'Failed to update website', 'error')
        }
        setIsSaving(false)
    }


    // Debounced History Tracking
    useEffect(() => {
        if (isInternallyUpdating.current) return
        
        const timer = setTimeout(() => {
            const currentConfigStr = JSON.stringify(config)
            if (currentConfigStr !== lastPushedConfig.current) {
                setHistory(prev => [...prev.slice(-49), JSON.parse(lastPushedConfig.current)]) // Cap at 50
                setFuture([])
                lastPushedConfig.current = currentConfigStr
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [config])

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+Z or Ctrl+Z for Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
            }

            // Cmd+Y or Ctrl+Y for Redo
            if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                redo();
                return;
            }

            // Cmd+S or Ctrl+S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (hasChanges && !isSaving) {
                    handleSave();
                }
                return;
            }

            // Esc to go back (if not typing in an input)
            if (e.key === 'Escape') {
                const target = e.target as HTMLElement;
                const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                if (!isTyping && navPath.view !== 'main') {
                    goBack();
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasChanges, isSaving, navPath.view]);

    // Handle deep linking from query params
    useEffect(() => {
        const view = searchParams.get('view') as any
        const subView = searchParams.get('subView')
        const id = searchParams.get('id')

        if (view) {
            setNavPath({
                view,
                subView: subView || undefined,
                id: id || undefined
            })
        }
    }, [searchParams])


    const moveSection = (id: string, direction: 'up' | 'down') => {
        setConfig(prev => {
            const sections = prev.pages[activePage]?.sections || []
            const index = sections.findIndex(s => s.id === id)
            if (index < 0) return prev
            
            const newSections = [...sections]
            const targetIndex = direction === 'up' ? index - 1 : index + 1
            
            if (targetIndex >= 0 && targetIndex < newSections.length) {
                [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
                return {
                    ...prev,
                    pages: {
                        ...prev.pages,
                        [activePage]: { ...prev.pages[activePage], sections: newSections }
                    }
                }
            }
            return prev
        })
    }

    const duplicateSection = (id: string) => {
        setConfig(prev => {
            const sections = prev.pages[activePage]?.sections || []
            const section = sections.find(s => s.id === id)
            if (!section) return prev

            const newId = `${section.type}-${Math.random().toString(36).substr(2, 9)}`
            const newSection = { ...JSON.parse(JSON.stringify(section)), id: newId, enabled: true }
            
            const index = sections.findIndex(s => s.id === id)
            const newSections = [...sections]
            newSections.splice(index + 1, 0, newSection)

            // Focus the new section after a tiny delay
            setTimeout(() => {
                setNavPath({ view: 'section', id: newId })
            }, 100)

            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [activePage]: { ...prev.pages[activePage], sections: newSections }
                }
            }
        })
        toast('Section duplicated', 'success')
    }

    const removeSection = (id: string) => {
        setConfig(prev => {
            const sections = prev.pages[activePage]?.sections || []
            const newSections = sections.filter(s => s.id !== id)
            
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [activePage]: { ...prev.pages[activePage], sections: newSections }
                }
            }
        })
        toast('Segment removed', 'success')
    }

    const reorderSections = (activeId: string, overId: string) => {

        if (activeId === overId) return

        setConfig(prev => {
            const sections = prev.pages[activePage]?.sections || []
            const oldIndex = sections.findIndex(s => s.id === activeId)
            const newIndex = sections.findIndex(s => s.id === overId)
            
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [activePage]: { 
                        ...prev.pages[activePage], 
                        sections: arrayMove(sections, oldIndex, newIndex) 
                    }
                }
            }
        })
    }


    const updateSection = (id: string, updates: Partial<Section>) => {
        setConfig(prev => {
            const currentPage = prev.pages[activePage] || { sections: [] }
            const exists = currentPage.sections.some(s => s.id === id)
            
            let newSections = []
            if (exists) {
                newSections = currentPage.sections.map(s => s.id === id ? { ...s, ...updates } : s)
            } else {
                newSections = [...currentPage.sections, { id, type: id, enabled: true, content: {}, ...updates }]
            }

            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [activePage]: { ...currentPage, sections: newSections }
                }
            }
        })
    }

    const updateSectionContent = (id: string, contentUpdates: any) => {
        setConfig(prev => ({
            ...prev,
            pages: {
                ...prev.pages,
                [activePage]: {
                    ...prev.pages[activePage],
                    sections: prev.pages[activePage].sections.map(s => s.id === id ? { ...s, content: { ...s.content, ...contentUpdates } } : s)
                }
            }
        }))
    }


    const savedStudioSlug = studio.slug || slug
    const internalBranchLivePath = currentOutlet?.slug
        ? `/s/${savedStudioSlug}/${currentOutlet.slug}`
        : `/s/${savedStudioSlug}`
    const publicBranchPath = currentOutlet?.slug
        ? `/${savedStudioSlug}/${currentOutlet.slug}`
        : `/${savedStudioSlug}`

    let publicUrl = internalBranchLivePath
    try {
        const currentHost = new URL(origin).host
        const isStudioDomainHost = currentHost.includes('studiovault.local') || currentHost.includes('studiovault.co')
        publicUrl = customDomain
            ? `https://${customDomain}`
            : isStudioDomainHost
                ? publicBranchPath
                : internalBranchLivePath
    } catch {
        publicUrl = customDomain ? `https://${customDomain}` : internalBranchLivePath
    }


    const handleResetTips = () => {
        resetOnboarding();
        setNavPath({ view: 'main' });
        setHelpMenuOpen(false);
        toast('Tutorials have been reset!', 'success');
    }

    const handleOutletSwitch = (nextOutletId: string) => {
        if (!nextOutletId) return

        if (hasChanges) {
            if (confirm('You have unsaved changes. Switch branch and lose changes?')) {
                window.location.href = `/studio/website?outletId=${nextOutletId}`
            }
            return
        }

        window.location.href = `/studio/website?outletId=${nextOutletId}`
    }

    const toggleDashboardSidebar = () => {
        window.dispatchEvent(new CustomEvent('side-vault-toggle-sidebar'));
    }

    return (
        <div className="fixed top-0 bottom-0 left-0 lg:left-[72px] right-0 bg-[#FAFAFA] z-[40] flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Immersive HUD Header */}
            <header className="h-[72px] px-8 bg-white/80 backdrop-blur-md border-b border-zinc-100 flex items-center justify-between z-[150] shrink-0">
                <div className="flex items-center gap-6">
                    {/* Dashboard Mobile Toggle */}
                    <button 
                        onClick={toggleDashboardSidebar}
                        className="lg:hidden p-2 -ml-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all border border-transparent hover:border-zinc-200 shadow-sm hover:shadow-md"
                        title="Open Dashboard Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
                    </div>
                    <div className="h-6 w-px bg-zinc-100 hidden lg:block" />
                    
                    {outlets.length > 0 && (
                        <div className="hidden md:flex items-center gap-3 rounded-2xl border border-[#2D3282]/10 bg-[#2D3282]/[0.04] px-3 py-2 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2D3282] shadow-sm">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div className="relative min-w-[220px]">
                                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#2D3282]/60">Editing Branch</p>
                                <select 
                                    value={selectedOutletId}
                                    onChange={(e) => handleOutletSwitch(e.target.value)}
                                    className="w-full bg-transparent pr-6 text-[12px] font-black text-[#2D3282] outline-none cursor-pointer appearance-none"
                                >
                                    {outlets.map(o => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-zinc-500">{selectedOutletDescription}</p>
                                <ArrowLeft className="w-2.5 h-2.5 absolute right-0 top-[18px] -rotate-90 pointer-events-none text-[#2D3282]/70" />
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Link 
                            ref={welcomeRef}
                            href={publicUrl} 
                            target="_blank"
                            className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2 hidden lg:flex"
                        >
                            View live site <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <OnboardingTooltip
                            id="welcome-builder"
                            show={shouldShow('welcome-builder')}
                            title="Welcome to the Builder!"
                            content="This is where you shape your online storefront. Use the sidebar to add sections and the top bar to save your changes."
                            position="bottom"
                            onDismiss={() => dismissTip('welcome-builder')}
                            targetRef={welcomeRef}
                            className="mt-4"
                        />
                    </div>

                    <div className="h-6 w-px bg-zinc-100 hidden lg:block" />

                    {/* History HUD */}
                    <div 
                        ref={historyRef}
                        className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl border border-zinc-200 shadow-sm relative group/tools"
                    >
                         <button 
                            onClick={undo}
                            disabled={history.length === 0}
                            className={`p-2 rounded-lg transition-all ${history.length > 0 ? 'text-zinc-700 hover:bg-white hover:shadow-sm active:scale-90' : 'text-zinc-300'}`}
                            title="Undo (Ctrl+Z)"
                         >
                            <RefreshCw className="w-4 h-4 -rotate-90" />
                         </button>
                         <button 
                            onClick={redo}
                            disabled={future.length === 0}
                            className={`p-2 rounded-lg transition-all ${future.length > 0 ? 'text-zinc-700 hover:bg-white hover:shadow-sm active:scale-90' : 'text-zinc-300'}`}
                            title="Redo (Ctrl+Y)"
                         >
                            <RefreshCw className="w-4 h-4 rotate-90 scale-x-[-1]" />
                         </button>
                         
                         {/* History Tips */}
                         {shouldShow('history-tools', 'save-changes') && (
                            <OnboardingTooltip
                                id="history-tools"
                                show={true}
                                title="Safety First!"
                                content="Made a mistake? You can undo or redo any change you make here. Experiment freely!"
                                position="bottom"
                                onDismiss={() => dismissTip('history-tools')}
                                targetRef={historyRef}
                                className="mt-2"
                            />
                         )}
                    </div>
                </div>


                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div 
                            ref={previewRef}
                            className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-full border border-zinc-100 relative"
                        >
                             <button 
                                onClick={() => setPreviewMode('desktop')}
                                className={`p-2 rounded-lg transition-all ${previewMode === 'desktop' ? 'bg-white shadow-sm text-zinc-950' : 'text-zinc-500 hover:text-zinc-900'}`}
                             >
                                <Laptop className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => setPreviewMode('mobile')}
                                className={`p-2 rounded-lg transition-all ${previewMode === 'mobile' ? 'bg-white shadow-sm text-zinc-950' : 'text-zinc-500 hover:text-zinc-900'}`}
                             >
                                <Smartphone className="w-4 h-4" />
                             </button>

                             <OnboardingTooltip
                                id="preview-modes"
                                show={shouldShow('preview-modes', 'add-section')}
                                title="Check Your Mobile View"
                                content="Toggle between desktop and mobile to see how your site looks on every screen."
                                position="bottom"
                                onDismiss={() => dismissTip('preview-modes')}
                                targetRef={previewRef}
                                className="mt-4"
                            />
                        </div>

                        {/* Help Menu / Tutorial Controls */}
                        <div className="relative">
                            <button
                                onClick={() => setHelpMenuOpen(!helpMenuOpen)}
                                className={clsx(
                                    "p-3 rounded-full transition-all border",
                                    helpMenuOpen 
                                        ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" 
                                        : "bg-white text-zinc-500 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300"
                                )}
                            >
                                <HelpCircle className="w-5 h-5" />
                            </button>

                            {helpMenuOpen && (
                                <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-[2rem] shadow-2xl border border-zinc-100 p-6 z-[1000] animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <h3 className="text-[13px] font-black text-zinc-900 uppercase tracking-widest">Tutorial Help</h3>
                                            <p className="text-[11px] text-zinc-500 font-medium">Manage how you receive onboarding tips in the builder.</p>
                                        </div>

                                        <div className="h-px bg-zinc-50" />

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-bold text-zinc-700">Show Tips</span>
                                                <button 
                                                    onClick={() => toggleTips(!tipsEnabled)}
                                                    className={clsx(
                                                        "w-10 h-5 rounded-full transition-colors relative",
                                                        tipsEnabled ? "bg-indigo-600" : "bg-zinc-200"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                                                        tipsEnabled && "translate-x-5"
                                                    )} />
                                                </button>
                                            </div>

                                            <button 
                                                onClick={handleResetTips}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-all group"
                                            >
                                                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-900">Reset All Tips</span>
                                                <RefreshCw className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 group-hover:rotate-180 transition-all duration-500" />
                                            </button>

                                            <div className="h-px bg-zinc-50" />

                                            <button 
                                                onClick={() => { setTipGuideOpen(true); setHelpMenuOpen(false); }}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all group shadow-lg shadow-indigo-200"
                                            >
                                                <span className="text-[11px] font-black uppercase tracking-widest text-white">Full Tip Guide</span>
                                                <HelpCircle className="w-4 h-4 text-white/80 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <button 
                            ref={saveRef}
                            onClick={handleSave}
                            disabled={isSaving}
                            className={clsx(
                                "px-10 py-3 rounded-full text-[12px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-2 active:scale-95 disabled:opacity-50 relative",
                                hasChanges 
                                    ? "bg-[#283ba7] text-white shadow-lg shadow-indigo-200/50 scale-[1.05] animate-in zoom-in-95" 
                                    : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"
                            )}
                        >
                            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{hasChanges ? 'Save Changes' : 'Saved'}</span>
                            
                            {/* Status Pulse Indicator */}
                            {hasChanges && !isSaving && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 border-2 border-white rounded-full animate-pulse shadow-sm" />
                            )}
                        </button>

                        <OnboardingTooltip
                            id="save-changes"
                            show={shouldShow('save-changes', ['global-branding', 'editor-links'])}
                            title="Don't Forget to Save"
                            content="Changes are automatically previewed but NOT live until you click Save. Look for the red dot for unsaved edits."
                            position="bottom"
                            onDismiss={() => dismissTip('save-changes')}
                            targetRef={saveRef}
                            className="mt-4 right-0"
                        />
                    </div>
                </div>
            </header>


            <div className="flex-1 flex overflow-hidden">
                {/* 20% Sidebar (HUD) */}
                <div className="w-[340px] border-r border-zinc-100 bg-white flex flex-col shrink-0">
                    <div className="flex-1 overflow-hidden">
                        {navPath.view === 'main' && (
                            <BuilderSidebar 
                                config={config} 
                                navPath={navPath} 
                                setNavPath={setNavPath} 
                                updateSection={updateSection} 
                                moveSection={moveSection}
                                reorderSections={reorderSections}
                                activePage={activePage}
                                setActivePage={handlePageChange}
                                isFullscreen={true}
                                setHoveredSectionId={setHoveredSectionId}
                                duplicateSection={duplicateSection}
                                removeSection={removeSection}
                            />

                        )}
                        {navPath.view === 'floating' && (
                            <BuilderFloatingWidgetsForm 
                                config={config} 
                                setConfig={setConfig} 
                                goBack={goBack} 
                                outletId={outletId}
                            />
                        )}
                        {navPath.view === 'section' && navPath.id && (
                            <BuilderSectionForm 
                                sectionId={navPath.id!} 
                                config={config} 
                                studioId={studio.id}
                                updateSectionContent={updateSectionContent} 
                                goBack={goBack} 
                                memberships={memberships}
                                packages={packages}
                            />
                        )}

                        {navPath.view === 'header' && (
                            <BuilderHeaderForm 
                                config={config} 
                                studioId={studio.id}
                                setConfig={setConfig} 
                                goBack={goBack} 
                            />
                        )}
                        {navPath.view === 'settings' && navPath.subView && (
                            <BuilderThemeSettings 
                                subView={navPath.subView} 
                                config={config} 
                                studioId={studio.id}
                                setConfig={setConfig} 
                                goBack={goBack} 
                                setNavPath={setNavPath}
                            />
                        )}
                    </div>
                </div>

                {/* 80% Canvas (Preview) */}
                <div className="flex-1 relative bg-[#FAFAFA] flex flex-col items-center justify-center p-12 overflow-hidden">
                    <BuilderPreview 
                        config={config} 
                        studio={studio} 
                        previewMode={previewMode} 
                        setPreviewMode={setPreviewMode} 
                        setActivePage={setActivePage}
                        setNavPath={setNavPath}
                        activePage={activePage}
                        publicUrl={publicUrl}
                        memberships={memberships}
                        packages={packages}
                        outlets={outlets}
                        outlet={currentOutlet}
                        hoveredSectionId={hoveredSectionId}
                        navPath={navPath}
                    />
                </div>
            </div>

            {/* Tip Guide Modal */}
            <TipGuideModal 
                isOpen={tipGuideOpen}
                onClose={() => setTipGuideOpen(false)}
            />
        </div>
    )
}

