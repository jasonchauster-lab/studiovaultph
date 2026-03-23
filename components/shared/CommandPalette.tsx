'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
    Search, 
    Calendar, 
    User, 
    Settings, 
    MessageSquare, 
    CreditCard, 
    ArrowRight, 
    X,
    Command as CommandIcon,
    Sparkles,
    Shield,
    History,
    Plus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

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
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)

    const actions: CommandAction[] = [
        // Global Actions
        {
            id: 'home',
            title: 'Overview',
            description: 'Go to your dashboard home',
            icon: Sparkles,
            category: 'Navigation',
            perform: () => router.push('/welcome')
        },
        {
            id: 'settings',
            title: 'Settings',
            description: 'Manage your profile and account',
            icon: Settings,
            category: 'System',
            perform: () => router.push(userRole === 'studio' ? '/studio/settings' : `/${userRole}/profile`)
        },
        // Instructor Specific
        {
            id: 'schedule',
            title: 'My Schedule',
            description: 'Manage your availability and classes',
            icon: Calendar,
            category: 'Management',
            roles: ['instructor'],
            perform: () => router.push('/instructor/schedule')
        },
        {
            id: 'earnings',
            title: 'Earnings',
            description: 'View revenue and payout status',
            icon: CreditCard,
            category: 'Management',
            roles: ['instructor', 'studio'],
            perform: () => router.push(`/${userRole}/earnings`)
        },
        // Studio Specific
        {
            id: 'bulk-slots',
            title: 'Generate Slots',
            description: 'Bulk create studio availability',
            icon: Plus,
            category: 'Studio Ops',
            roles: ['studio'],
            perform: () => router.push('/studio/schedule')
        },
        // Customer Specific
        {
            id: 'discovery',
            title: 'Find Instructors',
            description: 'Search for trainers and studios',
            icon: Search,
            category: 'Discovery',
            roles: ['customer'],
            perform: () => router.push('/customer')
        },
        {
            id: 'history',
            title: 'Booking History',
            description: 'View your past and upcoming sessions',
            icon: History,
            category: 'History',
            roles: ['customer', 'instructor', 'studio'],
            perform: () => router.push(`/${userRole}/history`)
        }
    ].filter(a => !a.roles || (userRole && a.roles.includes(userRole)))

    const filteredActions = query === '' 
        ? actions 
        : actions.filter(a => 
            a.title.toLowerCase().includes(query.toLowerCase()) || 
            a.category.toLowerCase().includes(query.toLowerCase())
          )

    const toggle = useCallback(() => setIsOpen(prev => !prev), [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                toggle()
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
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

    const handleAction = (action: CommandAction) => {
        action.perform()
        setIsOpen(false)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(prev => (prev + 1) % filteredActions.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length)
        } else if (e.key === 'Enter') {
            if (filteredActions[activeIndex]) {
                handleAction(filteredActions[activeIndex])
            }
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-charcoal/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                <div className="p-6 border-b border-border-grey/30 bg-off-white/30 flex items-center gap-4">
                    <Search className="w-5 h-5 text-forest" />
                    <input 
                        ref={inputRef}
                        type="text"
                        placeholder="Search actions, pages, or search terms..."
                        className="flex-1 bg-transparent border-none outline-none text-charcoal font-bold text-base placeholder:text-charcoal/20"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-charcoal/5 rounded-lg border border-charcoal/10">
                        <CommandIcon className="w-3 h-3 text-charcoal/40" />
                        <span className="text-[10px] font-black text-charcoal/40 tracking-widest">K</span>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto py-4 scrollbar-hide">
                    {filteredActions.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-sm font-bold text-slate uppercase tracking-widest opacity-40">No matching actions found.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Array.from(new Set(filteredActions.map(a => a.category))).map(category => (
                                <div key={category} className="px-6">
                                    <h4 className="text-[10px] font-black text-forest uppercase tracking-[0.2em] mb-3 ml-2">{category}</h4>
                                    <div className="space-y-1">
                                        {filteredActions.filter(a => a.category === category).map((action, idx) => {
                                            const globalIdx = filteredActions.indexOf(action)
                                            const isActive = activeIndex === globalIdx
                                            return (
                                                <button 
                                                    key={action.id}
                                                    onClick={() => handleAction(action)}
                                                    onMouseMove={() => setActiveIndex(globalIdx)}
                                                    className={clsx(
                                                        "w-full flex items-center justify-between p-4 rounded-xl transition-all text-left group",
                                                        isActive ? "bg-forest text-white shadow-tight -translate-y-0.5" : "hover:bg-off-white/50 text-charcoal"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={clsx(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                                            isActive ? "bg-white/20" : "bg-off-white group-hover:bg-white"
                                                        )}>
                                                            <action.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-charcoal/40")} />
                                                        </div>
                                                        <div>
                                                            <p className={clsx("text-sm font-bold tracking-tight", isActive ? "text-white" : "text-charcoal-900")}>
                                                                {action.title}
                                                            </p>
                                                            <p className={clsx("text-[11px] font-medium leading-none opacity-60", isActive ? "text-white/70" : "text-slate")}>
                                                                {action.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isActive && (
                                                        <ArrowRight className="w-4 h-4 text-white/50 animate-pulse" />
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

                <div className="p-6 bg-off-white/50 border-t border-border-grey/30 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-border-grey/60 rounded text-[9px] font-bold text-charcoal/40 shadow-sm">↑↓</kbd>
                            <span className="text-[9px] font-black text-charcoal/30 uppercase tracking-widest">Navigate</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-border-grey/60 rounded text-[9px] font-bold text-charcoal/40 shadow-sm">Enter</kbd>
                            <span className="text-[9px] font-black text-charcoal/30 uppercase tracking-widest">Select</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-border-grey/60 rounded text-[9px] font-bold text-charcoal/40 shadow-sm">Esc</kbd>
                            <span className="text-[9px] font-black text-charcoal/30 uppercase tracking-widest">Close</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-forest/40">
                        <Shield className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Safe Path Verified</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
