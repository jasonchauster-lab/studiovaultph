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
            "glass-navbar px-4 sm:px-6 fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
            isScrolled ? "h-16 shadow-md" : "h-24 sm:h-28"
        )}>
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-8 h-full">
                    <Link href="/welcome" className="flex items-center gap-0 group h-full">
                        <div className="relative flex items-center">
                            <Image
                                src="/logo.png"
                                alt="StudioVault Logo"
                                width={120}
                                height={120}
                                className={clsx(
                                    "object-contain transition-all duration-500 ease-in-out",
                                    isScrolled ? "w-16 h-16" : "w-24 h-24"
                                )}
                            />
                        </div>
                        <span className={clsx(
                            "font-serif font-bold text-charcoal tracking-tight -ml-6 whitespace-nowrap hidden lg:block transition-all duration-500 ease-in-out shrink-0",
                            isScrolled ? "opacity-90 scale-95" : "opacity-100 scale-100"
                        )}>
                            StudioVaultPH
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
                            <p className="text-[10px] text-sage font-bold uppercase tracking-widest leading-none">
                                {profile?.role === 'instructor' ? 'Instructor' :
                                    profile?.role === 'studio' ? 'Studio' :
                                        profile?.role || 'User'}
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
                            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-cloud transition-transform hover:scale-110 block"
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
                            <button className="p-2 text-sage hover:text-red-500 transition-colors" title="Log Out">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </header>
    )
}
