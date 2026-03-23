'use client'

import { useState } from 'react'
import DashboardHeader from './DashboardHeader'
import SidebarDrawer from './SidebarDrawer'
import MobileTabBar from './MobileTabBar'
import SupportChatWrapper from '@/components/support/SupportChatWrapper'
import UserPresenceTracker from '@/components/shared/UserPresenceTracker'
import Image from 'next/image'
import Link from 'next/link'
import CommandPalette from '@/components/shared/CommandPalette'

interface DashboardLayoutClientProps {
    children: React.ReactNode
    user: any
    profile: any
    studioData: any
    avatarUrl: string
}

export default function DashboardLayoutClient({
    children,
    user,
    profile,
    studioData,
    avatarUrl
}: DashboardLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="min-h-screen bg-[#faf9f6] flex flex-col relative overflow-hidden">
            <DashboardHeader
                profile={profile}
                studioData={studioData}
                avatarUrl={avatarUrl}
                onOpenSidebar={() => setIsSidebarOpen(true)}
            />

            <SidebarDrawer
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                role={profile?.role}
                profile={profile}
                studioData={studioData}
                avatarUrl={avatarUrl}
            />

            <main className="flex-1 pt-24 sm:pt-32 pb-32 sm:pb-32 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
                    {children}
                </div>
            </main>

            <MobileTabBar onOpenMenu={() => setIsSidebarOpen(true)} />

            <footer className="atelier-card m-4 sm:m-8 p-10 bg-white border border-burgundy/5 shadow-tight hidden md:block">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                        <Image 
                            src="/logo4.png" 
                            alt="Studio Vault" 
                            width={160} 
                            height={48} 
                            className="h-10 md:h-12 w-auto object-contain" 
                        />
                        <p className="text-[10px] font-bold text-burgundy uppercase tracking-widest">© 2026 STUDIO VAULT. ALL RIGHTS RESERVED.</p>
                    </div>
                    <div className="flex gap-8">
                        <Link href="/terms-of-service" className="text-[10px] font-bold text-burgundy hover:text-forest transition-all uppercase tracking-widest underline decoration-forest/0 hover:decoration-forest underline-offset-8">Terms of Service</Link>
                        <Link href="/privacy" className="text-[10px] font-bold text-burgundy hover:text-forest transition-all uppercase tracking-widest underline decoration-forest/0 hover:decoration-forest underline-offset-8">Privacy Policy</Link>
                        <Link href="/support" className="text-[10px] font-bold text-burgundy hover:text-forest transition-all uppercase tracking-widest underline decoration-forest/0 hover:decoration-forest underline-offset-8">Support</Link>
                    </div>
                </div>
            </footer>

            {user && profile?.role !== 'admin' && <SupportChatWrapper userId={user.id} />}
            {user && <UserPresenceTracker />}
            <CommandPalette userRole={profile?.role} />
        </div>
    )
}
