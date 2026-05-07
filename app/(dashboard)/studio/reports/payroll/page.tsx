import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import PayrollClient from './PayrollClient'
import { getPayrollData } from './actions'

import { getCachedStudio } from '@/lib/studio/data'

export default async function PayrollPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const studio = await getCachedStudio()
    if (!studio) redirect('/studio/setup')

    let payroll: any[] = []
    let error = null
    try {
        payroll = await getPayrollData(studio.id)
    } catch (e: any) {
        error = e.message
    }

    if (error === 'Permission denied') {
        return (
            <StudioDashboardShell 
                title="Instructor Payroll"
                breadcrumbs={[
                    { label: 'Reports', href: '/studio/reports' },
                    { label: 'Payroll' }
                ]}
            >
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">You do not have permission to view instructor payroll data.</p>
                </div>
            </StudioDashboardShell>
        )
    }

    return (
        <StudioDashboardShell 
            title="Instructor Payroll"
            breadcrumbs={[
                { label: 'Reports', href: '/studio/reports' },
                { label: 'Payroll' }
            ]}
        >
            <PayrollClient 
                initialPayroll={payroll} 
                studioId={studio.id} 
            />
        </StudioDashboardShell>
    )
}
