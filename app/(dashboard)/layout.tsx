import { signOut } from '@/app/auth/actions'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import SupportChatWidget from '@/components/support/SupportChatWidget'
import Navigation from '@/components/dashboard/Navigation'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import UserPresenceTracker from '@/components/shared/UserPresenceTracker'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let profile = null
    let studioData = null
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('role, avatar_url, full_name')
            .eq('id', user.id)
            .single()
        profile = data

        if (profile?.role === 'studio') {
            const { data: sData } = await supabase
                .from('studios')
                .select('logo_url, name')
                .eq('owner_id', user.id)
                .single()
            studioData = sData
        }
    }

    const avatarUrl = profile?.role === 'studio'
        ? (studioData?.logo_url || "/logo.png")
        : (profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || user?.email || 'Partner'}`);

    return (
        <div className="min-h-screen bg-off-white flex flex-col relative overflow-hidden">

            {/* Shared Header - Antigravity Glassmorphism */}
            <DashboardHeader
                profile={profile}
                studioData={studioData}
                avatarUrl={avatarUrl}
            />

            {/* Main Content with top padding for fixed header */}
            <main className="flex-1 pt-32 sm:pt-40 relative z-10">
                <div className="max-w-[1600px] mx-auto px-6 sm:px-12 lg:px-16">
                    {children}
                </div>
            </main>

            <footer className="earth-card m-4 sm:m-8 p-10 bg-white border border-border-grey shadow-tight">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-bold text-slate uppercase tracking-widest">© 2026 STUDIO VAULT PH. ALL RIGHTS RESERVED.</p>
                    <div className="flex gap-8">
                        <Link href="/terms-of-service" className="text-[10px] font-bold text-slate hover:text-forest transition-all uppercase tracking-widest underline decoration-forest/0 hover:decoration-forest underline-offset-8">Terms of Service</Link>
                        <Link href="/privacy" className="text-[10px] font-bold text-slate hover:text-forest transition-all uppercase tracking-widest underline decoration-forest/0 hover:decoration-forest underline-offset-8">Privacy Policy</Link>
                        <Link href="/support" className="text-[10px] font-bold text-slate hover:text-forest transition-all uppercase tracking-widest underline decoration-forest/0 hover:decoration-forest underline-offset-8">Support</Link>
                    </div>
                </div>
            </footer>

            {user && <SupportChatWidget userId={user.id} />}
            {user && <UserPresenceTracker />}
        </div>
    )
}
