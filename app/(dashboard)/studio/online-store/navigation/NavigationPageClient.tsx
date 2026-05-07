'use client'

import { useRef, useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Plus, Navigation, Trash2, Loader2, GripVertical, Link2, ChevronRight, Eye, EyeOff, Globe } from 'lucide-react'
import { updateStudioWebsite } from '@/app/(dashboard)/studio/studio-actions'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/shared/Modal'
import { clsx } from 'clsx'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface MenuItem {
    id: string
    label: string
    href: string
    itemType?: 'link' | 'group'
    hidden?: boolean
    children?: MenuItem[]
}

interface WebsiteConfig {
    navigation?: {
        header?: MenuItem[]
        footer?: MenuItem[]
    }
    [key: string]: unknown
}

interface Menu {
    id: 'header' | 'footer'
    name: string
    items: MenuItem[]
}

interface NavigationStudio {
    id: string
    slug: string
    website_config?: WebsiteConfig | null
}

interface NavigationPageClientProps {
    studio: NavigationStudio
}

const DEFAULT_HEADER_ITEMS: MenuItem[] = [
    { id: 'h1', label: 'Home', href: '/', itemType: 'link' },
    {
        id: 'h2',
        label: 'Pricing',
        href: '',
        itemType: 'group',
        children: [
            { id: 'h2-1', label: 'Packages', href: '/packages', itemType: 'link' },
            { id: 'h2-2', label: 'Memberships', href: '/memberships', itemType: 'link' }
        ]
    },
    { id: 'h3', label: 'Schedule', href: '/schedule', itemType: 'link' },
    { id: 'h4', label: 'Locations', href: '#locations', itemType: 'link' }
]

const DEFAULT_FOOTER_ITEMS: MenuItem[] = [
    { id: 'f1', label: 'About Us', href: '#about', itemType: 'link' },
    { id: 'f2', label: 'Pricing', href: '/pricing', itemType: 'link' },
    { id: 'f3', label: 'FAQ', href: '#faq', itemType: 'link' },
    { id: 'f4', label: 'Contact', href: '#contact', itemType: 'link' }
]

const LEGACY_HREF_MAP: Record<string, string> = {
    '/faq': '#faq',
    '/locations': '#locations',
    '/contact-us': '#contact',
    '/terms-of-service': '',
    '/privacy': ''
}

function sanitizeHref(href: string) {
    return LEGACY_HREF_MAP[href] ?? href
}

function normalizeMenuItem(item: MenuItem): MenuItem | null {
    const normalizedChildren = (item.children || [])
        .map((child) => normalizeMenuItem({ ...child, itemType: 'link', children: [] }))
        .filter(Boolean) as MenuItem[]

    const normalizedHref = sanitizeHref(item.href || '')
    const itemType = normalizedChildren.length > 0 || item.itemType === 'group' ? 'group' : 'link'

    if (itemType === 'link' && !normalizedHref) {
        return null
    }

    return {
        ...item,
        href: itemType === 'group' ? '' : normalizedHref,
        itemType,
        children: normalizedChildren.length > 0 ? normalizedChildren : undefined
    }
}

function normalizeMenuItems(items: MenuItem[]) {
    return items
        .map((item) => normalizeMenuItem(item))
        .filter(Boolean) as MenuItem[]
}

function SortableSubItem({ child, parentId, removeItem, editItem, toggleVisibility }: {
    child: MenuItem,
    parentId: string,
    removeItem: (id: string, parentId?: string) => void,
    editItem: (item: MenuItem, parentId?: string) => void,
    toggleVisibility: (id: string, parentId?: string) => void,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: child.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                editItem(child, parentId);
            }}
            className={clsx(
                "group flex items-center justify-between gap-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-100 cursor-pointer transition-all duration-300",
                "hover:bg-white hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5",
                child.hidden && "opacity-60 grayscale-[0.5]",
                isDragging && "shadow-xl opacity-50 border-[#2D3282]"
            )}
        >
            <div className="flex items-center gap-3 flex-1">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-zinc-100 rounded transition-colors" onClick={e => e.stopPropagation()}>
                    <GripVertical className="w-3.5 h-3.5 text-zinc-300" />
                </div>
                <div className="space-y-0.5">
                    <h6 className="text-[12px] font-bold text-zinc-900 tracking-tight">{child.label}</h6>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                        <Link2 className="w-2.5 h-2.5" />
                        {child.href}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleVisibility(child.id, parentId); }}
                    className={clsx(
                        "p-1.5 transition-all rounded-lg",
                        child.hidden ? "text-amber-500 hover:bg-amber-50" : "text-zinc-300 hover:text-zinc-900 hover:bg-white"
                    )}
                >
                    {child.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); removeItem(child.id, parentId); }}
                    className="p-1.5 text-zinc-200 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function NavigationModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    isSublink 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (data: { label: string, href: string, itemType: 'link' | 'group' }) => void,
    initialData?: { label: string, href: string, itemType?: 'link' | 'group' },
    isSublink?: boolean
}) {
    const [label, setLabel] = useState(initialData?.label || '')
    const [href, setHref] = useState(initialData?.href || '')
    const [itemType, setItemType] = useState<'link' | 'group'>(isSublink ? 'link' : (initialData?.itemType || 'link'))
    const destinationOptions = [
        { label: 'Home', href: '/' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Packages', href: '/packages' },
        { label: 'Memberships', href: '/memberships' },
        { label: 'Schedule', href: '/schedule' },
        { label: 'About Section', href: '#about' },
        { label: 'Locations Section', href: '#locations' },
        { label: 'FAQ Section', href: '#faq' },
        { label: 'Contact Section', href: '#contact' },
        { label: 'Custom URL', href: '__custom__' }
    ]

    const matchedDestination = destinationOptions.find((option) => option.href === (initialData?.href || ''))
    const [selectedDestination, setSelectedDestination] = useState(matchedDestination?.href || (initialData?.href ? '__custom__' : '/'))

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const finalHref = itemType === 'group' ? '' : href
        if (label && (itemType === 'group' || finalHref)) onSave({ label, href: finalHref, itemType })
    }

    const handleDestinationChange = (nextHref: string) => {
        setSelectedDestination(nextHref)

        if (nextHref === '__custom__') {
            setHref(initialData?.href && !destinationOptions.some((option) => option.href === initialData.href) ? initialData.href : '')
            return
        }

        const selectedOption = destinationOptions.find((option) => option.href === nextHref)
        setHref(nextHref)

        const currentOption = destinationOptions.find((option) => option.href === href)
        const shouldReplaceLabel =
            !label ||
            label === currentOption?.label ||
            label === initialData?.label

        if (selectedOption && shouldReplaceLabel) {
            setLabel(selectedOption.label)
        }
    }

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? (isSublink ? 'Edit Sub-link' : 'Edit Link') : (isSublink ? 'Add Sub-link' : 'Add New Link')}
            className="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Link Label</label>
                        <input 
                            type="text" 
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder={itemType === 'group' ? 'e.g. Pricing' : 'e.g. Book Now'}
                            className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[14px] font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            autoFocus
                        />
                    </div>
                {!isSublink && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Link Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setItemType('link')}
                                className={clsx(
                                    "rounded-2xl border px-4 py-4 text-left transition-all",
                                    itemType === 'link' ? "border-[#2D3282] bg-indigo-50/60 shadow-sm" : "border-zinc-100 bg-white hover:border-zinc-200"
                                )}
                            >
                                <p className="text-[12px] font-black uppercase tracking-widest text-zinc-900">Single Link</p>
                                <p className="mt-1 text-xs text-zinc-500">Opens a page or section directly.</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setItemType('group')
                                    setHref('')
                                    setSelectedDestination('__custom__')
                                }}
                                className={clsx(
                                    "rounded-2xl border px-4 py-4 text-left transition-all",
                                    itemType === 'group' ? "border-[#2D3282] bg-indigo-50/60 shadow-sm" : "border-zinc-100 bg-white hover:border-zinc-200"
                                )}
                            >
                                <p className="text-[12px] font-black uppercase tracking-widest text-zinc-900">Dropdown Group</p>
                                <p className="mt-1 text-xs text-zinc-500">Parent label only. Customers use the sub-links.</p>
                            </button>
                        </div>
                    </div>
                )}

                {itemType === 'link' ? (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Destination</label>
                        <div className="relative">
                            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <select
                                value={selectedDestination}
                                onChange={e => handleDestinationChange(e.target.value)}
                                className="w-full appearance-none pl-12 pr-10 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[14px] font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            >
                                {destinationOptions.map((option) => (
                                    <option key={option.href} value={option.href}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-zinc-400 pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-zinc-400 px-1">
                            Choose a storefront page or section first. Use custom only for external links or special destinations.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-4 text-sm text-zinc-600">
                        This parent item will only open its dropdown. Add sub-links below it to control where customers go.
                    </div>
                )}

                {itemType === 'link' && selectedDestination === '__custom__' && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Custom URL</label>
                        <input 
                            type="text" 
                            value={href}
                            onChange={e => setHref(e.target.value)}
                            placeholder="https://... or /custom-path"
                            className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[14px] font-mono font-medium text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                )}

                <div className="pt-4 flex gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 bg-zinc-100 rounded-2xl text-[12px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-200 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        disabled={!label || (itemType === 'link' && !href)}
                        className="flex-1 py-4 bg-[#2D3282] rounded-2xl text-[12px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-100"
                    >
                        {initialData ? 'Save Changes' : 'Create Link'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

function SortableItem({ item, removeItem, editItem, toggleVisibility, addSubItem }: { 
    item: MenuItem, 
    removeItem: (id: string, parentId?: string) => void,
    editItem: (item: MenuItem, parentId?: string) => void,
    toggleVisibility: (id: string, parentId?: string) => void,
    addSubItem: (parentId: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: 'relative' as const,
    };

    return (
        <div className="space-y-4">
            <div 
                ref={setNodeRef} 
                style={style}
                onClick={() => editItem(item)}
                className={clsx(
                    "group flex items-center gap-4 bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer",
                    "hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1",
                    isDragging ? "shadow-2xl opacity-50 border-[#2D3282]" : "border-zinc-100 shadow-sm",
                    item.hidden && "opacity-60 grayscale-[0.5]"
                )}
            >
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 hover:bg-zinc-50 rounded-xl transition-colors" 
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="w-5 h-5 text-zinc-200 group-hover:text-amber-500 transition-colors" />
                </div>
                
                <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                             <h6 className="text-[15px] font-black text-zinc-900 tracking-tight">{item.label}</h6>
                             {item.children && item.children.length > 0 && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-[#2D3282] text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                                    {item.children.length} Sub-links
                                </span>
                             )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                            <Link2 className="w-3.5 h-3.5" />
                            {item.itemType === 'group' ? 'Dropdown group' : item.href}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); addSubItem(item.id); }}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#2D3282] hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Sub-link
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id); }}
                            className={clsx(
                                "p-2.5 transition-all rounded-xl border border-transparent",
                                item.hidden 
                                    ? "text-amber-500 bg-amber-50 border-amber-100" 
                                    : "text-zinc-400 hover:text-[#2D3282] hover:bg-indigo-50 hover:border-indigo-100"
                            )}
                            title={item.hidden ? "Show in store" : "Hide in store"}
                        >
                            {item.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                            className="p-2.5 text-zinc-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="p-2.5 text-zinc-300 group-hover:text-indigo-400 transition-colors">
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Render Children with SortableContext */}
            {item.children && item.children.length > 0 && (
                <div className="ml-12 pl-6 border-l-2 border-zinc-100 space-y-3 pt-1 pb-4">
                    <SortableContext 
                        items={item.children.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {item.children.map((child) => (
                             <SortableSubItem 
                                key={child.id}
                                child={child}
                                parentId={item.id}
                                removeItem={removeItem}
                                editItem={editItem}
                                toggleVisibility={toggleVisibility}
                             />
                        ))}
                    </SortableContext>
                    <button 
                        onClick={() => addSubItem(item.id)}
                        className="w-full py-4 border-2 border-dashed border-zinc-100 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:border-indigo-200 hover:text-indigo-600 transition-all bg-zinc-50/30 hover:bg-white group"
                    >
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                         Add Sub-link
                    </button>
                </div>
            )}
        </div>
    );
}

export default function NavigationPageClient({ studio }: NavigationPageClientProps) {
    const { toast } = useToast()
    const [config, setConfig] = useState<WebsiteConfig>(studio.website_config || { navigation: { header: [], footer: [] } })
    const [isSaving, setIsSaving] = useState(false)
    const [activeMenu, setActiveMenu] = useState<'header' | 'footer'>('header')
    const nextMenuItemId = useRef(1000)

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalConfig, setModalConfig] = useState<{
        mode: 'add' | 'edit',
        targetId?: string,
        parentId?: string,
        initialData?: { label: string, href: string, itemType?: 'link' | 'group' }
    }>({ mode: 'add' })

    const menus: Menu[] = [
        { id: 'header', name: 'Main Navigation (Header)', items: normalizeMenuItems(config.navigation?.header || DEFAULT_HEADER_ITEMS)},
        { id: 'footer', name: 'Footer Menu', items: normalizeMenuItems(config.navigation?.footer || DEFAULT_FOOTER_ITEMS)}
    ]

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleSaveNavigation = async (updatedMenus: Menu[]) => {
        setIsSaving(true)
        const newNavigation = {
            header: updatedMenus.find(m => m.id === 'header')?.items || [],
            footer: updatedMenus.find(m => m.id === 'footer')?.items || []
        }
        
        // Robustly merge with current configuration
        const newConfig = { 
            ...(studio.website_config || {}), 
            ...config, 
            navigation: newNavigation 
        }
        
        const formData = new FormData()
        formData.append('studioId', studio.id)
        formData.append('slug', studio.slug)
        formData.append('websiteConfig', JSON.stringify(newConfig))

        const result = await updateStudioWebsite(formData)
        if (result.success) {
            setConfig(newConfig)
            toast('Navigation updated!', 'success')
        } else {
            toast(result.error || 'Failed to update', 'error')
        }
        setIsSaving(false)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const currentMenu = menus.find(m => m.id === activeMenu);
            if (!currentMenu) return;

            const activeMenuItems = [...currentMenu.items];
            
            // Check if we're dragging a top-level item
            const oldIndex = activeMenuItems.findIndex(item => item.id === active.id);
            const newIndex = activeMenuItems.findIndex(item => item.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedItems = arrayMove(activeMenuItems, oldIndex, newIndex);
                const updatedMenus = menus.map(m => 
                    m.id === activeMenu ? { ...m, items: reorderedItems } : m
                );
                handleSaveNavigation(updatedMenus);
            } else {
                // Check if we're dragging a sublink within any parent
                let parentId: string | undefined;
                let sublinkOldIndex = -1;
                let sublinkNewIndex = -1;

                activeMenuItems.forEach(parent => {
                    if (parent.children) {
                        const oIdx = parent.children.findIndex(c => c.id === active.id);
                        const nIdx = parent.children.findIndex(c => c.id === over.id);
                        if (oIdx !== -1 && nIdx !== -1) {
                            parentId = parent.id;
                            sublinkOldIndex = oIdx;
                            sublinkNewIndex = nIdx;
                        }
                    }
                });

                if (parentId !== undefined) {
                    const updatedItems = activeMenuItems.map(parent => {
                        if (parent.id === parentId && parent.children) {
                            return {
                                ...parent,
                                children: arrayMove([...parent.children], sublinkOldIndex, sublinkNewIndex)
                            };
                        }
                        return parent;
                    });

                    const updatedMenus = menus.map(m => 
                        m.id === activeMenu ? { ...m, items: updatedItems } : m
                    );
                    handleSaveNavigation(updatedMenus);
                }
            }
        }
    };

    const handleModalSave = (data: { label: string, href: string, itemType: 'link' | 'group' }) => {
        const { mode, targetId, parentId } = modalConfig
        let updatedMenus: Menu[] = []

        if (mode === 'add') {
            nextMenuItemId.current += 1
            const newItem = { id: `nav-item-${nextMenuItemId.current}`, ...data }
            updatedMenus = menus.map(m => m.id === activeMenu ? {
                ...m, items: parentId 
                    ? m.items.map(p => p.id === parentId ? { ...p, children: [...(p.children || []), newItem] } : p)
                    : [...m.items, newItem]
            } : m)
        } else if (mode === 'edit' && targetId) {
            updatedMenus = menus.map(m => m.id === activeMenu ? {
                ...m, items: parentId
                    ? m.items.map(p => p.id === parentId ? {
                        ...p, children: p.children?.map(c => c.id === targetId ? { ...c, ...data } : c)
                    } : p)
                    : m.items.map(i => i.id === targetId ? { ...i, ...data } : i)
            } : m)
        }

        handleSaveNavigation(updatedMenus)
        setIsModalOpen(false)
    }

    const addItem = () => {
        setModalConfig({ mode: 'add' })
        setIsModalOpen(true)
    }

    const addSubItem = (parentId: string) => {
        setModalConfig({ mode: 'add', parentId })
        setIsModalOpen(true)
    }

    const editItem = (item: MenuItem, parentId?: string) => {
        setModalConfig({ 
            mode: 'edit', 
            targetId: item.id, 
            parentId, 
            initialData: { label: item.label, href: item.href, itemType: item.itemType } 
        })
        setIsModalOpen(true)
    }

    const removeItem = (id: string, parentId?: string) => {
        const updatedMenus = menus.map(m => m.id === activeMenu ? {
            ...m, items: parentId
                ? m.items.map(p => p.id === parentId ? {
                    ...p, children: p.children?.filter(c => c.id !== id)
                } : p)
                : m.items.filter(item => item.id !== id)
        } : m)
        handleSaveNavigation(updatedMenus)
    }

    const toggleVisibility = (id: string, parentId?: string) => {
        const updatedMenus = menus.map(m => m.id === activeMenu ? {
            ...m, items: parentId
                ? m.items.map(p => p.id === parentId ? {
                    ...p, children: p.children?.map(c => c.id === id ? { ...c, hidden: !c.hidden } : c)
                } : p)
                : m.items.map(i => i.id === id ? { ...i, hidden: !i.hidden } : i)
        } : m)
        handleSaveNavigation(updatedMenus)
    }

    const actions = (
        <button 
            onClick={addItem}
            className="flex items-center gap-2 px-6 py-3 bg-[#2D3282] rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all shadow-xl"
        >
            <Plus className="w-4 h-4" />
            Add Menu Item
        </button>
    )

    return (
        <StudioDashboardShell
            title="Navigation"
            description="Control your website's main menu and footer content."
            breadcrumbs={[{ label: 'Online Store', href: '/studio/online-store' }, { label: 'Navigation' }]}
            actions={actions}
        >
            <div className="space-y-8">
                <OnlineStorePageIntro
                    eyebrow="Store Setup"
                    title="Shape how customers move through your storefront."
                    description="Use navigation to define the main journey through your site. Keep the menu focused, hide low-priority links, and use footer space for support and policy destinations."
                    primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    secondaryAction={{ label: 'View Live Site', href: `/s/${studio.slug}` }}
                    metrics={[
                        { label: 'Header Links', value: String(menus.find((menu) => menu.id === 'header')?.items.length || 0) },
                        { label: 'Footer Links', value: String(menus.find((menu) => menu.id === 'footer')?.items.length || 0) },
                    ]}
                    aside={
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                                <Navigation className="h-4 w-4" />
                                Navigation Rules
                            </div>
                            <div className="space-y-4 text-sm leading-relaxed text-zinc-500">
                                <p>Keep the header short and conversion-focused. Put operational or legal links in the footer.</p>
                                <p>Hide links instead of deleting them when you are testing structure changes or seasonal campaigns.</p>
                            </div>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
                {/* Menu Selection (Tabs) */}
                <div className="md:col-span-4 space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Menu Sections</h4>
                    <div className="flex flex-col gap-3">
                        {menus.map((menu) => (
                            <button
                                key={menu.id}
                                onClick={() => setActiveMenu(menu.id)}
                                className={clsx(
                                    "p-6 rounded-[2rem] border-2 transition-all text-left group",
                                    activeMenu === menu.id 
                                        ? "border-[#2D3282] bg-indigo-50/50 shadow-md" 
                                        : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <h5 className={clsx(
                                        "text-[13px] font-black tracking-tight",
                                        activeMenu === menu.id ? "text-zinc-900" : "text-zinc-500"
                                    )}>{menu.name}</h5>
                                    <ChevronRight className={clsx(
                                        "w-4 h-4 transition-transform",
                                        activeMenu === menu.id ? "text-[#2D3282] translate-x-1" : "text-zinc-300"
                                    )} />
                                </div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                    {menu.items.length} links
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Items Editor */}
                <div className="md:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                {activeMenu === 'header' ? 'Header Navigation' : 'Footer Content'}
                            </h4>
                            {isSaving && <Loader2 className="w-3 h-3 animate-spin text-[#2D3282]" />}
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select to Edit • Drag to Reorder</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <>
                            <DndContext 
                                id="navigation-dnd"
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="space-y-4">
                                    <SortableContext 
                                        items={menus.find(m => m.id === activeMenu)?.items.map(i => i.id) || []}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {menus.find(m => m.id === activeMenu)?.items.map((item) => (
                                            <SortableItem 
                                                key={item.id} 
                                                item={item} 
                                                removeItem={removeItem}
                                                editItem={editItem}
                                                toggleVisibility={toggleVisibility}
                                                addSubItem={addSubItem}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                            </DndContext>

                            <button 
                                onClick={addItem}
                                className="w-full py-10 border-2 border-dashed border-zinc-100 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-indigo-200 hover:text-indigo-600 transition-all bg-zinc-50/20 hover:bg-white group"
                            >
                                <div className="p-3 bg-white border border-zinc-100 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest mt-1">Append New Menu Item</span>
                            </button>
                        </>
                    </div>
                </div>
                </div>

                {/* Edit Modal */}
                <NavigationModal 
                    key={`${modalConfig.mode}-${modalConfig.targetId || modalConfig.parentId || 'new'}-${isModalOpen ? 'open' : 'closed'}`}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleModalSave}
                    initialData={modalConfig.initialData}
                    isSublink={!!modalConfig.parentId}
                />
            </div>
        </StudioDashboardShell>
    )
}

