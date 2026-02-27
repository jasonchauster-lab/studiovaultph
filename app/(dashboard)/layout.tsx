import { signOut } from '@/app/auth/actions'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import SupportChatWidget from '@/components/support/SupportChatWidget'
import Navigation from '@/components/dashboard/Navigation'

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
        <div className="min-h-screen bg-cream-50 flex flex-col">
            {/* Shared Header */}
            <header className="bg-white border-b border-cream-200 px-4 py-2 sm:px-6 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                        <Link href="/welcome" className="flex items-center gap-0 group">
                            <Image src="/logo.png" alt="StudioVault Logo" width={144} height={144} className="w-36 h-36 object-contain" />
                            <span className="text-3xl font-serif font-bold text-charcoal-900 tracking-tight -ml-10 whitespace-nowrap hidden lg:block">StudioVaultPH</span>
                        </Link>

                        <nav className="hidden md:block">
                            <Navigation role={profile?.role} />
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
                        <div className="md:hidden">
                            <Navigation role={profile?.role} />
                        </div>

                        <div className="flex items-center gap-3 pl-4 border-l border-cream-100">
                            <div className="hidden sm:block text-right">
                                <p className="text-xs font-bold text-charcoal-900 leading-none mb-1">{profile?.role === 'studio' ? (studioData?.name || profile?.full_name || 'Studio') : (profile?.full_name || 'Partner')}</p>
                                <p className="text-[10px] text-charcoal-500 uppercase font-bold tracking-tighter text-rose-gold">{profile?.role || 'User'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cream-100 shadow-sm transition-transform hover:scale-105">
                                <Image
                                    src={avatarUrl}
                                    alt="User Profile"
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                            <form action={signOut} className="hidden sm:block">
                                <button className="p-2 text-charcoal-400 hover:text-red-600 transition-colors" title="Log Out">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {user && <SupportChatWidget userId={user.id} />}
        </div>
    )
}
