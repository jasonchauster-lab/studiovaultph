import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { getInventory } from './actions'
import { getCachedStudio } from '@/lib/studio/data'
import { verifyStudioAccess } from '@/lib/studio/auth'
import dynamic from 'next/dynamic'

const InventoryClient = dynamic(() => import('./InventoryClient'), {
    loading: () => <div className="h-[800px] bg-white border border-zinc-100 rounded-[3rem] animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
    </div>
})

/**
 * Inventory Management Page
 * 
 * Optimized for performance via parallel fetching and Zinc/Indigo styling.
 */
export default async function InventoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // FIX PERF: Parallelize studio fetch and inventory fetch
    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    const [inventory, { isOwner, permissions }] = await Promise.all([
        getInventory(studio.id),
        verifyStudioAccess(studio.id)
    ])

    // Security Check: Authorized staff or owner
    if (!isOwner && !permissions.manage_store) {
        return (
            <StudioDashboardShell 
                title="Inventory Management"
                breadcrumbs={[
                    { label: 'Online Store', href: '/studio/online-store' },
                    { label: 'Inventory' }
                ]}
            >
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-sm">
                        <Package className="w-8 h-8 text-zinc-300" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Access Denied</h2>
                        <p className="text-sm text-zinc-400 font-medium">You do not have permission to manage the studio inventory.</p>
                    </div>
                </div>
            </StudioDashboardShell>
        )
    }

    return (
        <StudioDashboardShell 
            title="Inventory Management"
            breadcrumbs={[
                { label: 'Online Store', href: '/studio/online-store' },
                { label: 'Inventory' }
            ]}
        >
            <InventoryClient 
                initialInventory={inventory} 
                studioId={studio.id} 
            />
        </StudioDashboardShell>
    )
}

import { Package } from 'lucide-react'
