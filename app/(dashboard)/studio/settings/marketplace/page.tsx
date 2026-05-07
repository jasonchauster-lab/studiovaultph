import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceSyncManager from '@/components/studio/settings/MarketplaceSyncManager'

export default async function MarketplaceBrandingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: studio, error } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (error || !studio) {
        return <div className="p-8 text-charcoal-500">Studio not found.</div>
    }

    const { data: outlets = [] } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .order('name', { ascending: true })

    return (
        <div className="space-y-12 max-w-[1200px] mx-auto py-10 px-4 md:px-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-stone-100 pb-10">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                            <Rocket className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Revenue Channel</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tightest leading-tight">
                        Rent out your unused equipment
                    </h1>
                    <h2 className="text-xl font-medium text-zinc-500">Marketplace Distribution</h2>
                    <p className="text-sm font-medium text-zinc-500 max-w-xl">
                        Monetize your studio's downtime by listing available equipment on the StudioVault discovery marketplace. 
                    </p>
                </div>
            </div>

            <MarketplaceSyncManager studio={studio} branches={outlets as any[]} />
        </div>
    )
}

import { Rocket } from 'lucide-react'
