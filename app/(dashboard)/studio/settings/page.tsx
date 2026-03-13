import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import StudioSettingsForm from '@/components/studio/StudioSettingsForm'
import ReferralCard from '@/components/customer/ReferralCard'

export default async function StudioSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const headersList = await headers()
    const origin = `${headersList.get('x-forwarded-proto') ?? 'http'}://${headersList.get('host') ?? 'localhost:3000'}`

    const [{ data: studio, error }, { data: profile }] = await Promise.all([
        supabase.from('studios').select('*').eq('owner_id', user.id).single(),
        supabase.from('profiles').select('referral_code').eq('id', user.id).single(),
    ])

    if (error || !studio) {
        // Handle case where studio doesn't exist yet (redirect to creation?)
        // Or show error
        return <div className="p-8 text-charcoal-500">Studio not found. Please contact support.</div>
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center">
                <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Studio Settings</h1>
                <p className="text-charcoal-600">Manage your studio details, equipment, and inventory.</p>
            </div>

            <StudioSettingsForm studio={studio} />

            {profile?.referral_code && (
                <ReferralCard referralCode={profile.referral_code} origin={origin} />
            )}
        </div>
    )
}
