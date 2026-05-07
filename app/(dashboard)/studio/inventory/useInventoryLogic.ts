import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { InventoryItem } from '@/types/agency'
import { upsertInventoryItem, deleteInventoryItem } from './actions'
import { createClient } from '@/lib/supabase/client'

export function useInventoryLogic(initialInventory: InventoryItem[], studioId: string) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const supabase = createClient()

    // Contextual Intel: Auto-apply search from URL (useful for Command Palette deep-links)
    useEffect(() => {
        const search = searchParams.get('search')
        const action = searchParams.get('action')
        
        if (search) {
            setSearchQuery(search)
        }
        
        if (action === 'add') {
            setIsEditorOpen(true)
        }
    }, [searchParams])

    // UI State
    const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // RECTIVE INTEL: Sync inventory changes across staff dashboards in real-time
    useEffect(() => {
        const channel = supabase
            .channel(`inventory-${studioId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'inventory_items',
                filter: `studio_id=eq.${studioId}`
            }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    setInventory(prev => {
                        if (prev.some(i => i.id === payload.new.id)) return prev
                        return [...prev, payload.new as InventoryItem]
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setInventory(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new as InventoryItem } : i))
                } else if (payload.eventType === 'DELETE') {
                    setInventory(prev => prev.filter(i => i.id !== payload.old.id))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [studioId, supabase])

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Memoized Filtering
    const filteredInventory = useMemo(() => {
        const query = debouncedSearch.toLowerCase().trim()
        if (!query) return inventory
        return inventory.filter(item => 
            item.name.toLowerCase().includes(query) ||
            item.sku?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query)
        )
    }, [inventory, debouncedSearch])

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSaving(true)
        const formData = new FormData(e.currentTarget)
        
        const data = {
            id: editingItem?.id,
            studio_id: studioId,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            sku: formData.get('sku') as string,
            category: formData.get('category') as string,
            price: Number(formData.get('price')),
            stock_level: Number(formData.get('stock_level')),
            low_stock_threshold: Number(formData.get('low_stock_threshold')),
        }

        try {
            const result = await upsertInventoryItem(data)
            if ((result as any)?.error) throw new Error((result as any).error)
            
            toast('Inventory updated successfully', 'success')
            setIsEditorOpen(false)
            setEditingItem(null)
            
            // Optimistic Update (Real-time will also handle this, but we keep it for snappiness)
            if (editingItem) {
                setInventory(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...data as InventoryItem } : i))
            } else {
                router.refresh()
            }
        } catch (err: any) {
            toast(err.message || 'Failed to save item', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return
        
        try {
            const result = await deleteInventoryItem(studioId, id)
            if ((result as any)?.error) throw new Error((result as any).error)
            
            setInventory(prev => prev.filter(i => i.id !== id))
            toast('Item removed from inventory', 'success')
        } catch (err: any) {
            toast(err.message || 'Failed to delete item', 'error')
        }
    }

    const openEditor = (item: InventoryItem | null = null) => {
        setEditingItem(item)
        setIsEditorOpen(true)
    }

    const closeEditor = () => {
        setEditingItem(null)
        setIsEditorOpen(false)
    }

    return {
        inventory: filteredInventory,
        viewMode, setViewMode,
        isEditorOpen, openEditor, closeEditor,
        editingItem, isSaving,
        searchQuery, setSearchQuery,
        handleSave, handleDelete
    }
}
