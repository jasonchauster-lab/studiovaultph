'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut } from 'lucide-react'
import Navigation from './Navigation'
import { signOut } from '@/app/auth/actions'
import clsx from 'clsx'

interface DashboardHeaderProps {
    profile: any
    studioData: any
    avatarUrl: string
}

export default function DashboardHeader({ profile, studioData, avatarUrl }: DashboardHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            // Increase threshold for better stability (hysteresis)
            setIsScrolled(window.scrollY > 40)
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header className={clsx(
            "px-6 sm:px-12 fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-b border-border-grey bg-white/95 backdrop-blur-sm",
            isScrolled ? "h-20 shadow-tight" : "h-28 sm:h-32"
        )}>
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-8 h-full">
                    <Link href="/welcome" aria-label="Go to Welcome Dashboard" className="flex items-center gap-0 group h-full">
                        <div className="relative flex items-center">
                            <Image
                                src="/logo.png"
                                alt="StudioVault Logo"
                                width={120}
                                height={120}
                                priority
                                className={clsx(
                                    "object-contain transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                                    isScrolled ? "w-16 h-16" : "w-28 h-28"
                                )}
                            />
                        </div>
                        <span className={clsx(
                            "font-serif font-bold text-charcoal tracking-tighter -ml-8 whitespace-nowrap hidden lg:block transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 uppercase text-lg",
                            isScrolled ? "opacity-90 scale-90 translate-x-2" : "opacity-100 scale-100"
                        )}>
                            Studio Vault PH
                        </span>
                    </Link>
                    <nav className="hidden md:block">
                        <Navigation role={profile?.role} />
                    </nav>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="md:hidden">
                        <Navigation role={profile?.role} />
                    </div>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/20 shrink-0">
                        <div className="hidden sm:flex flex-col items-end text-right">
                            <p className="text-xs font-bold text-charcoal leading-tight mb-0.5 whitespace-nowrap">
                                {profile?.role === 'studio' ? (studioData?.name || profile?.full_name || 'Studio') : (profile?.full_name || 'Partner')}
                            </p>
                            <p className="text-[10px] text-forest font-bold uppercase tracking-widest leading-none">
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
                            className="w-10 h-10 rounded-lg overflow-hidden border border-border-grey shadow-tight transition-transform hover:scale-110 block"
                        >
                            <Image
                                src={avatarUrl}
                                alt="User Profile"
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                            />
                        </Link>
                        <form action={signOut} className="hidden sm:block">
                            <button
                                className="p-2 text-slate hover:text-red-500 transition-colors"
                                title="Log Out"
                                aria-label="Log Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </header>
    )
}
