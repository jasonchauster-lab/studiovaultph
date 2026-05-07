import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EquipmentManagementView from '@/components/management/EquipmentManagementView'
import BranchPageSelector from '@/components/dashboard/BranchPageSelector'
import Link from 'next/link'
import { ArrowLeft, LayoutGrid } from 'lucide-react'
import { getCachedStudio, getCachedOutlets } from '@/lib/studio/data'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function EquipmentsPage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const outletId = typeof searchParams.outletId === 'string' ? searchParams.outletId : undefined
    
    // 1. Fetch Studio & Outlets (Memoized)
    const studio = await getCachedStudio()
    
    if (!studio) redirect('/studio')

    const outlets = await getCachedOutlets(studio.id)


    const activeOutlet = outletId ? outlets?.find(o => o.id === outletId) : null
    
    // Logic for calculating inventory based on view mode
    let initialInventory: Record<string, any> = {}

    if (outletId) {
        // --- BRANCH VIEW ---
        // Show specific branch inventory, but merged with keys from studio master list
        const studioInv = studio.inventory || {}
        const outletInv = activeOutlet?.inventory || {}
        
        // Start with studio inventory keys (Master List)
        initialInventory = { ...studioInv }
        
        // Reset counts for the branch view (we want to show what THIS branch has)
        Object.keys(initialInventory).forEach(key => {
            initialInventory[key] = { ...initialInventory[key], total: 0, rental_cap: 0 }
        })

        // Overlay the actual branch data
        Object.keys(outletInv).forEach(key => {
            initialInventory[key] = {
                ...initialInventory[key],
                ...outletInv[key]
            }
        })
    } else {
        // --- TOTAL OVERVIEW ---
        // Aggregate all outlets + any standalone studio inventory
        const studioInv = studio.inventory || {}
        initialInventory = { ...studioInv }

        // Initialize breakdown for each item
        Object.keys(initialInventory).forEach(key => {
            const item = initialInventory[key]
            initialInventory[key] = {
                ...item,
                breakdown: item.total > 0 ? [{
                    outletName: 'Standalone',
                    total: item.total,
                    rental_price: item.rental_price || 0,
                    rental_cap: item.rental_cap || 0
                }] : []
            }
        })

        // Add each outlet's inventory to the aggregate
        outlets.forEach(outlet => {
            const outletInv = outlet.inventory || {}
            Object.keys(outletInv).forEach(key => {
                if (!initialInventory[key]) {
                    initialInventory[key] = {
                        ...outletInv[key],
                        total: 0,
                        rental_cap: 0,
                        breakdown: []
                    }
                }

                const item = initialInventory[key]
                const outletItem = outletInv[key]
                
                initialInventory[key] = {
                    ...item,
                    total: (item.total || 0) + (outletItem.total || 0),
                    rental_cap: (item.rental_cap || 0) + (outletItem.rental_cap || 0),
                    breakdown: [
                        ...(item.breakdown || []),
                        {
                            outletId: outlet.id,
                            outletName: outlet.name,
                            total: outletItem.total || 0,
                            rental_price: outletItem.rental_price || 0,
                            rental_cap: outletItem.rental_cap || 0
                        }
                    ]
                }
            })
        })
    }

    return (
        <div className="min-h-screen p-8 lg:p-12 bg-cream-50/30">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href={outletId ? `/studio?outletId=${outletId}` : '/studio'}
                        className="inline-flex items-center gap-3 text-[10px] font-black text-zinc-400 hover:text-[#2D3282] uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-zinc-100 shadow-sm mb-6">
                            <LayoutGrid className="w-4 h-4 text-[#2D3282]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Inventory Control</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-tight">
                            Equipment <span className="text-zinc-300">Management</span>
                        </h1>
                        
                        {/* Centered Branch Selector */}
                        <BranchPageSelector 
                            outlets={outlets} 
                            currentOutletId={outletId}
                            isGlobalAllowed={true}
                        />
                    </div>
                </div>

                <div className="bg-white p-12 rounded-[3.5rem] border border-zinc-100 shadow-sm animate-in fade-in duration-700">
                    <EquipmentManagementView 
                        studioId={studio.id}
                        outletId={outletId}
                        initialInventory={(initialInventory as any) || {}}
                        outlets={outlets}
                    />
                </div>
            </div>
        </div>
    )
}
