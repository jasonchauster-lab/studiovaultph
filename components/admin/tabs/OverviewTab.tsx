import React from 'react'
import { getAdminAnalytics } from '@/app/(dashboard)/admin/actions'
import { createAdminClient } from '@/lib/supabase/server'
import AdminAnalytics from '@/components/admin/AdminAnalytics'
import AdminExportButtons from '@/components/admin/AdminExportButtons'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import VerifyButton from '@/components/admin/VerifyButton'
import { ShieldAlert, BarChart3 } from 'lucide-react'
import { safeFormatCurrency } from '@/lib/utils/format'

interface OverviewTabProps {
    startDate?: string
    endDate?: string
}

export default async function OverviewTab({ startDate, endDate }: OverviewTabProps) {
    const supabase = createAdminClient()
    
    const [analytics, negBalRes] = await Promise.all([
        getAdminAnalytics(startDate, endDate),
        supabase.from('profiles')
            .select('id, full_name, email, available_balance')
            .eq('role', 'instructor')
            .lt('available_balance', 0)
            .order('available_balance', { ascending: true })
    ])

    const negativeBalanceInstructors = negBalRes?.data ?? []

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal/50 uppercase flex items-center gap-3">
                        <div className="w-8 h-px bg-charcoal/20" />
                        Analytics Engine
                    </h2>
                    <div className="flex items-center gap-3">
                        {analytics && !('error' in analytics) && <ExportCsvButton data={analytics.transactions || []} />}
                        <DateRangeFilters />
                    </div>
                </div>
                <div className="atelier-card p-8">
                    <AdminExportButtons startDate={startDate} endDate={endDate} />
                </div>
                {!analytics || ('error' in analytics) ? (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
                        <p className="font-bold">Operational Intelligence Unavailable</p>
                        <p className="text-xs mt-1">{analytics ? (analytics as any).error : 'Data stream timeout'}</p>
                    </div>
                ) : (
                    <AdminAnalytics stats={analytics} />
                )}
            </div>

            {negativeBalanceInstructors.length > 0 && (
                <div className="atelier-card p-8 bg-amber-50/30 border border-amber-200">
                    <h2 className="text-xl font-medium text-amber-700 mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" />
                        Negative Balance Instructors
                        <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{negativeBalanceInstructors.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {negativeBalanceInstructors.map((instructor: any) => (
                            <div key={instructor.id} className="border border-amber-100 rounded-lg p-4 bg-white flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="font-bold text-burgundy">{instructor.full_name}</p>
                                    <p className="text-xs text-red-600 font-bold mt-1">₱{safeFormatCurrency(instructor.available_balance)}</p>
                                </div>
                                <VerifyButton id={instructor.id} action="settleInstructorDebt" label="Settle" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-lg tracking-widest uppercase shadow-sm" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
