import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ServiceSettingsClient from './ServiceSettingsClient'

export default async function ServiceSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (!studio) redirect('/studio')

    return (
        <ServiceSettingsClient studio={studio} />
    )
}
