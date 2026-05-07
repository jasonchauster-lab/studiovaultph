'use client'

import React from 'react'
import { BarChart3 } from 'lucide-react'
import LocationSwitcher from '@/components/studio/LocationSwitcher'
import { useAnalyticsLogic } from './useAnalyticsLogic'
import { OccupancyHeatmap } from './components/OccupancyHeatmap'
import { CohortTable } from './components/CohortTable'
import { ActionableInsight, DataMethodology, AnalyticsInfoModal } from './components/InsightCard'

interface AnalyticsData {
    occupancy: Array<{ dow: number, hour: number, bookings: number }>
    cohort: Array<{ cohort: string, month_index: number, active_users: number }>
}

interface AnalyticsClientProps {
    initialData: AnalyticsData
    outlets: any[]
    currentOutletId?: string
    studioId: string
}

export default function AnalyticsClient({ initialData, outlets, currentOutletId, studioId }: AnalyticsClientProps) {
    const {
        days,
        hours,
        occupancyMap,
        cohortMonths,
        groupedCohort,
        maxMonthIndex,
        isInfoModalOpen,
        setIsInfoModalOpen
    } = useAnalyticsLogic(initialData)

    return (
        <div className="space-y-12">
            {/* Header with Switcher */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-6 rounded-[3rem] border border-zinc-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-zinc-50 rounded-[2rem] flex items-center justify-center border border-zinc-100 shadow-inner">
                        <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tightest">Studio Intelligence</h2>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Advanced metrics for business operations.</p>
                    </div>
                </div>
                
                <LocationSwitcher 
                    outlets={outlets} 
                    currentOutletId={currentOutletId} 
                />
            </div>

            {/* Occupancy Heatmap */}
            <OccupancyHeatmap 
                days={days}
                hours={hours}
                occupancyMap={occupancyMap}
            />

            {/* Retention Cohort Table */}
            <CohortTable 
                cohortMonths={cohortMonths}
                groupedCohort={groupedCohort}
                maxMonthIndex={maxMonthIndex}
            />

            {/* Actionable Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <ActionableInsight 
                    title="Increase Mid-Day Bookings"
                    description="Your Heatmap shows significant idle time between 1 PM and 4 PM. studios in your category often use 'Lunchtime Mat Specials' to fill these slots and improve total yield by 18%."
                />

                <DataMethodology 
                    title="Understanding Retention"
                    description="Our cohort model tracks users based on their first successful booking. Month 0 represents the joining month, and subsequent months show the percentage of repeat visits."
                    onExplore={() => setIsInfoModalOpen(true)}
                />
            </div>

            {/* Info Modal */}
            <AnalyticsInfoModal 
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
            />
        </div>
    )
}


