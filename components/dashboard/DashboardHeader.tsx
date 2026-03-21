'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut } from 'lucide-react'
import Navigation from './Navigation'
import { signOut } from '@/app/auth/actions'
import clsx from 'clsx'
import Avatar from '@/components/shared/Avatar'
import { Menu, Search } from 'lucide-react'
import HeaderSearchPill from './HeaderSearchPill'

interface DashboardHeaderProps {
    profile: any
    studioData: any
    avatarUrl: string
    onOpenSidebar: () => void
}

export default function DashboardHeader({ profile, studioData, avatarUrl, onOpenSidebar }: DashboardHeaderProps) {
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
            "fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-b border-border-grey bg-white/95 backdrop-blur-md px-4 md:px-12",
            isScrolled ? "h-16 md:h-20 shadow-tight" : "h-[60px] md:h-28 lg:h-32"
        )}>
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
                {/* Desktop and Mobile Shared Left: Hamburger + Logo */}
                <div className="flex items-center gap-2 sm:gap-6">
                    <button 
                        onClick={onOpenSidebar}
                        className="p-3 rounded-xl hover:bg-off-white text-burgundy/40 hover:text-burgundy transition-all active:scale-95"
                        aria-label="Open Menu"
                    >
                        <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    <Link href="/welcome" aria-label="Go to Welcome Dashboard" className="group">
                        <Image
                            src="/logo4.png"
                            alt="Studio Vault"
                            width={140}
                            height={60}
                            priority
                            className={clsx(
                                "w-auto object-contain transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105",
                                isScrolled ? "h-8 sm:h-10" : "h-10 sm:h-14"
                            )}
                        />
                    </Link>
                </div>

                {/* Center: Search Pill (Desktop Search Only) */}
                {isCustomer && <HeaderSearchPill />}

                {/* Right: Profile / Notifications */}
                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-3 pl-4 border-l border-border-grey shrink-0">
                        <div className="hidden sm:flex flex-col items-end text-right">
                            <p className="text-xs font-bold text-burgundy leading-tight mb-0.5 whitespace-nowrap">
                                {profile?.role === 'studio' ? (studioData?.name || profile?.full_name || 'Studio') : (profile?.full_name || 'Partner')}
                            </p>
                            <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-widest leading-none">
                                {profile?.role === 'instructor' ? 'INSTRUCTOR' :
                                    profile?.role === 'studio' ? 'STUDIO' :
                                        profile?.role || 'USER'}
                            </p>
                        </div>
                        <Link
                            href={
                                profile?.role === 'customer' ? '/customer/profile' :
                                    profile?.role === 'instructor' ? '/instructor/profile' :
                                        profile?.role === 'studio' ? '/studio/settings' :
                                            profile?.role === 'admin' ? '/admin' :
                                                '#'
                            }
                            aria-label="View and Edit Profile"
                            className="transition-all hover:scale-110 block"
                        >
                            <Avatar
                                src={avatarUrl}
                                fallbackName={profile?.full_name || (profile?.role === 'studio' ? studioData?.name : null)}
                                size={40}
                                className="border-2 border-burgundy/20 shadow-tight hover:border-burgundy/40"
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    )
}
