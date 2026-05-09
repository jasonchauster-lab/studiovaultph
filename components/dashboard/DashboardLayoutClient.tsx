'use client'

import { useState, useEffect } from 'react'
import DashboardHeader from './DashboardHeader'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import SidebarDrawer from './SidebarDrawer'
import MobileTabBar from './MobileTabBar'
import ChatWidget from '@/components/ai/ChatWidget'
import UserPresenceTracker from '@/components/shared/UserPresenceTracker'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import CommandPalette from '@/components/shared/CommandPalette'
import clsx from 'clsx'
import SecondarySidebar from './SecondarySidebar'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { getActivePrimaryId, getSecondaryMenus, getPrimaryNav } from '@/lib/navigation-config'
import { AlertCircle, FileWarning, Wallet, XCircle, ChevronRight, ExternalLink } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

interface DashboardLayoutClientProps {
    children: React.ReactNode
    user: any
    profile: any
    studioData: any
    avatarUrl: string
    isStudioPortal?: boolean
    outlets: any[]
    referralConfig?: any
    studioMembership?: any
}

export default function DashboardLayoutClient({
    children,
    user,
    profile,
    studioData,
    avatarUrl,
    isStudioPortal,
    outlets,
    referralConfig,
    studioMembership
}: DashboardLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()

    // Ensure mobile sidebar closes when switching to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) { // lg breakpoint
                setIsSidebarOpen(false)
            }
        }
        
        // Custom event listener for internal components (like the immersive builder)
        const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev)
        window.addEventListener('side-vault-toggle-sidebar', handleToggleSidebar)
        window.addEventListener('resize', handleResize)
        
        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('side-vault-toggle-sidebar', handleToggleSidebar)
        }
    }, [])

    const parts = pathname.split('/').filter(Boolean)
    const reservedPaths = ['schedule', 'services', 'pricing', 'customers', 'sales', 'reports', 'loyalty-insights', 'marketing', 'promo', 'online-store', 'management', 'scan', 'settings', 'website', 'earnings', 'history', 'staff', 'inventory', 'analytics', 'automation', 'referral', 'welcome', 'onboarding']
    const outletId = parts[0] === 'studio' && parts[1] && !reservedPaths.includes(parts[1]) ? parts[1] : undefined
    
    const isAdmin = pathname.startsWith('/admin')
    const isOnboarding = pathname.includes('/onboarding') || pathname === '/welcome' || pathname.startsWith('/studio/register') || pathname === '/identity-conflict'
    const activePrimaryId = getActivePrimaryId(pathname)
    const primaryNav = getPrimaryNav(outletId, !!isStudioPortal, profile?.role)
    const secondaryMenus = getSecondaryMenus(outletId, !!isStudioPortal)
    const hasSecondaryMenu = !!(isStudioPortal && activePrimaryId && secondaryMenus[activePrimaryId])
    
    // Hide sidebar for customers on studio portals to maintain white-label experience
    const hideSidebar = isStudioPortal && profile?.role === 'customer'

    return (
        <TooltipProvider>
            <div className={clsx(
                "min-h-screen flex relative transition-colors duration-200",
                isStudioPortal ? "bg-[#faf9f6]" : "bg-white"
            )}>
                {/* Desktop Fixed Sidebar */}
                {!isOnboarding && !isAdmin && !hideSidebar && (
                    <div className="hidden lg:block relative z-[100001] isolate">
                        <SidebarDrawer
                            isOpen={true}
                            onClose={() => {}}
                            role={profile?.role}
                            profile={profile}
                            studioData={studioData}
                            outlets={outlets}
                            avatarUrl={avatarUrl}
                            isStudioPortal={isStudioPortal}
                            isFixed={true}
                        />
                        {hasSecondaryMenu && (
                            <SecondarySidebar isVisible={true} isStudioPortal={isStudioPortal} />
                        )}
                    </div>
                )}

                <div className={clsx(
                    "flex-1 flex flex-col min-w-0 transition-all duration-200",
                    (isOnboarding || isAdmin || hideSidebar)
                        ? "lg:ml-0" 
                        : (hasSecondaryMenu
                            ? "lg:ml-[312px]" 
                            : "lg:ml-[72px]")
                )}>
                    {!isOnboarding && !isAdmin && (
                        isStudioPortal && profile?.role === 'customer' ? (
                            <StorefrontHeader 
                                studioName={studioData?.name}
                                logoUrl={studioData?.website_config?.header?.logoUrl || studioData?.logo_url}
                                theme={studioData?.website_config?.theme || { primaryColor: '#2D3282' }}
                                config={studioData?.website_config || {}}
                                profile={profile}
                                avatarUrl={avatarUrl}
                                referralConfig={referralConfig}
                                studioMembership={studioMembership}
                            />
                        ) : (
                            <DashboardHeader
                                profile={profile}
                                studioData={studioData}
                                avatarUrl={avatarUrl}
                                onOpenSidebar={() => setIsSidebarOpen(true)}
                                isStudioPortal={isStudioPortal}
                                outlets={outlets}
                            />
                        )
                    )}

                    {!isOnboarding && !isAdmin && !hideSidebar && (
                        <SidebarDrawer
                            isOpen={isSidebarOpen}
                            onClose={() => setIsSidebarOpen(false)}
                            role={profile?.role}
                            profile={profile}
                            studioData={studioData}
                            outlets={outlets}
                            avatarUrl={avatarUrl}
                            isStudioPortal={isStudioPortal}
                        />
                    )}

                    <main className={clsx(
                        "flex-1 pb-32 relative transition-all duration-200",
                        (pathname.includes('/online-store') || pathname.includes('/website')) ? "z-[60]" : "z-10"
                    )}>
                        <div className={clsx(
                            "mx-auto px-4 sm:px-8 lg:px-12",
                            pathname.includes('/online-store') ? "max-w-none !px-0" : "max-w-[1600px]"
                        )}>
                            {/* Suspension Banner */}
                            {profile?.is_suspended && studioData?.is_public !== false && !isOnboarding && (
                                <div className="mb-8 relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-rose-500/20 to-orange-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 bg-white border border-rose-100 rounded-3xl shadow-xl overflow-hidden">
                                        {/* Glassmorphic Accent */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                                        
                                        <div className="flex items-start gap-6 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-200 shrink-0">
                                                <AlertCircle className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-serif font-bold text-zinc-900 mb-1">Marketplace Listing Offline</h3>
                                                <p className="text-zinc-500 text-sm max-w-xl leading-relaxed">
                                                    Your studio is currently hidden from the public marketplace. However, your **Studio CMS remains fully functional**—you can still create slots, manage private bookings, and run your business dashboard.
                                                </p>
                                                
                                                {/* Specific Reasons */}
                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    {profile?.gov_id_expiry && new Date(profile.gov_id_expiry) < new Date() && (
                                                        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-full text-xs font-bold border border-rose-100">
                                                            <FileWarning className="w-3.5 h-3.5" />
                                                            Government ID Expired
                                                        </div>
                                                    )}
                                                    {profile?.available_balance !== undefined && profile.available_balance < 0 && (
                                                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold border border-amber-100">
                                                            <Wallet className="w-3.5 h-3.5" />
                                                            Outstanding Balance (₱{Math.abs(profile.available_balance)})
                                                        </div>
                                                    )}
                                                    {(!profile?.gov_id_expiry || new Date(profile.gov_id_expiry) >= new Date()) && (profile?.available_balance === undefined || profile.available_balance >= 0) && (
                                                        <div className="flex items-center gap-2 bg-zinc-50 text-zinc-700 px-3 py-1.5 rounded-full text-xs font-bold border border-zinc-200">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Administrative Hold
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
                                            <Link 
                                                href="/studio/settings"
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl text-sm font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-zinc-200"
                                            >
                                                Update Documents
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                            <button 
                                                onClick={() => window.open('mailto:support@studiovault.co')}
                                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-zinc-600 border border-zinc-200 rounded-2xl text-sm font-bold hover:bg-zinc-50 transition-all active:scale-95"
                                            >
                                                Contact Support
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <ErrorBoundary>
                                {children}
                            </ErrorBoundary>
                        </div>
                    </main>

                    {!isAdmin && <MobileTabBar onOpenMenu={() => setIsSidebarOpen(true)} />}
                    
                    {isStudioPortal && profile?.role === 'customer' ? (
                        <div className="mt-20">
                            <StorefrontFooter 
                                studio={studioData} 
                                config={studioData?.website_config || {}} 
                                theme={studioData?.website_config?.theme || { primaryColor: '#2D3282' }} 
                            />
                        </div>
                    ) : (
                        <footer className="m-4 sm:m-8 p-10 bg-white border border-zinc-100 rounded-[2rem] shadow-sm hidden md:block">
                            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                                    <Image 
                                        src="/logo4.png" 
                                        alt="Studio Vault" 
                                        width={140} 
                                        height={40} 
                                        className="h-8 w-auto object-contain grayscale opacity-30" 
                                    />
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">© 2026 STUDIO VAULT. ALL RIGHTS RESERVED.</p>
                                </div>
                            </div>
                        </footer>
                    )}
                </div>

                {user && profile?.role === 'studio' && pathname.startsWith('/studio') && (
                    <ChatWidget userEmail={user.email} userId={user.id} />
                )}
                {user && <UserPresenceTracker />}
                <CommandPalette userRole={profile?.role} />
                <PWAInstallPrompt />
            </div>
        </TooltipProvider>
    )
}
