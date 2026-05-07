'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { User, LogOut, ChevronDown, Sparkles } from 'lucide-react'
import { signOut } from '@/app/(marketplace)/auth/actions'
import clsx from 'clsx'
import Avatar from '@/components/shared/Avatar'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

interface ProfileDropdownProps {
    profile: any
    avatarUrl: string
}

export default function ProfileDropdown({ profile, avatarUrl }: ProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [greeting, setGreeting] = useState("Good morning")
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { tipsEnabled, toggleTips } = useOnboarding()

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour >= 12 && hour < 17) setGreeting("Good afternoon")
        else if (hour >= 17) setGreeting("Good evening")
        else setGreeting("Good morning")
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const firstName = profile?.full_name?.split(' ')[0] || (profile?.role === 'customer' ? 'Student' : 'Partner')
    const roleLabel = profile?.role === 'customer' ? 'Customer' : (profile?.role === 'instructor' ? 'Instructor' : 'Partner')
    
    // Dynamic settings path based on role
    const getSettingsPath = () => {
        switch (profile?.role) {
            case 'customer': return '/customer/profile';
            case 'instructor': return '/instructor/profile';
            case 'admin': return '/admin';
            default: return '/studio/settings';
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Container (Matches Design) */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-xl transition-all h-[48px]",
                    isOpen ? "bg-zinc-50" : "hover:bg-zinc-50"
                )}
            >
                <Avatar
                    src={avatarUrl}
                    fallbackName={profile?.full_name}
                    size={36}
                    className="border border-zinc-100 ring-2 ring-white"
                />
                <div className="hidden sm:flex flex-col items-start whitespace-nowrap">
                    <span className="text-[14px] font-black text-zinc-900 leading-none mb-0.5">
                        {profile?.full_name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">
                        {roleLabel}
                    </span>
                </div>
                <ChevronDown className={clsx(
                    "w-4 h-4 text-zinc-400 transition-transform duration-300",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu (Matches Design) */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-[240px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-zinc-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    {/* Greeting Header */}
                    <div className="px-6 py-5 border-b border-zinc-50">
                        <h3 className="text-[15px] font-black text-zinc-900">
                            {greeting}, {firstName}
                        </h3>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                        <Link 
                            href={getSettingsPath()} 
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-zinc-50 transition-all group"
                        >
                            <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-white transition-all">
                                <User className="w-4 h-4 text-zinc-600" />
                            </div>
                            <span className="text-[13px] font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors">Profile</span>
                        </Link>

                        {/* Tutorial Toggle — Added for global tips control */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleTips(!tipsEnabled);
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-zinc-50 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-white transition-all">
                                    <Sparkles className={clsx("w-4 h-4 transition-colors", tipsEnabled ? "text-indigo-500" : "text-zinc-400")} />
                                </div>
                                <span className="text-[13px] font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors">Show Tutorials</span>
                            </div>
                            <div className={clsx(
                                "w-8 h-4 rounded-full transition-colors relative",
                                tipsEnabled ? "bg-indigo-500" : "bg-zinc-200"
                            )}>
                                <div className={clsx(
                                    "absolute top-1 left-1 w-2 h-2 rounded-full bg-white transition-transform",
                                    tipsEnabled && "translate-x-4"
                                )} />
                            </div>
                        </button>

                        <form action={signOut}>
                            <button 
                                type="submit"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-50 transition-all group text-left"
                            >
                                <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-white transition-all">
                                    <LogOut className="w-4 h-4 text-zinc-600 group-hover:text-red-500" />
                                </div>
                                <span className="text-[13px] font-bold text-zinc-600 group-hover:text-red-600 transition-colors">Logout</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>

    )
}

