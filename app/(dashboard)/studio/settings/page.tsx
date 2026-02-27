import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioSettingsForm from '@/components/studio/StudioSettingsForm'

export default async function StudioSettingsPage() {
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
        // Handle case where studio doesn't exist yet (redirect to creation?)
        // Or show error
        return <div className="p-8 text-charcoal-500">Studio not found. Please contact support.</div>
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Studio Settings</h1>
                <p className="text-charcoal-600">Manage your studio details, equipment, and inventory.</p>
            </div>

            <StudioSettingsForm studio={studio} />
        </div>
    )
}
