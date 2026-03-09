import { signOut } from '@/app/auth/actions'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import SupportChatWidget from '@/components/support/SupportChatWidget'
import Navigation from '@/components/dashboard/Navigation'
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
            <header className="glass-navbar px-4 py-3 sm:px-6 fixed top-0 left-0 right-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                        <Link href="/welcome" className="flex items-center gap-0 group">
                            <Image src="/logo.png" alt="StudioVault Logo" width={100} height={100} className="w-24 h-24 object-contain" />
                            <span className="text-2xl font-serif font-bold text-charcoal tracking-tight -ml-6 whitespace-nowrap hidden lg:block">StudioVaultPH</span>
                        </Link>
                        <nav className="hidden md:block">
                            <Navigation role={profile?.role} />
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                        <div className="md:hidden">
                            <Navigation role={profile?.role} />
                        </div>

                        <div className="flex items-center gap-3 pl-4 border-l border-white/20">
                            <div className="hidden sm:block text-right">
                                <p className="text-xs font-bold text-charcoal leading-none mb-1">{profile?.role === 'studio' ? (studioData?.name || profile?.full_name || 'Studio') : (profile?.full_name || 'Partner')}</p>
                                <p className="text-[10px] text-sage font-bold uppercase tracking-widest">
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
