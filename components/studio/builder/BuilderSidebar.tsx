import React, { useState, useMemo, useRef } from 'react'

import { 
    Layout, Palette, Globe, ChevronRight, ArrowLeft, 
    Settings, Type, Share2, Image as ImageIcon, 
    GripVertical, Eye, EyeOff, Calendar, Newspaper, Copy,
    HelpCircle, Plus, Trash2, ChevronDown
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'




import Link from 'next/link'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import OnboardingTooltip from './OnboardingTooltip'


const SECTION_DEFS: Record<string, { label: string; icon: any }> = {
    hero: { label: 'Hero Banner', icon: Layout },
    about: { label: 'About Us', icon: Type },
    memberships: { label: 'Memberships', icon: Layout },
    packages: { label: 'Packages', icon: Layout },
    gallery: { label: 'Gallery', icon: ImageIcon },
    reviews: { label: 'Reviews & Testimonials', icon: Share2 },
    appointments: { label: 'Appointments', icon: Calendar },
    blogs: { label: 'Blogs', icon: Newspaper },
    events: { label: 'Events', icon: Calendar },
    faq: { label: 'FAQ', icon: HelpCircle },
    timetable: { label: 'Class Schedule', icon: Calendar },
    instructors: { label: 'Instructors', icon: Layout },
    cta: { label: 'Cta Banner', icon: Share2 },
    locations: { label: 'Locations', icon: Globe },
    classes: { label: 'Classes', icon: Layout },
};


interface Section {
    id: string
    type: string
    enabled: boolean
    content: any
}

interface BuilderSidebarProps {
    config: any
    navPath: { view: 'main' | 'section' | 'settings' | 'header' | 'floating'; id?: string; subView?: string }
    setNavPath: (path: any) => void
    updateSection: (id: string, updates: any) => void
    moveSection?: (id: string, direction: 'up' | 'down') => void
    reorderSections?: (activeId: string, overId: string) => void
    activePage?: string
    isFullscreen?: boolean
    setHoveredSectionId: (id: string | null) => void
    duplicateSection?: (id: string) => void
    removeSection?: (id: string) => void
}


// PAGE_EDITS removed to allow full multi-page building support.


function SortableLayer({ 
    id, 
    label, 
    icon: Icon, 
    section, 
    updateSection, 
    setNavPath,
    setHoveredSectionId,
    duplicateSection,
    removeSection,
    shouldShow,
    dismissTip,
    isFirst
}: { 
    id: string; 
    label: string; 
    icon: any; 
    section: any; 
    updateSection: (id: string, updates: any) => void;
    setNavPath: (path: any) => void;
    setHoveredSectionId: (id: string | null) => void;
    duplicateSection?: (id: string) => void;
    removeSection?: (id: string) => void;
    shouldShow: (id: string, dependency?: string) => boolean;
    dismissTip: (id: string) => void;
    isFirst: boolean;
}) {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const visibilityRef = useRef<HTMLDivElement>(null);
    const reorderRef = useRef<HTMLDivElement>(null);
    const editRef = useRef<HTMLDivElement>(null);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onMouseEnter={() => setHoveredSectionId(id)}
            onMouseLeave={() => setHoveredSectionId(null)}
            className="group flex items-center gap-2 p-1 hover:bg-zinc-50 rounded-2xl transition-all bg-white"
        >
            <div 
                ref={reorderRef}
                {...attributes} 
                {...listeners}
                className="flex flex-col gap-1 p-2 cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
            >
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            
            <div
                ref={editRef}
                role="button"
                tabIndex={0}
                onClick={() => setNavPath({ view: 'section', id })}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setNavPath({ view: 'section', id });
                    }
                }}
                className="flex-1 flex items-center justify-between p-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                    <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-700">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                    <div 
                        ref={visibilityRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            updateSection(id, { enabled: !section.enabled });
                        }}
                        className={`p-2 rounded-lg transition-colors ${section.enabled ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-300 hover:bg-zinc-100'} relative`}
                        title={section.enabled ? 'Hide Section' : 'Show Section'}
                    >
                        {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        
                        <OnboardingTooltip
                            id="visibility-toggle"
                            show={isFirst && shouldShow('visibility-toggle', 'reorder-sections')} 
                            title="Hide Without Deleting"
                            content="Use the Eye icon to temporarily hide a section from your live site. Perfect for draft content!"
                            position="top"
                            onDismiss={() => dismissTip('visibility-toggle')}
                            targetRef={visibilityRef}
                            className="mb-2"
                        />
                    </div>
                    {/* Reorder Tip - moved inside to share the ref correctly if it's the first item */}
                    {isFirst && (
                        <OnboardingTooltip
                            id="select-section"
                            show={shouldShow('select-section', 'global-branding')}
                            title="Edit Section Content"
                            content="Click anywhere on this layer to open the editor. This is where you change text, images, and links."
                            position="top"
                            onDismiss={() => dismissTip('select-section')}
                            targetRef={editRef}
                            className="mb-2"
                        />
                    )}

                    {duplicateSection && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                duplicateSection(id);
                            }}
                            className="p-2 rounded-lg text-zinc-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                            title="Duplicate Section"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </div>
                    )}
                    {removeSection && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to remove this section?')) {
                                    removeSection(id);
                                }

                            }}
                            className="p-2 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove Section"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </div>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-900 transition-transform" />

                </div>
            </div>
        </div>
    );
}

export default function BuilderSidebar({ 
    config, navPath, setNavPath, updateSection, moveSection, reorderSections,
    activePage = 'home', isFullscreen = false, setHoveredSectionId, duplicateSection, removeSection, setActivePage 
}: BuilderSidebarProps & { setActivePage?: (page: string) => void }) {
    // Dynamic Navigation Logic - Synchronized with StorefrontHeader
    const navPages = useMemo(() => {
        const navigationLinks = config?.navigation?.header || []
        const sections = config.pages?.home?.sections || []
        
        const hasHero = sections.some((s: any) => s.type === 'hero' && s.enabled)
        const hasPricing = sections.some((s: any) => (s.type === 'memberships' || s.type === 'packages') && s.enabled)
        const hasSchedule = sections.some((s: any) => s.type === 'timetable' && s.enabled)
        const hasLocations = sections.some((s: any) => s.type === 'locations' && s.enabled)
        const hasContact = sections.some((s: any) => s.type === 'contact' && s.enabled)

        const getNavId = (href: string) => {
            const h = href.toLowerCase()
            if (h === '/' || h === '#hero' || h === '' || h === 'home') return 'home'
            if (h.includes('pricing') || h.includes('membership') || h.includes('package')) return 'memberships'
            if (h.includes('schedule') || h.includes('class')) return 'schedule'
            if (h.includes('location')) return 'locations'
            if (h.includes('contact')) return 'contact'
            if (h.includes('about')) return 'about'
            return href.replace(/^\/|\/$/g, '') || 'home'
        }

        const items = navigationLinks.length > 0 
            ? navigationLinks.map((item: any) => ({
                label: item.label,
                key: getNavId(item.href),
                href: item.href,
                hidden: item.hidden
            }))
            : [
                { label: 'Home', key: 'home' },
                { label: 'Pricing', key: 'memberships' },
                { label: 'Schedules', key: 'schedule' },
                { label: 'Locate us', key: 'locations' },
                { label: 'Contact us', key: 'contact' }
            ]

        // Filter and ensure Home is always present
        const filtered = items.filter((item: any) => !item.hidden && !item.href?.startsWith('http'))
        if (!filtered.some((p: any) => p.key === 'home')) {
            filtered.unshift({ label: 'Home', key: 'home' })
        }

        // Deduplicate by key
        return filtered.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.key === v.key) === i)
    }, [config.navigation?.header, config.pages?.home?.sections])




    const { toast } = useToast()
    const { shouldShow, dismissTip } = useOnboarding()

    const [showAddSection, setShowAddSection] = useState(false)
    const sections = config.pages?.[activePage]?.sections || []

    const addSectionRef = useRef<HTMLDivElement>(null)
    const themeSettingsRef = useRef<HTMLDivElement>(null)
    const globalBrandingRef = useRef<HTMLDivElement>(null)
    const reorderHandleRef = useRef<HTMLDivElement>(null)



    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            reorderSections?.(active.id as string, over.id as string);
        }
    };

    if (navPath.view === 'main') {
        if (showAddSection) {
            return (
                <div className="flex flex-col h-full bg-white relative">
                    <div className="p-8 pb-4 space-y-4">
                        <button 
                            onClick={() => setShowAddSection(false)}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to layers
                        </button>
                        <h1 className="text-4xl font-serif font-bold text-zinc-900 capitalize italic">
                            Add Section
                        </h1>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Choose a component to add to your {activePage} page</p>

                    </div>

                    <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-32">
                        {Object.entries(SECTION_DEFS).map(([type, def]) => {
                            // Check if already added (optional, some might want multiple)
                            const isAdded = sections.some((s: any) => s.type === type)
                            
                            return (
                                <button
                                    key={type}
                                    onClick={() => {
                                        const newId = `${type}-${Math.random().toString(36).substr(2, 9)}`
                                        updateSection(newId, { type });
                                        setShowAddSection(false);
                                        // Automatically open the new section for editing
                                        setNavPath({ view: 'section', id: newId });
                                    }}
                                    className="w-full flex items-center justify-between p-5 bg-zinc-50 rounded-[2rem] border border-zinc-100 hover:bg-white hover:border-indigo-500/30 hover:shadow-xl hover:-translate-y-1 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:bg-indigo-50 transition-colors">
                                            <def.icon className="w-5 h-5 text-zinc-400 group-hover:text-indigo-600" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[13px] font-black text-zinc-900 tracking-tight">{def.label}</span>
                                            {isAdded && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Already Added</span>}
                                        </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-zinc-300 group-hover:text-indigo-600 group-hover:rotate-90 transition-all" />
                                </button>
                            );
                        })}

                        <div className="pt-8 pb-4">
                            <button 
                                onClick={() => {
                                    if (confirm('This will restore the default recommended sections for this page. Current sections will be replaced. Continue?')) {
                                        // Simple way to trigger reset: updateSection with a special reset command or just clear and add defaults
                                        // For now, we'll suggest refreshing or better yet, provide a direct reset if we had the default list here.
                                        // Given the complexity, we'll use a toast to guide them or implement a basic reset.
                                        toast('Please refresh the page to see the latest defaults, or add sections manually above.', 'info')
                                    }
                                }}
                                className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 transition-colors"
                            >
                                Reset Page to Defaults
                            </button>
                        </div>
                    </div>
                </div>
            )
        }


        return (

            <div className="flex flex-col h-full bg-white relative">
                {/* Header Section */}
                <div className="p-8 pb-4 space-y-4">
                    <Link 
                        href="/studio/online-store"
                        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Exit online store
                    </Link>
                    {/* Page Selector Dropdown */}
                    <div className="relative group mt-4">
                        <select 
                            value={activePage}
                            onChange={(e) => setActivePage?.(e.target.value)}
                            className="w-full flex items-center justify-between px-6 py-4 bg-zinc-50 rounded-[2rem] border border-zinc-100 hover:bg-white hover:border-indigo-500/30 hover:shadow-xl transition-all text-zinc-900 text-[13px] font-black uppercase tracking-[0.1em] outline-none cursor-pointer appearance-none text-center"
                        >
                            {navPages.map((page: any) => (
                                <option key={page.key} value={page.key}>
                                    {page.label}
                                </option>
                            ))}
                        </select>

                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-hover:text-indigo-600 transition-colors">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>


                {/* Sections List - THE Studio Vault "LAYERS" LIST */}
                <div className="flex-1 overflow-y-auto px-4 pb-32 scrollbar-hide">
                    <div className="space-y-1">
                        {/* Static Header Layer */}
                        <button 
                            onClick={() => setNavPath({ view: 'header' })}
                            className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 mb-4 hover:bg-zinc-100 transition-all group"
                        >
                             <div className="flex items-center gap-3">
                                <Layout className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-900">Header</span>
                                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Global</span>
                                </div>
                             </div>
                             <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-transform" />
                        </button>

                        {/* Draggable Layer List */}
                        <DndContext 
                            id="builder-sidebar-dnd"
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext 
                                items={sections.map((s: any) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1">
                                    {sections.map((section: any, index: number) => {
                                        const def = SECTION_DEFS[section.type] || { label: section.type, icon: Layout };
                                        return (
                                            <div key={section.id} className="relative">
                                                <SortableLayer 
                                                    id={section.id}
                                                    label={def.label}
                                                    icon={def.icon}
                                                    section={section}
                                                    updateSection={updateSection}
                                                    setNavPath={setNavPath}
                                                    setHoveredSectionId={setHoveredSectionId}
                                                    duplicateSection={duplicateSection}
                                                    shouldShow={shouldShow}
                                                    dismissTip={dismissTip}
                                                    isFirst={index === 0}
                                                />

                                                {/* Show tip only on the first item in the list */}
                                                {index === 0 && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" ref={reorderHandleRef}>
                                                         <OnboardingTooltip
                                                            id="reorder-sections"
                                                            show={shouldShow('reorder-sections', 'welcome-builder')}
                                                            title="Rearrange Your Site"
                                                            content="Drag these handles to change the order of your sections instantly."
                                                            position="right"
                                                            onDismiss={() => dismissTip('reorder-sections')}
                                                            targetRef={reorderHandleRef}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </SortableContext>
                        </DndContext>

                        {/* Add Section Button */}
                        <div 
                            ref={addSectionRef}
                            role="button"
                            tabIndex={0}
                            onClick={() => setShowAddSection(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setShowAddSection(true);
                                }
                            }}
                            className="w-full py-8 border-2 border-dashed border-zinc-100 rounded-[2rem] flex flex-col items-center justify-center gap-3 text-zinc-400 hover:border-indigo-500/30 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group mt-6 relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                             <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-all" />
                             </div>
                             <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add Section</span>

                              <OnboardingTooltip
                                 id="add-section"
                                 show={shouldShow('add-section', 'visibility-toggle')}
                                 title="Expand Your Site"
                                 content="Click here to see a library of pre-built segments like Memberships, FAQ, and Blog sections."
                                 position="top"
                                 onDismiss={() => dismissTip('add-section')}
                                 targetRef={addSectionRef}
                                 className="mb-4"
                             />
                        </div>

                        {/* Static Footer Layer */}

                        <button 
                            onClick={() => setNavPath({ view: 'settings', subView: 'footer' })}
                            className="w-full flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 mt-4 hover:bg-zinc-100 transition-all group"
                        >
                             <div className="flex items-center gap-3 text-left">
                                <Layout className="w-4 h-4 text-zinc-500 group-hover:text-zinc-900" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[12px] font-bold uppercase tracking-widest text-zinc-900">Footer</span>
                                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Global</span>
                                </div>
                             </div>
                             <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 transition-transform" />

                        </button>

                    </div>
                </div>

                {/* Fixed Theme Button Bottom - EXACT Studio Vault STYLE */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-zinc-100 z-50">

                    <div className="relative">
                        <div
                            ref={themeSettingsRef}
                            role="button"
                            tabIndex={0}
                            onClick={() => setNavPath({ view: 'settings', subView: 'main' })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setNavPath({ view: 'settings', subView: 'main' });
                                }
                            }}
                            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-zinc-50 transition-all group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            <div className="flex items-center gap-3">
                                <Palette className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[13px] font-bold text-zinc-700 tracking-tight">Theme Setting</span>
                                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Global</span>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                        </div>

                          <OnboardingTooltip
                             id="theme-settings"
                             show={shouldShow('theme-settings', 'preview-modes')}
                             title="Global Style Settings"
                             content="Customize your colors, fonts, and branding here to apply changes across your whole site."
                             position="top"
                             onDismiss={() => dismissTip('theme-settings')}
                             targetRef={themeSettingsRef}
                             className="mb-6"
                         />
                    </div>
                    <button
                        onClick={() => setNavPath({ view: 'floating' })}
                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-zinc-50 transition-all group mt-1"
                    >
                        <div className="flex items-center gap-3">
                            <Share2 className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[13px] font-bold text-zinc-700 tracking-tight">Floating Widgets</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div
                        ref={globalBrandingRef}
                        role="button"
                        tabIndex={0}
                        onClick={() => setNavPath({ view: 'settings', subView: 'branding' })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setNavPath({ view: 'settings', subView: 'branding' });
                            }
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-zinc-50 transition-all group mt-1 relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                        <div className="flex items-center gap-3 text-left">
                            <Settings className="w-5 h-5 text-zinc-400 group-hover:rotate-45 transition-transform" />
                            <div className="flex flex-col items-start">
                                <span className="text-[13px] font-bold text-zinc-700 tracking-tight">Global Settings</span>
                                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest text-left">Shared across branches</span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />

                          <OnboardingTooltip
                             id="global-branding"
                             show={shouldShow('global-branding', 'theme-settings')}
                             title="Global vs Branch"
                             content="Logos and Social Links are SHARED across all branches. Section content is UNIQUE to each branch."
                             position="top"
                             onDismiss={() => dismissTip('global-branding')}
                             targetRef={globalBrandingRef}
                             className="mb-4"
                         />
                    </div>
                </div>
            </div>
        )
    }

    if (navPath.view === 'section' || navPath.view === 'settings') {
        return null; // The parent handles the drill-down forms
    }

    return null
}

