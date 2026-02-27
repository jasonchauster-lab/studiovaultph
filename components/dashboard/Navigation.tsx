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
            "text-sm font-medium flex items-center gap-2 transition-all py-2 md:py-0 relative group",
            isActive ? "text-rose-gold font-bold" : "text-charcoal-600 hover:text-rose-gold"
        );

    const navLinks = (
        <>
            {isCustomerMode ? (
                <>
                    <Link href="/customer" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/customer')}>
                        <Search className="w-4 h-4" />
                        Find a Class
                        {pathname === '/customer' && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/bookings" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/customer/bookings')}>
                        <Calendar className="w-4 h-4" />
                        My Sessions
                        {pathname === '/customer/bookings' && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/profile" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/customer/profile')}>
                        <User className="w-4 h-4" />
                        Profile
                        {pathname === '/customer/profile' && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/wallet" onClick={() => setMobileOpen(false)} className={linkClass(pathname?.startsWith('/customer/wallet'))}>
                        <Wallet className="w-4 h-4" />
                        My Wallet
                        {pathname?.startsWith('/customer/wallet') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                    </Link>
                    <Link href="/customer/payout" onClick={() => setMobileOpen(false)} className={linkClass(pathname?.startsWith('/customer/payout'))}>
                        <ArrowUpRight className="w-4 h-4" />
                        Withdraw
                        {pathname?.startsWith('/customer/payout') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                    </Link>

                    {role && role !== 'customer' && (
                        <div className="h-px w-full md:h-4 md:w-px bg-cream-300 my-1 md:my-0 md:mx-2" />
                    )}
                    {role === 'instructor' && (
                        <Link href="/instructor" onClick={() => setMobileOpen(false)} className="text-xs font-serif text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 border border-cream-200 px-3 py-1.5 rounded-full hover:bg-cream-100 transition-colors">
                            <LayoutDashboard className="w-3 h-3" />
                            Instructor Dashboard
                        </Link>
                    )}
                    {role === 'studio' && (
                        <Link href="/studio" onClick={() => setMobileOpen(false)} className="text-xs font-serif text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 border border-cream-200 px-3 py-1.5 rounded-full hover:bg-cream-100 transition-colors">
                            <LayoutDashboard className="w-3 h-3" />
                            Studio Dashboard
                        </Link>
                    )}
                    {role === 'admin' && (
                        <Link href="/admin" onClick={() => setMobileOpen(false)} className="text-xs font-serif text-charcoal-500 hover:text-charcoal-900 flex items-center gap-1 border border-cream-200 px-3 py-1.5 rounded-full hover:bg-cream-100 transition-colors">
                            <ShieldCheck className="w-3 h-3" />
                            Admin Dashboard
                        </Link>
                    )}
                </>
            ) : (
                <>
                    {role === 'instructor' && (
                        <>
                            <Link href="/instructor/earnings" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/instructor/earnings'))}>
                                <DollarSign className="w-4 h-4" />
                                Earnings
                                {pathname.startsWith('/instructor/earnings') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                            <Link href="/instructor/sessions" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/instructor/sessions'))}>
                                <Calendar className="w-4 h-4" />
                                My Sessions
                                {pathname.startsWith('/instructor/sessions') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                            <Link href="/instructor/schedule" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/instructor/schedule'))}>
                                <Calendar className="w-4 h-4" />
                                My Schedule
                                {pathname.startsWith('/instructor/schedule') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                            <Link href="/instructor/profile" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/instructor/profile'))}>
                                <User className="w-4 h-4" />
                                Profile
                                {pathname.startsWith('/instructor/profile') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                        </>
                    )}

                    {role === 'studio' && (
                        <>
                            <Link href="/studio" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/studio')}>
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                                {pathname === '/studio' && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                            <Link href="/studio/earnings" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/studio/earnings'))}>
                                <DollarSign className="w-4 h-4" />
                                Earnings
                                {pathname.startsWith('/studio/earnings') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                            <Link href="/studio/history" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/studio/history'))}>
                                <History className="w-4 h-4" />
                                Rental History
                                {pathname.startsWith('/studio/history') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                            <Link href="/studio/settings" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/studio/settings'))}>
                                <Box className="w-4 h-4" />
                                Settings & Equipment
                                {pathname.startsWith('/studio/settings') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-rose-gold rounded-full" />}
                            </Link>
                        </>
                    )}

                    {role === 'admin' && (
                        <>
                            <Link href="/admin" onClick={() => setMobileOpen(false)} className={linkClass(pathname === '/admin')}>
                                <ShieldCheck className="w-4 h-4" />
                                Admin
                                <SupportNotificationBadge />
                            </Link>
                            <Link href="/admin/partners" onClick={() => setMobileOpen(false)} className={linkClass(pathname.startsWith('/admin/partners'))}>
                                <Users className="w-4 h-4" />
                                Partners
                            </Link>
                        </>
                    )}
                </>
            )}

            {/* Log out — shown in mobile drawer only */}
            <div className="md:hidden pt-2 border-t border-cream-100 mt-2">
                <form action={signOut}>
                    <button className="flex items-center gap-2 text-sm font-medium text-charcoal-600 hover:text-red-600 transition-colors py-2">
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
            <nav className="hidden md:flex items-center gap-6">
                {navLinks}
            </nav>

            {/* Mobile hamburger button */}
            <button
                className="md:hidden p-2 rounded-lg text-charcoal-600 hover:bg-cream-100 transition-colors"
                onClick={() => setMobileOpen(prev => !prev)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-cream-200 shadow-lg z-50 px-6 py-4 flex flex-col gap-1">
                    {navLinks}
                </div>
            )}
        </>
    )
}
