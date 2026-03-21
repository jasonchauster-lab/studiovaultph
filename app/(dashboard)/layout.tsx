'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import UserPresenceTracker from '@/components/shared/UserPresenceTracker'
import SupportChatWrapper from '@/components/support/SupportChatWrapper'
import SidebarDrawer from '@/components/dashboard/SidebarDrawer'
import MobileTabBar from '@/components/dashboard/MobileTabBar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [studioData, setStudioData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('role, avatar_url, full_name, id')
                    .eq('id', user.id)
                    .maybeSingle()
                
                setProfile(pData)

                if (pData?.role === 'studio') {
                    const { data: sData } = await supabase
                        .from('studios')
                        .select('logo_url, name')
                        .eq('owner_id', user.id)
                        .maybeSingle()
                    setStudioData(sData)
                }
            }
            setLoading(false)
        }
        loadData()
    }, [])

    const avatarUrl = profile?.role === 'studio'
        ? (studioData?.logo_url || "/default-avatar.svg")
        : (profile?.avatar_url || "/default-avatar.svg");

    return (
        <div className="min-h-screen bg-off-white flex flex-col relative overflow-hidden">
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

            <footer className="earth-card m-4 sm:m-8 p-10 bg-white border border-border-grey shadow-tight hidden md:block">
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
        </div>
    )
}
