import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsGrid from '@/components/studio/settings/SettingsGrid'
import { getCachedUser } from '@/lib/studio/data'

export default async function StudioSettingsPage() {
    const user = await getCachedUser()
    if (!user) redirect('/login')

    return (
        <div className="space-y-12 py-10 px-6 max-w-7xl mx-auto min-h-screen">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tightest leading-tight">
                    Studio <span className="text-zinc-300">Settings</span>
                </h1>
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] max-w-2xl">
                    Configure your studio management preferences, billing, and marketplace presence.
                </p>
            </div>

            <SettingsGrid />
        </div>
    )
}
