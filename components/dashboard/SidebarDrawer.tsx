'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
    X, Home, Search, Calendar, Wallet, User, LogOut, 
    LayoutDashboard, DollarSign, History, Box, Building2, Gift, ShieldCheck, Users 
} from 'lucide-react'
import { clsx } from 'clsx'
import { signOut } from '@/app/auth/actions'
import Avatar from '@/components/shared/Avatar'

interface SidebarDrawerProps {
    isOpen: boolean
    onClose: () => void
    role: string
    profile: any
    studioData: any
    avatarUrl: string
}

export default function SidebarDrawer({ isOpen, onClose, role, profile, studioData, avatarUrl }: SidebarDrawerProps) {
    const pathname = usePathname()

    if (!isOpen) return null

    const isCustomerMode = role === 'customer' || pathname?.startsWith('/customer') || pathname?.startsWith('/instructors') || pathname?.startsWith('/studios')

    const linkClass = (isActive: boolean) =>
        clsx(
            "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group",
            isActive 
                ? "bg-forest/10 text-forest shadow-tight" 
                : "text-burgundy/60 hover:bg-stone-50 hover:text-burgundy"
        )

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-burgundy/20 backdrop-blur-sm z-[200] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed top-0 left-0 bottom-0 w-[320px] bg-white shadow-2xl z-[201] animate-in slide-in-from-left duration-500 ease-out flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-burgundy/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar
                            src={avatarUrl}
                            fallbackName={profile?.full_name || (role === 'studio' ? studioData?.name : null)}
                            size={48}
                            className="border-2 border-burgundy/10 shadow-tight"
                        />
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-burgundy truncate max-w-[150px]">
                                {profile?.role === 'studio' ? (studioData?.name || 'Studio') : (profile?.full_name || 'Partner')}
                            </span>
                            <span className="text-[9px] font-bold text-burgundy/30 uppercase tracking-[0.2em]">
                                {role?.toUpperCase() || 'USER'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full hover:bg-stone-50 text-burgundy/20 hover:text-burgundy transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                    {/* Role-Specific Secondary Actions */}
                    <div className="mb-4 flex flex-col gap-2">
                        {role === 'instructor' && !isCustomerMode && (
                            <Link 
                                href="/customer?mode=rent" 
                                onClick={onClose}
                                className="mx-2 p-4 bg-forest/5 border-2 border-forest/20 text-forest rounded-2xl flex items-center gap-3 hover:bg-forest/10 transition-all font-black text-[11px] uppercase tracking-wider"
                            >
                                <Building2 className="w-4 h-4" />
                                Rent a Studio
                            </Link>
                        )}
                        {role === 'instructor' && isCustomerMode && (
                            <Link 
                                href="/instructor" 
                                onClick={onClose}
                                className="mx-2 p-4 bg-burgundy text-white rounded-2xl flex items-center gap-3 hover:brightness-110 transition-all font-black text-[11px] uppercase tracking-wider shadow-lg"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Return to Instructor Mode
                            </Link>
                        )}
                        {role === 'studio' && isCustomerMode && (
                            <Link 
                                href="/studio" 
                                onClick={onClose}
                                className="mx-2 p-4 bg-burgundy text-white rounded-2xl flex items-center gap-3 hover:brightness-110 transition-all font-black text-[11px] uppercase tracking-wider shadow-lg"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Return to Studio Mode
                            </Link>
                        )}
                    </div>

                    {/* Standard Navigation */}
                    <Link href="/welcome" onClick={onClose} className={linkClass(pathname === '/welcome')}>
                        <Home className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Dashboard</span>
                    </Link>

                    {isCustomerMode ? (
                        <>
                            <Link href="/customer" onClick={onClose} className={linkClass(pathname === '/customer')}>
                                <Search className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Find a Class</span>
                            </Link>
                            <Link href="/customer/bookings" onClick={onClose} className={linkClass(pathname === '/customer/bookings')}>
                                <Calendar className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">My Sessions</span>
                            </Link>
                            <Link href="/customer/wallet" onClick={onClose} className={linkClass(pathname.startsWith('/customer/wallet'))}>
                                <Wallet className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Wallet</span>
                            </Link>
                            <Link href="/customer/profile" onClick={onClose} className={linkClass(pathname === '/customer/profile')}>
                                <User className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Profile</span>
                            </Link>
                        </>
                    ) : (
                        <>
                             {role === 'instructor' && (
                                <>
                                    <Link href="/instructor/schedule" onClick={onClose} className={linkClass(pathname.startsWith('/instructor/schedule'))}>
                                        <Calendar className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Schedule</span>
                                    </Link>
                                    <Link href="/instructor/sessions" onClick={onClose} className={linkClass(pathname.startsWith('/instructor/sessions'))}>
                                        <History className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">History</span>
                                    </Link>
                                    <Link href="/instructor/earnings" onClick={onClose} className={linkClass(pathname.startsWith('/instructor/earnings'))}>
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Earnings</span>
                                    </Link>
                                </>
                            )}
                            {role === 'studio' && (
                                <>
                                    <Link href="/studio/schedule" onClick={onClose} className={linkClass(pathname.startsWith('/studio/schedule'))}>
                                        <Calendar className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Schedule</span>
                                    </Link>
                                    <Link href="/studio/earnings" onClick={onClose} className={linkClass(pathname.startsWith('/studio/earnings'))}>
                                        <DollarSign className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Earnings</span>
                                    </Link>
                                    <Link href="/studio/history" onClick={onClose} className={linkClass(pathname.startsWith('/studio/history'))}>
                                        <History className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">History</span>
                                    </Link>
                                    <Link href="/studio/settings" onClick={onClose} className={linkClass(pathname.startsWith('/studio/settings'))}>
                                        <Box className="w-5 h-5" />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Settings</span>
                                    </Link>
                                </>
                            )}
                        </>
                    )}

                    <Link href="/referral" onClick={onClose} className={linkClass(pathname === '/referral')}>
                        <Gift className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Referral</span>
                    </Link>

                    {role === 'admin' && (
                        <>
                            <div className="h-px bg-burgundy/5 my-4 mx-6" />
                            <Link href="/admin" onClick={onClose} className={linkClass(pathname === '/admin')}>
                                <ShieldCheck className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Admin Panel</span>
                            </Link>
                            <Link href="/admin/partners" onClick={onClose} className={linkClass(pathname.startsWith('/admin/partners'))}>
                                <Users className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Manage Partners</span>
                            </Link>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-burgundy/5">
                    <form action={signOut}>
                        <button className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all font-black text-[11px] uppercase tracking-[0.2em]">
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}
