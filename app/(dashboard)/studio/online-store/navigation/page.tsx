import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import NavigationPageClient from './NavigationPageClient'

export default async function NavigationPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

    if (!studio) notFound()

    return <NavigationPageClient studio={studio} />
}
