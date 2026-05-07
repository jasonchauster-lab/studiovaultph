'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Search, Calendar, Settings, CreditCard, ArrowRight, Command as CommandIcon, Sparkles, History, Plus, BarChart3, Package, Users, Loader2 } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import clsx from 'clsx'
import { Kbd } from '@/components/ui/Kbd'
import { Separator } from '@/components/ui/Separator'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { performGlobalSearch } from '@/app/(dashboard)/studio/search-actions'
import { SearchResult } from '@/lib/services/search'

interface CommandAction {
    id: string
    title: string
    description: string
    icon: any
    category: string
    shortcut?: string
    perform: () => void
    roles?: string[]
}

export default function CommandPalette({ userRole }: { userRole?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const [dataResults, setDataResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const inputRef = useRef<HTMLInputElement>(null)

    const staticActions = useMemo<CommandAction[]>(() => [
        // Global Navigation
        {
            id: 'home',
            title: 'Overview',
            description: 'Go to your dashboard home',
            icon: Sparkles,
            category: 'Navigation',
            perform: () => router.push('/welcome')
        },
        // Studio Operations
        {
            id: 'schedule',
            title: 'Schedule Manager',
            description: 'Manage availability and bookings',
            icon: Calendar,
            category: 'Studio Ops',
            roles: ['studio', 'instructor'],
            perform: () => router.push(`/${userRole}/schedule`)
        },
        {
            id: 'analytics',
            title: 'Studio Intelligence',
            description: 'View growth and booking analytics',
            icon: BarChart3,
            category: 'Studio Ops',
            roles: ['studio'],
            perform: () => router.push('/studio/analytics')
        },
        {
            id: 'memberships',
            title: 'Pricing & Passes',
            description: 'Manage memberships and packages',
            icon: Package,
            category: 'Studio Ops',
            roles: ['studio'],
            perform: () => router.push('/studio/pricing')
        },
        {
            id: 'clients',
            title: 'Client CRM',
            description: 'Manage your studio customer list',
            icon: Users,
            category: 'Studio Ops',
            roles: ['studio'],
            perform: () => router.push('/studio/customers')
        },
        // Quick Actions (Contextual)
        {
            id: 'add-customer',
            title: 'Quick Add Customer',
            description: 'Onboard a new client',
            icon: Plus,
            category: 'Quick Actions',
            roles: ['studio'],
            perform: () => router.push('/studio/customers/new')
        },
        {
            id: 'add-product',
            title: 'Quick Add Product',
            description: 'Add item to inventory',
            icon: Package,
            category: 'Quick Actions',
            roles: ['studio'],
            perform: () => router.push('/studio/inventory?action=add')
        },
        // System
        {
            id: 'settings',
            title: 'Settings',
            description: 'Manage profile and studio config',
            icon: Settings,
            category: 'System',
            perform: () => router.push(userRole === 'studio' ? '/studio/settings' : `/${userRole}/profile`)
        },
        {
            id: 'history',
            title: 'Interaction History',
            description: 'View past activity logs',
            icon: History,
            category: 'System',
            roles: ['customer', 'instructor', 'studio'],
            perform: () => router.push(`/${userRole}/history`)
        }
    ].filter(a => !a.roles || (userRole && a.roles.includes(userRole))), [userRole, router])

    // HIGH-INTEGRITY: Search logic with debouncing
    useEffect(() => {
        if (query.length < 2) {
            setDataResults([])
            return
        }

        const handler = setTimeout(async () => {
            setIsSearching(true)
            const res = await performGlobalSearch(query)
            if (res.success && res.results) {
                setDataResults(res.results)
            }
            setIsSearching(false)
        }, 250)

        return () => clearTimeout(handler)
    }, [query])

    const filteredStaticActions = useMemo(() => {
        if (!query.trim()) return staticActions
        const lowQuery = query.toLowerCase()
        return staticActions.filter(a => 
            a.title.toLowerCase().includes(lowQuery) || 
            a.category.toLowerCase().includes(lowQuery) ||
            a.description.toLowerCase().includes(lowQuery)
        )
    }, [staticActions, query])

    // Combine Static Actions and Dynamic Data Results
    const combinedResults = useMemo(() => {
        const dataActions = dataResults.map(res => ({
            id: res.id,
            title: res.title,
            description: res.description,
            icon: res.category === 'Customers' ? Users : res.category === 'Products' ? Package : Calendar,
            category: res.category,
            perform: () => router.push(res.link)
        }))

        return [...filteredStaticActions, ...dataActions]
    }, [filteredStaticActions, dataResults, router])

    const groupedActions = useMemo(() => {
        const groups: Record<string, any[]> = {}
        combinedResults.forEach(action => {
            if (!groups[action.category]) groups[action.category] = []
            groups[action.category].push(action)
        })
        return groups
    }, [combinedResults])

    const categories = useMemo(() => Object.keys(groupedActions), [groupedActions])

    const toggle = useCallback(() => setIsOpen(prev => !prev), [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                toggle()
            }
            if (e.key === 'Escape') setIsOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [toggle])

    useEffect(() => {
        if (isOpen) {
            setActiveIndex(0)
            setQuery('')
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(prev => (prev + 1) % combinedResults.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => (prev - 1 + combinedResults.length) % combinedResults.length)
        } else if (e.key === 'Enter') {
            const action = combinedResults[activeIndex]
            if (action) {
                action.perform()
                setIsOpen(false)
            }
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-3xl md:rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <div className="p-5 md:p-8 bg-zinc-50/50 flex items-center gap-4 md:gap-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-tight border border-zinc-100 shrink-0">
                        {isSearching ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-primary animate-spin" /> : <Search className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />}
                    </div>
                    <input 
                        ref={inputRef}
                        type="text"
                        placeholder="Search clients, inventory, sessions or actions..."
                        className="flex-1 bg-transparent border-none outline-none text-zinc-900 font-black text-sm md:text-lg placeholder:text-zinc-200"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        autoFocus
                    />
                    <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-zinc-100 shadow-sm shrink-0">
                        <CommandIcon className="w-3.5 h-3.5 text-zinc-400" />
                        <Kbd className="bg-transparent border-none shadow-none text-[10px] font-black">K</Kbd>
                    </div>
                </div>

                <Separator className="opacity-50" />

                <ScrollArea className="max-h-[60vh]">
                    <div className="py-6">
                        {combinedResults.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto border border-zinc-100 shadow-tight">
                                    <Search className="w-8 h-8 text-zinc-200" />
                                </div>
                                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">No matching intelligence found.</p>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {categories.map(category => (
                                    <div key={category} className="px-6">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-5 ml-6 flex items-center gap-3">
                                            <span className="w-6 h-[1px] bg-primary/20" />
                                            {category}
                                        </h4>
                                        <div className="space-y-1.5">
                                            {groupedActions[category].map((action) => {
                                                const globalIdx = combinedResults.indexOf(action)
                                                const isActive = activeIndex === globalIdx
                                                return (
                                                    <button 
                                                        key={action.id + action.title}
                                                        onClick={() => { action.perform(); setIsOpen(false); }}
                                                        onMouseMove={() => setActiveIndex(globalIdx)}
                                                        className={clsx(
                                                            "w-full flex items-center justify-between p-4 rounded-[2rem] transition-all text-left group",
                                                            isActive ? "bg-zinc-900 text-white shadow-2xl -translate-y-1" : "hover:bg-zinc-50 text-zinc-600"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-5">
                                                            <div className={clsx(
                                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                                                isActive ? "bg-white/10 rotate-3" : "bg-white border border-zinc-100 shadow-tight"
                                                            )}>
                                                                <action.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-zinc-400")} />
                                                            </div>
                                                            <div>
                                                                <p className={clsx("text-[13px] font-black tracking-tight", isActive ? "text-white" : "text-zinc-900")}>
                                                                    {action.title}
                                                                </p>
                                                                <p className={clsx("text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5", isActive ? "text-white/60" : "text-zinc-400")}>
                                                                    {action.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {isActive && (
                                                            <ArrowRight className="w-4 h-4 text-white/40 animate-pulse mr-4" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-5 md:p-8 bg-zinc-50/50 flex items-center justify-between border-t border-zinc-100">
                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex items-center gap-2.5">
                            <Kbd className="bg-white">↑↓</Kbd>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Navigate</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Kbd className="bg-white">Enter</Kbd>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Select</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-primary/40 mx-auto md:mx-0">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Intel Engine Active</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
