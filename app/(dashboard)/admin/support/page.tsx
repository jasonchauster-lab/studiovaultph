import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SupportDashboardClient from '@/components/admin/SupportDashboardClient'

export default async function AdminSupportPage() {
    const supabase = await createClient()

    // 1. Auth & Admin Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        redirect('/')
    }

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900">Support Center</h1>
                    <p className="text-charcoal-600">Manage user inquiries and support tickets.</p>
                </div>

                <SupportDashboardClient />
            </div>
        </div>
    )
}
