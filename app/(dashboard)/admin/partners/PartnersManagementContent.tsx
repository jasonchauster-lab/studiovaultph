'use client'

import { useState } from 'react'
import GlobalSearch from '@/components/admin/GlobalSearch'
import PartnerFeeClient from '@/components/admin/PartnerFeeClient'
import PartnerBookingsDrawer from '@/components/admin/PartnerBookingsDrawer'

export default function PartnersManagementContent({
    instructors,
    studios
}: {
    instructors: any[]
    studios: any[]
}) {
    const [drawerState, setDrawerState] = useState<{
        isOpen: boolean;
        partnerId: string;
        partnerName: string;
        partnerType: 'profile' | 'studio'
    }>({
        isOpen: false,
        partnerId: '',
        partnerName: '',
        partnerType: 'profile'
    })

    const openDrawer = (id: string, name: string, type: 'profile' | 'studio') => {
        setDrawerState({
            isOpen: true,
            partnerId: id,
            partnerName: name,
            partnerType: type
        })
    }

    return (
        <>
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-1">Partner Management</h1>
                    <p className="text-charcoal-600 text-sm">Manage instructor and studio commission fees.</p>
                </div>
                <div className="w-full max-w-lg">
                    <GlobalSearch onOpenBookings={openDrawer} />
                </div>
            </div>

            <div className="bg-white text-charcoal-900 rounded-2xl border border-cream-200 shadow-sm p-6 overflow-x-auto mt-6">
                <PartnerFeeClient
                    instructors={instructors || []}
                    studios={studios || []}
                    onOpenBookings={openDrawer}
                />
            </div>

            <PartnerBookingsDrawer
                isOpen={drawerState.isOpen}
                partnerId={drawerState.partnerId}
                partnerName={drawerState.partnerName}
                partnerType={drawerState.partnerType}
                onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    )
}
