'use client';

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Calendar, DollarSign, Box, History, ShieldCheck, User, LogOut, LayoutDashboard, Wallet, ArrowUpRight, Menu, X, Users } from 'lucide-react'
import clsx from 'clsx'
import SupportNotificationBadge from '@/components/admin/SupportNotificationBadge'
import { signOut } from '@/app/auth/actions'

interface NavigationProps {
    role?: string;
}

export default function Navigation({ role }: NavigationProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false)

    const isCustomerMode = pathname?.startsWith('/customer') || pathname?.startsWith('/instructors') || pathname?.startsWith('/studios');

    const linkClass = (isActive: boolean) =>
        clsx(
            "text-[10px] uppercase tracking-[0.25em] font-black flex items-center gap-2.5 transition-all py-2 md:py-0 relative group",
            isActive ? "text-charcoal" : "text-charcoal/30 hover:text-charcoal"
        );

    const navLinks = (
        <>
            {isCustomerMode ? (
                <>
                    <Link href="/customer" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/customer')}>
                        <Search className="w-3.5 h-3.5" />
                        Find a Class
                        {pathname === '/customer' && <span className="absolute -bottom-3 left-0 w-full h-0.5 bg-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/bookings" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/customer/bookings')}>
                        <Calendar className="w-3.5 h-3.5" />
                        Sessions
                        {pathname === '/customer/bookings' && <span className="absolute -bottom-3 left-0 w-full h-0.5 bg-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/wallet" onClick={() => setMobileOpen(false)} className={linkClass(pathname?.startsWith('/customer/wallet'))}>
                        <Wallet className="w-3.5 h-3.5" />
                        Wallet
                        {pathname?.startsWith('/customer/wallet') && <span className="absolute -bottom-3 left-0 w-full h-0.5 bg-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/profile" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/customer/profile')}>
                        <User className="w-3.5 h-3.5" />
                        My Profile
                        {pathname === '/customer/profile' && <span className="absolute -bottom-3 left-0 w-full h-0.5 bg-gold rounded-full" />}
                    </Link>

                    {role && role !== 'customer' && (
                        <div className="h-px w-full md:h-4 md:w-px bg-white/20 my-1 md:my-0 md:mx-2" />
                    )}
                    {role === 'instructor' && (
                        <Link href="/instructor" onClick={() => setMobileOpen(false)} className="link-secondary text-[10px] uppercase tracking-widest font-bold text-sage hover:text-sage-light flex items-center gap-1 border border-sage/20 bg-sage/5 px-4 py-1.5 rounded-[20px] transition-all hover:shadow-cloud">
                            <LayoutDashboard className="w-3 h-3" />
                            Instructor Mode
                        </Link>
                    )}
                    {role === 'studio' && (
                        <Link href="/studio" onClick={() => setMobileOpen(false)} className="link-secondary text-[10px] uppercase tracking-widest font-bold text-charcoal/60 hover:text-charcoal flex items-center gap-1 border border-white/40 bg-white/20 px-4 py-1.5 rounded-[20px] transition-all hover:shadow-cloud">
                            <LayoutDashboard className="w-3 h-3" />
                            Studio Dashboard
                        </Link>
                    )}
                </>
            ) : (
                <>
                    {role === 'instructor' && (
                        <>
                            <Link href="/instructor" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/instructor')}>
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Home
                                {pathname === '/instructor' && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                            <Link href="/instructor/earnings" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/instructor/earnings'))}>
                                <DollarSign className="w-3.5 h-3.5" />
                                Earnings
                                {pathname.startsWith('/instructor/earnings') && <span className="absolute -bottom-3 left-0 w-full h-0.5 bg-gold rounded-full" />}
                            </Link>
                            <Link href="/instructor/sessions" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/instructor/sessions'))}>
                                <Calendar className="w-3.5 h-3.5" />
                                Sessions
                                {pathname.startsWith('/instructor/sessions') && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                            <Link href="/instructor/profile" onClick={() => setMobileOpen(false)} className={linkClass(pathname.includes('/instructor/profile'))}>
                                <User className="w-3.5 h-3.5" />
                                Profile
                                {pathname.includes('/instructor/profile') && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                        </>
                    )}

                    {role === 'studio' && (
                        <>
                            <Link href="/studio" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/studio')}>
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Dashboard
                                {pathname === '/studio' && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                            <Link href="/studio/earnings" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/studio/earnings'))}>
                                <DollarSign className="w-3.5 h-3.5" />
                                Earnings
                                {pathname.startsWith('/studio/earnings') && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                            <Link href="/studio/history" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/studio/history'))}>
                                <History className="w-3.5 h-3.5" />
                                Rental History
                                {pathname.startsWith('/studio/history') && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                            <Link href="/studio/settings" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/studio/settings'))}>
                                <Box className="w-3.5 h-3.5" />
                                Settings
                                {pathname.startsWith('/studio/settings') && <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-sage rounded-full" />}
                            </Link>
                        </>
                    )}

                    {role === 'admin' && (
                        <>
                            <Link href="/admin" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/admin')}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Admin
                                <SupportNotificationBadge />
                            </Link>
                            <Link href="/admin/partners" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/admin/partners'))}>
                                <Users className="w-3.5 h-3.5" />
                                Partners
                            </Link>
                        </>
                    )}
                </>
            )}

            {/* Log out — shown in mobile drawer only */}
            <div className="md:hidden pt-4 border-t border-white/20 mt-4">
                <form action={signOut}>
                    <button className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-red-400 hover:text-red-500 transition-colors py-2">
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </form>
            </div>
        </>
    )

    return (
        <>
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-10">
                {navLinks}
            </nav>

            {/* Mobile hamburger button */}
            <button
                className="md:hidden p-2.5 rounded-[12px] bg-white/40 backdrop-blur-md border border-white/20 text-charcoal shadow-sm hover:shadow-md transition-all active:scale-95"
                onClick={() => setMobileOpen(prev => !prev)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden glass-card absolute top-full left-4 right-4 mt-2 p-6 flex flex-col gap-2 z-50">
                    {navLinks}
                </div>
            )}
        </>
    )
}
