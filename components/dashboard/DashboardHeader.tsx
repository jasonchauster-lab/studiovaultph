'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navigation from './Navigation'
import { signOut } from '@/app/(marketplace)/auth/actions'
import clsx from 'clsx'
import Avatar from '@/components/shared/Avatar'
import { Menu, Search } from 'lucide-react'
import HeaderSearchPill from './HeaderSearchPill'
import NotificationCenter from '@/components/shared/NotificationCenter'
import QuickActionMenu from './QuickActionMenu'
import StorefrontNav from './StorefrontNav'
import ProfileDropdown from './ProfileDropdown'

interface DashboardHeaderProps {
    profile: any
    studioData: any
    avatarUrl: string
    onOpenSidebar: () => void
    isStudioPortal?: boolean
    outlets?: any[]
}

export default function DashboardHeader({ profile, studioData, avatarUrl, onOpenSidebar, isStudioPortal, outlets }: DashboardHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 40)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isCustomer = profile?.role === 'customer'

    return (
        <header className={clsx(
            "relative z-[50] border-b border-outline-variant bg-surface px-4 md:px-8 lg:px-12 h-16 lg:h-20 transition-colors duration-300"
        )}>
            <div className="h-full flex items-center justify-between gap-4">
                {/* Mobile Only Logo/Hamburger */}
                <div className="flex lg:hidden items-center gap-4">
                    <button 
                        onClick={onOpenSidebar}
                        className="p-2 rounded-lg hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-all"
                        aria-label="Open Menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <Link href={isStudioPortal ? `/s/${studioData?.slug}` : "/welcome"} className="block lg:hidden">
                        <Image 
                            src={isStudioPortal && studioData?.logo_url ? studioData.logo_url : "/logo4.png"} 
                            alt="Logo" 
                            width={100} 
                            height={30} 
                            className="h-6 w-auto object-contain" 
                        />
                    </Link>
                </div>

                {/* Desktop Logo (Shown only on Studio Portals for Customers because sidebar is hidden) */}
                {isStudioPortal && isCustomer && (
                    <div className="hidden lg:flex items-center gap-4">
                        <Link href={`/s/${studioData?.slug}`}>
                            <Image 
                                src={studioData?.logo_url || "/logo4.png"} 
                                alt="Logo" 
                                width={120} 
                                height={40} 
                                className="h-8 w-auto object-contain" 
                            />
                        </Link>
                    </div>
                )}

                {/* Left Side: Contextual Info (Optional Search) */}
                <div className="hidden lg:flex items-center justify-center gap-4 flex-1">
                     {isStudioPortal ? (
                         !isCustomer ? (
                             <QuickActionMenu />
                         ) : (
                             <StorefrontNav 
                                 links={studioData?.website_config?.navigation?.header} 
                                 slug={studioData?.slug} 
                             />
                         )
                     ) : (
                         profile?.role !== 'studio' && <HeaderSearchPill />
                     )}
                </div>

                {/* Right Side: Account Actions */}
                <div className="flex items-center gap-4 lg:gap-8">
                    <div className="flex items-center gap-3 pr-4 border-r border-zinc-100 hidden sm:flex">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg">
                            <Image 
                                src="https://flagcdn.com/ph.svg" 
                                alt="PH" 
                                width={16} 
                                height={12} 
                                className="rounded-sm" 
                                style={{ height: 'auto' }} 
                                unoptimized={true}
                            />
                            <span className="text-[11px] font-bold text-zinc-600">Philippines</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationCenter userId={profile?.id} />
                    </div>

                    <ProfileDropdown 
                        profile={profile}
                        avatarUrl={avatarUrl}
                    />
                </div>
            </div>
        </header>
    )
}

