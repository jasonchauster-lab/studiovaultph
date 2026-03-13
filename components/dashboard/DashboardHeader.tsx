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
            "fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-b border-border-grey bg-white/95 backdrop-blur-sm px-4 md:px-12",
            isScrolled ? "h-16 md:h-20 shadow-tight" : "h-[60px] md:h-28 lg:h-32"
        )}>
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
                {/* Mobile: 3-Section Layout */}
                <div className="flex md:hidden items-center justify-between w-full h-full relative">
                    {/* Left: Hamburger */}
                    <div className="flex-1 flex justify-start">
                        <Navigation role={profile?.role} />
                    </div>

                    {/* Center: Scaled Logo */}
                    <Link href="/welcome" aria-label="Go to Welcome Dashboard" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group">
                        <Image
                            src="/logo4.png"
                            alt="Studio Vault"
                            width={120}
                            height={40}
                            priority
                            className="h-10 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                        />
                    </Link>

                    {/* Right: Avatar */}
                    <div className="flex-1 flex justify-end">
                        <Link
                            href={
                                profile?.role === 'customer' ? '/customer/profile' :
                                    profile?.role === 'instructor' ? '/instructor/profile' :
                                        profile?.role === 'studio' ? '/studio/settings' :
                                            profile?.role === 'admin' ? '/admin' :
                                                '#'
                            }
                            aria-label="View and Edit Profile"
                            className="w-10 h-10 rounded-full overflow-hidden border-2 border-burgundy/20 shadow-tight transition-all hover:scale-110 hover:border-burgundy/40 block"
                        >
                            <Image
                                src={avatarUrl}
                                alt="User Profile"
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                            />
                        </Link>
                    </div>
                </div>

                {/* Desktop: Standard Layout */}
                <div className="hidden md:flex items-center justify-between w-full h-full">
                    <div className="flex items-center gap-8 h-full">
                        <Link href="/welcome" aria-label="Go to Welcome Dashboard" className="flex items-center pl-6 group h-full">
                            <Image
                                src="/logo4.png"
                                alt="Studio Vault"
                                width={180}
                                height={80}
                                priority
                                className={clsx(
                                    "w-auto object-contain transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105",
                                    isScrolled ? "h-14" : "h-16 md:h-20"
                                )}
                            />
                        </Link>
                        <nav className="hidden md:block">
                            <Navigation role={profile?.role} />
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-3 pl-4 border-l border-border-grey shrink-0">
                            <div className="hidden sm:flex flex-col items-end text-right">
                                <p className="text-xs font-bold text-burgundy leading-tight mb-0.5 whitespace-nowrap">
                                    {profile?.role === 'studio' ? (studioData?.name || profile?.full_name || 'Studio') : (profile?.full_name || 'Partner')}
                                </p>
                                <p className="text-[10px] text-muted-burgundy font-bold uppercase tracking-widest leading-none">
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
                                className="w-10 h-10 rounded-full overflow-hidden border-2 border-burgundy/20 shadow-tight transition-all hover:scale-110 hover:border-burgundy/40 block"
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
                                    className="p-2 text-muted-burgundy hover:text-red-500 transition-colors"
                                    title="Log Out"
                                    aria-label="Log Out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
