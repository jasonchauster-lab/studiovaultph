'use client'

import React, { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { 
    Layout, Users, User, Info, Plus, Settings2, Search, 
    ChevronDown, MoreHorizontal, Filter, Layers, GripVertical, 
    Edit2, Trash2, Calendar, CreditCard, ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import ServiceForm from '@/components/studio/forms/ServiceForm'
import ImmersiveServiceForm from '@/components/studio/forms/ImmersiveServiceForm'
import { 
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    reorderCategories, 
    reorderServices,
    moveServiceToCategory,
    deleteService
} from './actions'
import { format } from 'date-fns'

interface ServicesPageClientProps {
    studioId: string
    services: any[]
    memberships: any[]
    packages: any[]
    categories: any[]
}

function SortableServiceCard({ 
    service, 
    onEdit, 
    onEditPricing,
    onDelete,
    isMenuOpen,
    onMenuToggle
}: { 
    service: any, 
    onEdit: () => void, 
    onEditPricing: () => void,
    onDelete: () => void,
    isMenuOpen: boolean,
    onMenuToggle: () => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: service.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    const status = service.status || 'active'

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-zinc-50/80 transition-all group bg-white border border-zinc-100 rounded-xl mb-3 shadow-sm"
        >
            <div className="flex items-center gap-6 flex-1 w-full">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                    <GripVertical className="w-4 h-4 text-zinc-300" />
                </div>
                <div className="w-10 h-10 bg-indigo-50/50 rounded-lg flex items-center justify-center text-[#2D3282] shrink-0">
                    <Layers className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-[200px]">
                    <div className="flex items-center gap-3">
                        <h4 className="text-[13px] font-bold text-zinc-900">{service.name}</h4>
                        <span className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                            status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                        )}>
                            {status}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        {service.duration_minutes}m
                    </div>
                </div>

                <div className="flex-1 hidden md:flex items-center justify-end gap-3 px-8">
                    <button 
                        onClick={onEditPricing}
                        className="px-4 py-1.5 bg-white border border-zinc-200 text-zinc-600 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-zinc-50 transition-all"
                    >
                        Edit Pricing & Packages
                    </button>
                </div>
            </div>

            <div className="mt-4 md:mt-0 flex items-center gap-6 text-right">
                <div className="hidden lg:flex flex-col items-end gap-0.5">
                    <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Created on</span>
                    <span className="text-[10px] font-bold text-zinc-500">{format(new Date(service.created_at), 'dd MMM yyyy, h:mm a')}</span>
                </div>
                <div className="relative">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation()
                            onMenuToggle()
                        }}
                        className={clsx(
                            "p-2 rounded-lg transition-all",
                            isMenuOpen ? "bg-zinc-100 text-[#2D3282]" : "text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50"
                        )}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={onMenuToggle} />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 z-[101] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <button 
                                    onClick={() => {
                                        onEdit()
                                        onMenuToggle()
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-zinc-600 hover:bg-zinc-50 hover:text-[#2D3282] transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    EDIT DETAILS
                                </button>
                                <button 
                                    onClick={() => {
                                        onEditPricing()
                                        onMenuToggle()
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-zinc-600 hover:bg-zinc-50 hover:text-[#2D3282] transition-colors"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    EDIT PRICING
                                </button>
                                <div className="h-px bg-zinc-100 my-1" />
                                <button 
                                    onClick={() => {
                                        if(confirm('Are you sure you want to delete this class?')) onDelete()
                                        onMenuToggle()
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    DELETE CLASS
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function SortableCategoryBlock({ 
    category, 
    services, 
    onAddClasses,
    onEdit,
    onDelete,
    onEditService,
    onEditServicePricing,
    onDeleteService,
    openMenuId,
    setOpenMenuId
}: { 
    category: any, 
    services: any[],
    onAddClasses: () => void,
    onEdit: () => void,
    onDelete: () => void,
    onEditService: (s: any) => void,
    onEditServicePricing: (s: any) => void,
    onDeleteService: (id: string) => void,
    openMenuId: string | null,
    setOpenMenuId: (id: string | null) => void
}) {
    const [isExpanded, setIsExpanded] = useState(true)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: category.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-transparent mb-8">
            <div className="flex items-center justify-between mb-4 px-2 group">
                <div className="flex items-center gap-4">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-zinc-300" />
                    </div>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-3"
                    >
                        <h3 className="text-sm font-black text-zinc-900 group-hover:text-[#2D3282] transition-colors">{category.name}</h3>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded border border-zinc-100/50">
                            {services.length} items
                        </span>
                    </button>
                    <button 
                        onClick={onAddClasses}
                        className="text-[10px] font-bold text-[#2D3282] hover:text-indigo-700 uppercase tracking-widest ml-2"
                    >
                        Add classes +
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onEdit} className="p-1.5 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={clsx("p-1.5 text-zinc-300 transition-transform", isExpanded && "rotate-180")}
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <SortableContext items={services.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="min-h-[50px]">
                        {services.length === 0 ? (
                            <div className="p-8 border-2 border-dashed border-zinc-100 rounded-2xl text-center text-[11px] font-medium text-zinc-400 uppercase tracking-widest bg-white/30 mb-4">
                                No classes in this category
                            </div>
                        ) : (
                            services.map((service) => (
                                <SortableServiceCard 
                                    key={service.id} 
                                    service={service} 
                                    onEdit={() => onEditService(service)}
                                    onEditPricing={() => onEditServicePricing(service)}
                                    onDelete={() => onDeleteService(service.id)}
                                    isMenuOpen={openMenuId === service.id}
                                    onMenuToggle={() => setOpenMenuId(openMenuId === service.id ? null : service.id)}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            )}
        </div>
    )
}

export default function ServicesPageClient({ 
    studioId,
    services: initialServices, 
    memberships, 
    packages, 
    categories: initialCategories 
}: ServicesPageClientProps) {
    const [services, setServices] = useState(initialServices)
    const [categories, setCategories] = useState(initialCategories)
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
    const [editingService, setEditingService] = useState<any>(null)
    const [initialStep, setInitialStep] = useState(1)
    const [activeTab, setActiveTab] = useState<'classes' | 'appointments'>('classes')
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    React.useEffect(() => {
        setServices(initialServices)
    }, [initialServices])

    React.useEffect(() => {
        setCategories(initialCategories)
    }, [initialCategories])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) return

        if (active.id !== over.id) {
            // Case 1: Reordering Categories
            const activeCategory = categories.find(c => c.id === active.id)
            const overCategory = categories.find(c => c.id === over.id)

            if (activeCategory && overCategory) {
                const oldIndex = categories.indexOf(activeCategory)
                const newIndex = categories.indexOf(overCategory)
                const newCats = arrayMove(categories, oldIndex, newIndex)
                setCategories(newCats)
                await reorderCategories(studioId, newCats.map(c => c.id))
                return
            }

            // Case 2: Reordering Services or Moving Between Categories
            const activeService = services.find(s => s.id === active.id)
            if (activeService) {
                // Find which category 'over' belongs to
                const overService = services.find(s => s.id === over.id)
                const overCatId = overService ? overService.category_id : over.id
                
                if (activeService.category_id !== overCatId) {
                    // Moved to different category
                    const newServices = services.map(s => 
                        s.id === active.id ? { ...s, category_id: overCatId } : s
                    )
                    setServices(newServices)
                    await moveServiceToCategory(active.id.toString(), overCatId as string)
                } else if (overService) {
                    // Reordered within same category
                    const catServices = services.filter(s => s.category_id === activeService.category_id)
                    const oldIndex = catServices.indexOf(activeService)
                    const newIndex = catServices.indexOf(overService)
                    const newCatServices = arrayMove(catServices, oldIndex, newIndex)
                    
                    const otherServices = services.filter(s => s.category_id !== activeService.category_id)
                    setServices([...otherServices, ...newCatServices])
                    await reorderServices(studioId, newCatServices.map(s => s.id))
                }
            }
        }
    }

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return
        const res = await createCategory(studioId, newCategoryName, activeTab === 'classes' ? 'class' : 'appointment')
        if (res.success && res.data) {
            setCategories(prev => [...prev, res.data])
            setIsAddingCategory(false)
            setNewCategoryName('')
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Are you sure? Services in this category will be moved to "General".')) return
        setCategories(prev => prev.filter(c => c.id !== id))
        await deleteCategory(id)
    }

    const filteredServices = services.filter(s => s.type === (activeTab === 'classes' ? 'class' : 'appointment'))
    const filteredCategories = categories.filter(c => c.type === (activeTab === 'classes' ? 'class' : 'appointment'))

    const serviceActions = (
        <div className="flex items-center gap-3">
            <button 
                onClick={() => {
                    setEditingService(null)
                    setInitialStep(1)
                    setIsServiceModalOpen(true)
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2D3282] rounded-xl text-[11px] font-bold uppercase tracking-widest text-white hover:bg-emerald-600 transition-all shadow-md active:scale-95"
            >
                <Plus className="w-4 h-4" />
                Add Class
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-zinc-50">
            <StudioDashboardShell 
                title={activeTab === 'classes' ? 'Classes' : 'Appointments'}
                breadcrumbs={[{ label: 'Classes & Sessions' }]}
                actions={serviceActions}
            >
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="mb-2">
                        <h1 className="text-2xl font-black text-zinc-900">{activeTab === 'classes' ? 'Classes' : 'Appointments'}</h1>
                        <p className="text-xs text-zinc-500 mt-2 max-w-2xl leading-relaxed">
                            {activeTab === 'classes' 
                                ? 'A class is a recurring session happening at a specific time (e.g., Weekly Reformer). Professionals can manage group sizes and recurring schedules here.'
                                : 'Manage your private sessions and appointments. Set individual availability and durations for 1-on-1 bookings.'}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 mb-10">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#2D3282] transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search class"
                                className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <select className="px-6 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 outline-none focus:border-[#2D3282] cursor-pointer shadow-sm">
                                <option>All Status</option>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                            <select className="px-6 py-3 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 outline-none focus:border-[#2D3282] cursor-pointer shadow-sm">
                                <option>All category</option>
                                {filteredCategories.map(c => <option key={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <DndContext id="services-page-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={filteredCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4">
                                {filteredCategories.length === 0 && filteredServices.filter(s => !s.category_id).length > 0 && (
                                     <SortableCategoryBlock 
                                        key="uncategorized"
                                        category={{ id: 'uncategorized', name: 'General', type: activeTab === 'classes' ? 'class' : 'appointment' }}
                                        services={filteredServices.filter(s => !s.category_id)}
                                        onAddClasses={() => {
                                            setEditingService(null)
                                            setInitialStep(1)
                                            setIsServiceModalOpen(true)
                                        }}
                                        onEdit={() => {}}
                                        onDelete={() => {}}
                                        onEditService={(s) => {
                                            setEditingService(s)
                                            setInitialStep(1)
                                            setIsServiceModalOpen(true)
                                        }}
                                        onEditServicePricing={(s) => {
                                            setEditingService(s)
                                            setInitialStep(4)
                                            setIsServiceModalOpen(true)
                                        }}
                                        onDeleteService={async (id) => {
                                            setServices(prev => prev.filter(s => s.id !== id))
                                            await deleteService(id)
                                        }}
                                        openMenuId={openMenuId}
                                        setOpenMenuId={setOpenMenuId}
                                    />
                                )}
                                
                                {filteredCategories.map((cat) => (
                                    <SortableCategoryBlock 
                                        key={cat.id} 
                                        category={cat} 
                                        services={filteredServices.filter(s => s.category_id === cat.id)}
                                        onAddClasses={() => {
                                            setEditingService(null)
                                            setInitialStep(1)
                                            setIsServiceModalOpen(true)
                                        }}
                                        onEdit={() => {/* Rename logic */}}
                                        onDelete={() => handleDeleteCategory(cat.id)}
                                        onEditService={(s) => {
                                            setEditingService(s)
                                            setInitialStep(1)
                                            setIsServiceModalOpen(true)
                                        }}
                                        onEditServicePricing={(s) => {
                                            setEditingService(s)
                                            setInitialStep(4)
                                            setIsServiceModalOpen(true)
                                        }}
                                        onDeleteService={async (id) => {
                                            setServices(prev => prev.filter(s => s.id !== id))
                                            await deleteService(id)
                                        }}
                                        openMenuId={openMenuId}
                                        setOpenMenuId={setOpenMenuId}
                                    />
                                ))}

                                {isAddingCategory ? (
                                    <div className="p-8 bg-white border-2 border-[#2D3282] rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                        <div className="max-w-md mx-auto space-y-4 text-center">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#2D3282]">New category</h4>
                                            <input 
                                                autoFocus
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddCategory()
                                                    if (e.key === 'Escape') setIsAddingCategory(false)
                                                }}
                                                placeholder="Enter category name..."
                                                className="w-full px-6 py-4 border border-zinc-200 rounded-xl text-center font-bold text-lg outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282]"
                                            />
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setIsAddingCategory(false)}
                                                    className="flex-1 py-3 bg-zinc-100 text-zinc-500 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all font-bold"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleAddCategory}
                                                    className="flex-1 py-3 bg-[#2D3282] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-indigo-500/20 transition-all font-bold"
                                                >
                                                    Create Category
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsAddingCategory(true)}
                                        className="w-full flex items-center justify-center gap-4 py-8 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 hover:border-[#2D3282] hover:text-[#2D3282] hover:bg-[#2D3282]/[0.02] transition-all group mt-8"
                                    >
                                        <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">Add {activeTab === 'classes' ? 'class' : 'appointment'} category</span>
                                    </button>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </StudioDashboardShell>

            <ImmersiveServiceForm 
                isOpen={isServiceModalOpen} 
                onClose={() => {
                    setIsServiceModalOpen(false)
                    setEditingService(null)
                    setInitialStep(1)
                }} 
                memberships={memberships}
                packages={packages}
                categories={filteredCategories}
                type={activeTab === 'classes' ? 'class' : 'appointment'}
                service={editingService}
                initialStep={initialStep}
            />
        </div>
    )
}
