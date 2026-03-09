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
        <div className="min-h-screen bg-alabaster flex flex-col">
            {/* Shared Header - Antigravity Glassmorphism */}
            <DashboardHeader
                profile={profile}
                studioData={studioData}
                avatarUrl={avatarUrl}
            />

            {/* Main Content with top padding for fixed header */}
            <main className="flex-1 pt-28">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-8">
                    {children}
                </div>
            </main>

            <footer className="glass-card m-4 sm:m-8 p-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-charcoal/60">
                    <p>© 2026 Studio Vault PH. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms-of-service" className="hover:text-sage transition-colors font-medium">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-sage transition-colors font-medium">Privacy Policy</Link>
                        <Link href="/support" className="hover:text-sage transition-colors font-medium">Support</Link>
                    </div>
                </div>
            </footer>

            {user && <SupportChatWidget userId={user.id} />}
            {user && <UserPresenceTracker />}
        </div>
    )
}
