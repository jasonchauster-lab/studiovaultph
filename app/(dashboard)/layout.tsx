import { signOut } from '@/app/auth/actions'
import Link from 'next/link'
import { LogOut, Home } from 'lucide-react'

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
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        profile = data

        // --- ROLE ENFORCEMENT ---
        // We can't use `usePathname` in Server Component (Layout). 
        // But we handle this via Middleware usually, or Client Component check.
        // HOWEVER, we can use `headers()` to get the pathname if absolutely necessary, 
        // or just rely on the structure.
        // Actually, Layouts don't easily know the current path in Server Components without headers.
        // Middleware is the BEST place for this. 
        // But since I can't easily modify middleware to do DB calls without adding overhead...
        // I will use a Client Component wrapper for the protection or...
        // Wait, Middleware CAN do DB calls if using `updateSession`.

        // Let's stick to the Plan: Modify Middleware?
        // No, user specifically mentioned "after that the view should be locked".
        // Let's used a small client component "RoleGuard" inside the layout?
        // Or just `Navigation` handles the UI, but we need to block access.

        // Let's try to infer from the children? No.
        // Let's use `headers()` to check URL.
    }
    return (
        <div className="min-h-screen bg-cream-50 flex flex-col">
            {/* Shared Header */}
            <header className="bg-white border-b border-cream-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-10 relative">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/welcome" className="text-xl font-serif font-bold text-charcoal-900 flex items-center gap-2">
                        <Home className="w-5 h-5 text-charcoal-500" />
                        StudioVaultPH
                    </Link>

                    <div className="flex items-center gap-4">
                        <Navigation role={profile?.role} />

                        {/* Desktop Log Out only — mobile logout is inside the nav drawer */}
                        <form action={signOut} className="hidden md:block">
                            <button className="flex items-center gap-2 text-sm font-medium text-charcoal-600 hover:text-red-600 transition-colors">
                                <LogOut className="w-4 h-4" />
                                Log Out
                            </button>
                        </form>
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
