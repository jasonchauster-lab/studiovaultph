'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
    X, Home, Search, Calendar, Wallet, History, Building2, Gift, Globe,
    ScanQrCode, LayoutGrid, Settings, DollarSign, MapPin, ChevronDown, 
    Star, Ticket, Users, Receipt, ChartBar, Heart, Megaphone, Percent, Store, LogOut
} from 'lucide-react'
import { clsx } from 'clsx'
import { signOut } from '@/app/(marketplace)/auth/actions'
import { toggleStudioVisibilityAction } from '@/app/(dashboard)/studio/studio-actions'
import { useToast } from '@/components/ui/Toast'
import { getPrimaryNav, getActivePrimaryId, getOutletIdFromPath, getBranchHref } from '@/lib/navigation-config'

interface SidebarDrawerProps {
    isOpen: boolean
    onClose: () => void
    role: string
    profile: any
    studioData: any
    avatarUrl: string
    isStudioPortal?: boolean
    isFixed?: boolean
    outlets?: any[]
}

/**
 * Optimized Header Component
 * Fixed: Removed nested <a> tags to prevent hydration errors.
 */
function SidebarHeader({ 
    isHovered, 
    isStudioPortal, 
    studioData, 
    profile, 
    outlets, 
    onClose,
    isOutletPickerOpen,
    setIsOutletPickerOpen,
    activeOutlet,
    currentOutletId
}: any) {
    const pathname = usePathname()
    
    return (
        <div className="flex flex-col py-6 gap-6">
            <div className={clsx(
                "flex items-center gap-3 transition-all duration-300 group/logo",
                isHovered ? "px-6 w-full" : "justify-center w-12"
            )}>
                {/* Logo Link */}
                <Link 
                    href={isStudioPortal ? '/studio' : '/welcome'}
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-[#2D3282] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20 shrink-0 hover:scale-110 transition-transform"
                >
                    {isStudioPortal ? (studioData?.name?.charAt(0) || 'C') : (profile?.full_name?.charAt(0) || 'P')}
                </Link>

                {isHovered && (
                    <div className="flex flex-col min-w-0 flex-1">
                        {/* Name Link */}
                        <Link 
                            href={isStudioPortal ? '/studio' : '/welcome'}
                            onClick={onClose}
                            className="text-[13px] font-bold text-white truncate leading-tight hover:text-white/80 transition-colors"
                        >
                            {isStudioPortal ? (studioData?.name || 'Studio CMS') : (profile?.full_name || 'Member')}
                        </Link>

                        {/* Outlet Picker / Branch Info (NOT nested in a Link) */}
                        <div className="mt-1">
                            {isStudioPortal && (outlets?.length || 0) > 1 ? (
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsOutletPickerOpen(!isOutletPickerOpen)}
                                        className={clsx(
                                            "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors px-2 py-1 -ml-2 rounded-lg",
                                            isOutletPickerOpen ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"
                                        )}
                                    >
                                        <MapPin className="w-2.5 h-2.5" />
                                        {activeOutlet?.name || 'Switch Branch'}
                                        <ChevronDown className={clsx("w-2.5 h-2.5 transition-transform duration-300", isOutletPickerOpen && "rotate-180")} />
                                    </button>

                                    {isOutletPickerOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in duration-200">
                                            <div className="px-3 pb-2 mb-2 border-b border-white/5">
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select Branch</span>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto scrollbar-hide">
                                                {outlets?.map((outlet: any) => (
                                                    <Link
                                                        key={outlet.id}
                                                        href={getBranchHref(pathname, outlet.id)}
                                                        onClick={() => {
                                                            setIsOutletPickerOpen(false)
                                                            onClose()
                                                        }}
                                                        className={clsx(
                                                            "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors group/outlet",
                                                            outlet.id === currentOutletId && "bg-[#2D3282]/20 border-l-2 border-[#2D3282]"
                                                        )}
                                                    >
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                                            outlet.id === currentOutletId ? "bg-[#2D3282] text-white" : "bg-zinc-800 text-zinc-500 group-hover/outlet:bg-zinc-700"
                                                        )}>
                                                            <MapPin className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={clsx(
                                                                "text-[12px] font-bold truncate",
                                                                outlet.id === currentOutletId ? "text-white" : "text-zinc-400 group-hover/outlet:text-white"
                                                            )}>{outlet.name}</span>
                                                            <span className="text-[10px] text-zinc-600 truncate">{outlet.address}</span>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

/**
 * Optimized Navigation Group Component
 */
function NavItem({ href, onClick, icon: Icon, label, isActive, isHovered, isFixed, title }: any) {
    return (
        <Link 
            href={href} 
            onClick={onClick} 
            className={clsx(
                "flex items-center rounded-xl transition-all duration-300 group/link relative whitespace-nowrap overflow-hidden mx-auto h-12 z-20",
                isHovered ? "w-[200px] px-5" : "w-12 justify-center",
                isActive 
                    ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20 scale-105" 
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
            )}
            title={!isHovered ? title || label : undefined}
        >
            <Icon className="w-5 h-5 shrink-0" />
            <span className={clsx(
                "ml-4 text-[12px] font-medium transition-all duration-300",
                isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"
            )}>
                {label}
            </span>
            {isActive && !isHovered && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2D3282] rounded-r-full" />
            )}
        </Link>
    )
}

function SidebarContent({ role, studioData, outlets, isStudioPortal, pathname, onClose, isFixed, isHovered }: any) {
    const { toast } = useToast()
    const [localIsPublic, setLocalIsPublic] = useState(studioData?.is_public)
    
    useEffect(() => {
        setLocalIsPublic(studioData?.is_public)
    }, [studioData?.is_public])

    const searchParams = useSearchParams()
    const outletId = isStudioPortal ? (searchParams.get('outletId') || getOutletIdFromPath(pathname) || outlets?.[0]?.id) : undefined
    const activePrimaryId = getActivePrimaryId(pathname)
    const primaryNav = getPrimaryNav(outletId, isStudioPortal, role)
    
    const instructorItemClass = (isActive: boolean) =>
        clsx(
            "flex items-center gap-0 px-3 py-3 rounded-xl transition-all duration-300 group/link mx-2 overflow-hidden",
            isHovered && "gap-4 px-5",
            isActive 
                ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20" 
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
        )

    return (
        <div className="flex-1 py-4 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
            {isStudioPortal ? (
                /* Studio Portal View */
                <>
                    <div className="flex flex-col gap-1.5">
                        {primaryNav.map((item: any) => (
                            <NavItem 
                                key={item.id}
                                href={item.href}
                                onClick={onClose}
                                icon={item.icon}
                                label={item.label}
                                isActive={activePrimaryId === item.id}
                                isHovered={isHovered}
                            />
                        ))}
                    </div>

                    <div className="mt-auto pt-8 pb-4 flex flex-col gap-1.5">
                        <NavItem 
                            href={outletId ? `/studio/${outletId}/scan` : '/studio/scan'}
                            onClick={onClose}
                            icon={ScanQrCode}
                            label="Scan Customer"
                            isActive={pathname.includes('/scan')}
                            isHovered={isHovered}
                        />
                    </div>
                </>
            ) : role === 'studio' ? (
                /* Marketplace Studio Manager View */
                <div className="flex flex-col gap-1.5 px-2">
                    {/* Live/Status Toggle */}
                    <div className={clsx(
                        "mb-6 flex flex-col p-4 bg-zinc-900 border border-white/5 rounded-2xl transition-all",
                        isHovered ? "w-[216px]" : "w-12 items-center px-0 overflow-hidden"
                    )}>
                        {isHovered && (
                            <div className="flex items-center justify-between w-full mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Studio Status</span>
                                <div className={clsx(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                                    localIsPublic ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-500/10 border-white/10 text-zinc-500"
                                )}>
                                    <div className={clsx("w-1 h-1 rounded-full", localIsPublic ? "bg-emerald-500 animate-pulse" : "bg-zinc-500")} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{localIsPublic ? 'Live' : 'Private'}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                const prevStatus = localIsPublic
                                setLocalIsPublic(!prevStatus)
                                const result = await toggleStudioVisibilityAction(studioData.id, prevStatus)
                                if (result.success) {
                                    toast(`Studio now ${result.newStatus ? 'Live' : 'Private'}`, 'success')
                                } else {
                                    setLocalIsPublic(prevStatus)
                                    toast('Failed to update status', 'error')
                                }
                            }}
                            className={clsx(
                                "w-full flex items-center gap-3 transition-all",
                                isHovered ? "justify-between" : "justify-center"
                            )}
                        >
                            <div className={clsx( "flex items-center gap-3", !isHovered && "justify-center w-full" )}>
                                <Globe className={clsx("w-5 h-5", localIsPublic ? "text-emerald-500" : "text-zinc-500")} />
                                {isHovered && <span className="text-sm font-bold text-white whitespace-nowrap">Marketplace</span>}
                            </div>
                            {isHovered && (
                                <div className={clsx( "w-10 h-5 rounded-full p-1 relative transition-colors duration-300", localIsPublic ? "bg-emerald-500" : "bg-zinc-700" )}>
                                    <div className={clsx( "w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm", localIsPublic ? "translate-x-5" : "translate-x-0" )} />
                                </div>
                            )}
                        </button>
                    </div>

                    {primaryNav.map((item: any) => {
                        const Icon = item.icon
                        const isActive = activePrimaryId === item.id
                        return (
                            <Link 
                                key={item.id} 
                                href={item.href} 
                                onClick={onClose} 
                                className={clsx(
                                    "flex items-center rounded-xl transition-all duration-300 group/link relative whitespace-nowrap overflow-hidden h-12",
                                    isHovered ? "w-[200px] px-5" : "w-12 justify-center",
                                    isActive ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                {isHovered && <span className="ml-4 text-[12px] font-medium opacity-100 max-w-40 transition-all">{item.label}</span>}
                            </Link>
                        )
                    })}
                </div>
            ) : (
                /* Marketplace Customer/Instructor View */
                <div className="flex flex-col gap-1 p-2">
                    {role !== 'studio' && (
                        <Link 
                            href="/studios" 
                            onClick={onClose}
                            className={clsx(
                                "mb-6 flex items-center justify-center gap-0 group-hover/sidebar:px-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-zinc-200/50 transition-all group/rent mx-auto overflow-hidden",
                                isHovered ? "gap-3 px-6 mx-2 w-56" : "w-12"
                            )}
                        >
                            <Building2 className="w-4 h-4 text-zinc-900 shrink-0" />
                            {isHovered && <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 ml-3">Rent a Studio</span>}
                        </Link>
                    )}

                    {role === 'instructor' ? (
                        <>
                            {[
                                { href: '/welcome', icon: Home, label: 'Dashboard' },
                                { href: '/instructor/schedule', icon: Calendar, label: 'Schedule' },
                                { href: '/instructor/sessions', icon: History, label: 'History' },
                                { href: '/instructor/earnings', icon: DollarSign, label: 'Earnings' },
                                { href: '/referral', icon: Gift, label: 'Referral' },
                            ].map((item) => (
                                <Link 
                                    key={item.href}
                                    href={item.href} 
                                    onClick={onClose} 
                                    className={instructorItemClass(pathname === item.href || pathname.startsWith(item.href))}
                                >
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {isHovered && <span className="text-[12px] font-medium uppercase tracking-widest ml-4">{item.label}</span>}
                                </Link>
                            ))}
                        </>
                    ) : (
                        <>
                            {[
                                { href: '/customer', icon: Home, label: 'Overview' },
                                { href: '/studios', icon: Search, label: 'Find Classes' },
                                { href: '/customer/bookings', icon: Calendar, label: 'My Bookings' },
                                { href: '/customer/wallet', icon: Wallet, label: 'Wallet' },
                            ].map((item) => (
                                <Link 
                                    key={item.href}
                                    href={item.href} 
                                    onClick={onClose} 
                                    className={instructorItemClass(pathname === item.href || (item.href === '/customer' && pathname === '/welcome'))}
                                >
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {isHovered && <span className="text-[12px] font-medium uppercase tracking-widest ml-4">{item.label}</span>}
                                </Link>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default function SidebarDrawer({ 
    isOpen, onClose, role, profile, studioData, avatarUrl, isStudioPortal, isFixed, outlets 
}: SidebarDrawerProps) {
    const pathname = usePathname()
    const [isHovered, setIsHovered] = useState(false)
    const [isOutletPickerOpen, setIsOutletPickerOpen] = useState(false)
    const searchParams = useSearchParams()
    
    // Check both query param and deprecated path segment for backward compatibility
    const currentOutletId = searchParams.get('outletId') || getOutletIdFromPath(pathname) || outlets?.[0]?.id
    const activeOutlet = outlets?.find(o => o.id === currentOutletId) || outlets?.[0]
    
    if (!isOpen && !isFixed) return null
    
    const sidebarUI = (
        <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={clsx(
                "bg-black text-white flex flex-col border-r border-[#1a1a1a] transition-all duration-300 ease-in-out isolate",
                isFixed ? "fixed top-0 left-0 bottom-0 z-[100000] shadow-2xl pointer-events-none" : "fixed top-0 left-0 bottom-0 w-[240px] z-[201] animate-in slide-in-from-left pointer-events-auto shadow-2xl"
            )}
            style={isFixed ? { width: isHovered ? '240px' : '72px' } : {}}
        >
            <div className="flex flex-col h-full pointer-events-auto">
                <SidebarHeader 
                    isHovered={isHovered}
                    isStudioPortal={isStudioPortal}
                    studioData={studioData}
                    profile={profile}
                    outlets={outlets}
                    onClose={onClose}
                    isOutletPickerOpen={isOutletPickerOpen}
                    setIsOutletPickerOpen={setIsOutletPickerOpen}
                    activeOutlet={activeOutlet}
                    currentOutletId={currentOutletId}
                />

                <SidebarContent 
                    role={role}
                    studioData={studioData}
                    outlets={outlets}
                    isStudioPortal={isStudioPortal}
                    pathname={pathname}
                    onClose={onClose}
                    isFixed={isFixed}
                    isHovered={isHovered}
                />

                <div className="p-4 flex flex-col gap-4">
                    <form action={signOut}>
                        <button className={clsx(
                            "flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all mx-auto h-12",
                            isHovered ? "w-[200px] gap-3 px-5 justify-start" : "w-12",
                            !isStudioPortal && "w-full gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-bold text-[12px] uppercase tracking-widest overflow-hidden"
                        )} title="Log Out">
                            <LogOut className="w-4 h-4 shrink-0" />
                            {(isHovered || !isStudioPortal) && (
                                <span className={clsx(
                                    "transition-all duration-300 whitespace-nowrap overflow-hidden text-[12px] font-bold uppercase tracking-widest",
                                    isFixed ? (isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0") : "max-w-40 opacity-100"
                                )}>Log Out</span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )

    if (isFixed) return sidebarUI

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-[200] animate-in fade-in duration-300" onClick={onClose} />
            {sidebarUI}
        </>
    )
}

