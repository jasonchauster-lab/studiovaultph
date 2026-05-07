import React, { useState, useMemo, memo, useCallback } from 'react'
import { X, Search, ChevronDown, ChevronUp, Bell, Mail, Check, CheckSquare, Square, Zap, Trash2 } from 'lucide-react'
import { NOTIFICATION_CATEGORIES, NotificationCategory } from '@/lib/studio/notification-events'
import { upsertNotificationRecipient } from '@/app/(dashboard)/studio/management/actions'
import clsx from 'clsx'

// --- Sub-components (Memoized for Performance) ---

const EventRow = memo(({ 
    event, 
    preferences = [],
    onToggle 
}: { 
    event: any, 
    preferences: string[],
    onToggle: (eventId: string, channel: string) => void 
}) => {
    const isSelected = (channel: string) => preferences.includes(channel)

    return (
        <div className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-colors group/event">
            <span className="text-[10px] font-bold text-slate uppercase tracking-wider">{event.label}</span>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => onToggle(event.id, 'email')}
                    className={clsx(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all border",
                        isSelected('email') 
                            ? "bg-forest/5 border-forest/20 text-forest" 
                            : "bg-transparent border-transparent text-zinc-300 hover:text-charcoal"
                    )}
                >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
                </button>
                <button 
                    onClick={() => onToggle(event.id, 'in_app')}
                    className={clsx(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all border",
                        isSelected('in_app') 
                            ? "bg-forest/5 border-forest/20 text-forest" 
                            : "bg-transparent border-transparent text-zinc-300 hover:text-charcoal"
                    )}
                >
                    <Bell className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">In-App</span>
                </button>
            </div>
        </div>
    )
})

EventRow.displayName = 'EventRow'

const CategorySection = memo(({ 
    category, 
    isExpanded, 
    onToggleExpand, 
    categoryPreferences = {},
    onToggleEvent, 
    onToggleAll 
}: { 
    category: NotificationCategory, 
    isExpanded: boolean, 
    onToggleExpand: (id: string) => void,
    categoryPreferences: Record<string, string[]>,
    onToggleEvent: (catId: string, eventId: string, channel: string) => void,
    onToggleAll: (catId: string, channel: string) => void
}) => {
    const allEmailSelected = category.events.every(e => categoryPreferences[e.id]?.includes('email'))
    const allInAppSelected = category.events.every(e => categoryPreferences[e.id]?.includes('in_app'))

    // Bound callbacks to maintain memoization
    const handleExpand = useCallback(() => onToggleExpand(category.id), [onToggleExpand, category.id])
    const handleToggleAllEmail = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleAll(category.id, 'email')
    }, [onToggleAll, category.id])
    const handleToggleAllInApp = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        onToggleAll(category.id, 'in_app')
    }, [onToggleAll, category.id])
    const handleToggleEvent = useCallback((eventId: string, channel: string) => {
        onToggleEvent(category.id, eventId, channel)
    }, [onToggleEvent, category.id])

    return (
        <div className="border border-zinc-100 rounded-2xl overflow-hidden bg-off-white/20">
            <div 
                className="p-4 bg-white flex items-center justify-between cursor-pointer group"
                onClick={handleExpand}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleToggleAllEmail}
                            className="p-1 hover:bg-zinc-50 rounded transition-colors"
                        >
                            <Mail className={clsx("w-4 h-4 transition-colors", allEmailSelected ? "text-forest" : "text-zinc-300")} />
                        </button>
                        <button 
                            onClick={handleToggleAllInApp}
                            className="p-1 hover:bg-zinc-50 rounded transition-colors"
                        >
                            <Bell className={clsx("w-4 h-4 transition-colors", allInAppSelected ? "text-forest" : "text-zinc-300")} />
                        </button>
                    </div>
                    <h4 className="text-[11px] font-black text-charcoal uppercase tracking-widest">{category.label}</h4>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-300" /> : <ChevronDown className="w-4 h-4 text-zinc-300" />}
            </div>

            {isExpanded && (
                <div className="p-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {category.events.map(event => (
                        <EventRow 
                            key={event.id}
                            event={event}
                            preferences={categoryPreferences[event.id] || []}
                            onToggle={handleToggleEvent}
                        />
                    ))}
                </div>
            )}
        </div>
    )
})

CategorySection.displayName = 'CategorySection'

// --- Staff Search Component (Isolates Input Lag) ---

const StaffSearch = memo(({ 
    allStaff, 
    onSelect, 
    selectedStaffId, 
    disabled 
}: { 
    allStaff: any[], 
    onSelect: (id: string) => void, 
    selectedStaffId: string,
    disabled: boolean
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [isSearchFocused, setIsSearchFocused] = useState(false)

    const filteredStaff = useMemo(() => {
        if (!searchTerm) return allStaff
        const term = searchTerm.toLowerCase()
        return allStaff.filter(s => 
            s.full_name?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term)
        )
    }, [allStaff, searchTerm])

    return (
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
                type="text"
                placeholder="Search staff name or email..."
                className="w-full bg-off-white border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-forest/10 focus:border-forest transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                disabled={disabled}
            />
            
            {(searchTerm || (isSearchFocused && !selectedStaffId)) && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-1">
                    {filteredStaff.map(staff => (
                        <button 
                            key={staff.id}
                            onClick={() => {
                                onSelect(staff.id)
                                setSearchTerm('')
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-off-white flex items-center gap-3 transition-colors border-b border-zinc-50 last:border-0"
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500 overflow-hidden">
                                {staff.avatar_url ? <img src={staff.avatar_url} alt="" className="w-full h-full object-cover" /> : staff.full_name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xs font-black text-charcoal uppercase">{staff.full_name}</p>
                                <p className="text-[10px] text-slate font-medium">{staff.email}</p>
                            </div>
                        </button>
                    ))}
                    {filteredStaff.length === 0 && (
                        <div className="p-8 text-center text-zinc-400 text-[10px] font-bold uppercase tracking-widest italic">
                            No staff members found
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})

StaffSearch.displayName = 'StaffSearch'

// --- Main Component ---

interface AddRecipientModalProps {
    studioId: string
    allStaff: any[]
    isOpen: boolean
    onClose: () => void
    editingRecipient?: any
}

export default function AddRecipientModal({ 
    studioId, 
    allStaff, 
    isOpen, 
    onClose,
    editingRecipient 
}: AddRecipientModalProps) {
    const [selectedStaffId, setSelectedStaffId] = useState(editingRecipient?.profile_id || '')
    const [isEnabled, setIsEnabled] = useState(editingRecipient?.is_enabled ?? true)
    const [preferences, setPreferences] = useState<any>(editingRecipient?.preferences || {})
    const [isSaving, setIsSaving] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState<string[]>(NOTIFICATION_CATEGORIES.map(c => c.id))

    const selectedStaff = useMemo(() => {
        return allStaff.find(s => s.id === selectedStaffId)
    }, [allStaff, selectedStaffId])

    const toggleCategory = useCallback((catId: string) => {
        setExpandedCategories(prev => 
            prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
        )
    }, [])

    const toggleEvent = useCallback((catId: string, eventId: string, channel: string) => {
        setPreferences((prev: any) => {
            const next = { ...prev }
            const categoryPrefs = { ...(next[catId] || {}) }
            const eventPrefs = [...(categoryPrefs[eventId] || [])]

            if (eventPrefs.includes(channel)) {
                categoryPrefs[eventId] = eventPrefs.filter((c: string) => c !== channel)
            } else {
                categoryPrefs[eventId] = [...eventPrefs, channel]
            }

            if (categoryPrefs[eventId].length === 0) delete categoryPrefs[eventId]
            if (Object.keys(categoryPrefs).length === 0) delete next[catId]
            else next[catId] = categoryPrefs

            return next
        })
    }, [])

    const toggleCategoryAll = useCallback((catId: string, channel: string) => {
        const category = NOTIFICATION_CATEGORIES.find(c => c.id === catId)
        if (!category) return

        setPreferences((prev: any) => {
            const categoryPrefs = prev[catId] || {}
            const allSelected = category.events.every(e => categoryPrefs[e.id]?.includes(channel))

            const next = { ...prev }
            const nextCategoryPrefs = { ...categoryPrefs }

            category.events.forEach(e => {
                const eventPrefs = [...(nextCategoryPrefs[e.id] || [])]
                if (allSelected) {
                    nextCategoryPrefs[e.id] = eventPrefs.filter((c: string) => c !== channel)
                    if (nextCategoryPrefs[e.id].length === 0) delete nextCategoryPrefs[e.id]
                } else {
                    if (!eventPrefs.includes(channel)) {
                        nextCategoryPrefs[e.id] = [...eventPrefs, channel]
                    }
                }
            })

            if (Object.keys(nextCategoryPrefs).length === 0) delete next[catId]
            else next[catId] = nextCategoryPrefs
            
            return next
        })
    }, [])

    const bulkToggle = useCallback((action: 'all' | 'none') => {
        if (action === 'none') {
            setPreferences({})
            return
        }

        const next: any = {}
        NOTIFICATION_CATEGORIES.forEach(cat => {
            next[cat.id] = {}
            cat.events.forEach(e => {
                next[cat.id][e.id] = ['email', 'in_app']
            })
        })
        setPreferences(next)
    }, [])

    const handleSave = async () => {
        if (!selectedStaffId) return
        setIsSaving(true)
        try {
            await upsertNotificationRecipient(studioId, selectedStaffId, isEnabled, preferences)
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-charcoal/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-charcoal uppercase tracking-wider">
                            {editingRecipient ? 'Edit Recipient' : 'Add Recipient'}
                        </h2>
                        <p className="text-[10px] text-slate font-bold uppercase tracking-widest mt-1 opacity-60">
                            Configure channel preferences
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-zinc-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-10">
                    {/* Staff Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em]">Select Staff</label>
                        
                        <StaffSearch 
                            allStaff={allStaff}
                            selectedStaffId={selectedStaffId}
                            onSelect={setSelectedStaffId}
                            disabled={!!editingRecipient}
                        />
                        
                        {selectedStaff && (
                             <div className="flex items-center gap-4 p-4 bg-off-white rounded-2xl border border-zinc-100 animate-in fade-in zoom-in">
                                <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden shadow-tight ring-2 ring-white">
                                    {selectedStaff.avatar_url ? <img src={selectedStaff.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-xs font-black text-zinc-500">{selectedStaff.full_name?.charAt(0)}</span>}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-charcoal uppercase tracking-wider">{selectedStaff.full_name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-forest uppercase tracking-widest">{selectedStaff.role}</span>
                                        <span className="text-zinc-300">•</span>
                                        <span className="text-[10px] text-slate font-medium">{selectedStaff.email}</span>
                                    </div>
                                </div>
                                <button onClick={() => !editingRecipient && setSelectedStaffId('')} className={clsx("p-2 rounded-full", editingRecipient ? "hidden" : "hover:bg-zinc-200 text-zinc-400")}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Preferences */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-3xl border border-zinc-100">
                            <label className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                                <Bell className="w-3.5 h-3.5 text-forest" />
                                Subscriptions
                            </label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => bulkToggle('all')}
                                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[8px] font-bold uppercase tracking-widest text-zinc-500 hover:text-forest hover:border-forest transition-all flex items-center gap-2"
                                >
                                    <Zap className="w-3 h-3" />
                                    Enable All
                                </button>
                                <button 
                                    onClick={() => bulkToggle('none')}
                                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[8px] font-bold uppercase tracking-widest text-zinc-500 hover:text-rose-500 hover:border-rose-200 transition-all flex items-center gap-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {NOTIFICATION_CATEGORIES.map(category => (
                                <CategorySection 
                                    key={category.id}
                                    category={category}
                                    isExpanded={expandedCategories.includes(category.id)}
                                    onToggleExpand={toggleCategory}
                                    categoryPreferences={preferences[category.id] || {}}
                                    onToggleEvent={toggleEvent}
                                    onToggleAll={toggleCategoryAll}
                                />
                            ))}

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-100 bg-off-white/30 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-6 py-4 border border-zinc-100 rounded-2xl text-[10px] font-black text-charcoal uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all">Cancel</button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !selectedStaffId}
                        className="flex-[2] px-6 py-4 bg-charcoal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-zinc-900 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-charcoal/20 flex items-center justify-center gap-3"
                    >
                        {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                        {editingRecipient ? 'Save Changes' : 'Add Recipient'}
                    </button>
                </div>
            </div>
        </div>
    )
}
