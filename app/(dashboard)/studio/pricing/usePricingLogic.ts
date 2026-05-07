import { useState, useEffect, useMemo, useCallback } from 'react'
import { Membership, Package, ServiceCategory } from '@/types/agency'
import { createCategory, deleteCategory, deleteMembership, deletePackage, updateCategory } from '@/app/(dashboard)/studio/pricing/actions'
import { useToast } from '@/components/ui/Toast'
import { SYSTEM_CATEGORIES } from '@/lib/constants'

export function usePricingLogic({
    initialMemberships,
    initialPackages,
    initialCategories,
    studioId,
    activeTab: initialTab
}: {
    initialMemberships: Membership[]
    initialPackages: Package[]
    initialCategories: ServiceCategory[]
    studioId: string
    activeTab: 'memberships' | 'packages'
}) {
    const { toast } = useToast()
    
    // Core Data State
    const [categories, setCategories] = useState<ServiceCategory[]>(initialCategories)
    const [memberships, setMemberships] = useState<Membership[]>(initialMemberships)
    const [packages, setPackages] = useState<Package[]>(initialPackages)
    
    // Sync state with props only when they change
    useEffect(() => { 
        setCategories(initialCategories) 
        setMemberships(initialMemberships)
        setPackages(initialPackages)
    }, [initialCategories, initialMemberships, initialPackages])

    // UI Logic states
    const [activeTab, setActiveTab] = useState<'memberships' | 'packages'>(initialTab)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'public' | 'private'>('all')
    const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['general']))

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])
    
    // Modal & Loading states
    const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false)
    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingItem, setEditingItem] = useState<Membership | Package | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

    // Sync state with props - only update if not mid-processing to avoid UI flickering
    useEffect(() => { 
        if (!isProcessing) setCategories(initialCategories) 
    }, [initialCategories, isProcessing])
    
    useEffect(() => { 
        if (!isProcessing) setMemberships(initialMemberships) 
    }, [initialMemberships, isProcessing])
    
    useEffect(() => { 
        if (!isProcessing) setPackages(initialPackages) 
    }, [initialPackages, isProcessing])

    // Reset filters when switching tabs to prevent "ghost" filtering issues
    useEffect(() => {
        setCategoryFilter('all')
    }, [activeTab])

    const handleAddCategory = useCallback(async () => {
        if (!newCategoryName.trim()) return
        setIsProcessing(true)
        try {
            const res = await createCategory(studioId, newCategoryName, activeTab === 'memberships' ? 'membership' : 'package')
            if (res.success && res.data) {
                setCategories(prev => [...prev, res.data as ServiceCategory])
                setIsAddingCategory(false)
                setNewCategoryName('')
                toast('Category created successfully.', 'success')
            } else {
                toast(res.error || 'Failed to create category.', 'error')
            }
        } catch (err) {
            toast('A server error occurred.', 'error')
        } finally {
            setIsProcessing(false)
        }
    }, [studioId, newCategoryName, activeTab, toast])

    const handleDeleteCategory = useCallback(async (id: string) => {
        const previousCategories = [...categories]
        setCategories(prev => prev.filter(c => c.id !== id))
        
        try {
            const res = await deleteCategory(id, studioId)
            if (!res.success) throw new Error(res.error)
            toast('Category deleted.', 'success')
        } catch (err: any) {
            setCategories(previousCategories)
            toast(err.message || 'Failed to delete category.', 'error')
        }
    }, [categories, studioId, toast])

    const handleRenameCategory = useCallback(async (id: string, newName: string) => {
        const previousCategories = [...categories]
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c))

        try {
            const res = await updateCategory(id, studioId, newName)
            if (!res.success) throw new Error(res.error)
        } catch (err: any) {
            setCategories(previousCategories)
            toast(err.message || 'Failed to rename category.', 'error')
        }
    }, [categories, studioId, toast])

    const handleDeleteItem = useCallback(async (item: any) => {
        setDeletingItemId(item.id)
        const previousMemberships = [...memberships]
        const previousPackages = [...packages]

        if (activeTab === 'memberships') {
            setMemberships(prev => prev.filter(i => i.id !== item.id))
        } else {
            setPackages(prev => prev.filter(i => i.id !== item.id))
        }

        try {
            const res = activeTab === 'memberships' 
                ? await deleteMembership(item.id, studioId) 
                : await deletePackage(item.id, studioId)
            
            if (!res.success) throw new Error(res.error)
            toast(`${activeTab === 'memberships' ? 'Membership' : 'Package'} deleted.`, 'success')
        } catch (err: any) {
            setMemberships(previousMemberships)
            setPackages(previousPackages)
            toast(err.message || 'Failed to delete item.', 'error')
        } finally {
            setDeletingItemId(null)
        }
    }, [activeTab, memberships, packages, toast])

    const handleEditItem = useCallback((item: Membership | Package) => {
        setEditingItem(item)
        if (activeTab === 'memberships') setIsMembershipModalOpen(true)
        else setIsPackageModalOpen(true)
    }, [activeTab])

    const toggleAccordion = useCallback((id: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)
    }, [])

    // Debounced category auto-expansion
    useEffect(() => {
        if (debouncedSearchQuery.trim()) {
            const currentItems = activeTab === 'memberships' ? memberships : packages
            const matches = currentItems.filter(item => 
                item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            )
            
            setExpandedCategories(prev => {
                const next = new Set(prev)
                matches.forEach(item => next.add(item.category_id || 'general'))
                return next
            })
        }
    }, [debouncedSearchQuery, activeTab, memberships, packages])

    const filteredItems = useMemo(() => {
        const currentItems = activeTab === 'memberships' ? memberships : packages
        return currentItems.filter(item => {
            // Use type casting or check if 'category' exists on the item
            if ((item as any).category === SYSTEM_CATEGORIES.GENERATED) return false
            const matchesSearch = item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'public' ? !item.is_private : item.is_private)
            const matchesCategory = categoryFilter === 'all' ? true : (categoryFilter === '' ? !item.category_id : item.category_id === categoryFilter)
            return matchesSearch && matchesStatus && matchesCategory
        })
    }, [activeTab, memberships, packages, debouncedSearchQuery, statusFilter, categoryFilter])

    const filteredCategories = useMemo(() => {
        return categories.filter(c => c.type === (activeTab === 'memberships' ? 'membership' : 'package'))
    }, [categories, activeTab])

    const itemsByCategory = useMemo(() => {
        const groups: Record<string, PricingItem[]> = { general: [] }
        filteredItems.forEach(item => {
            const catId = item.category_id || 'general'
            // DEFENSIVE: Ensure item is assigned to a category that actually exists in the current tab's view.
            // If it belongs to a category of the "wrong" type (e.g. membership in a package category), fallback to General.
            const isValidCategory = catId === 'general' || filteredCategories.some(c => c.id === catId)
            const finalCatId = isValidCategory ? catId : 'general'
            
            if (!groups[finalCatId]) groups[finalCatId] = []
            groups[finalCatId].push(item)
        })
        return groups
    }, [filteredItems, filteredCategories])

    return {
        categories,
        memberships,
        packages,
        activeTab,
        setActiveTab,
        searchQuery,
        handleSearchChange,
        statusFilter,
        setStatusFilter,
        categoryFilter,
        setCategoryFilter,
        expandedCategories,
        toggleAccordion,
        isMembershipModalOpen,
        setIsMembershipModalOpen,
        isPackageModalOpen,
        setIsPackageModalOpen,
        isAddingCategory,
        setIsAddingCategory,
        newCategoryName,
        setNewCategoryName,
        editingItem,
        setEditingItem,
        isProcessing,
        deletingItemId,
        handleAddCategory,
        handleDeleteCategory,
        handleRenameCategory,
        handleDeleteItem,
        handleEditItem,
        filteredItems,
        filteredCategories,
        itemsByCategory
    }
}
