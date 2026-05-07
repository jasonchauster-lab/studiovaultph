import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ThemePageClient from './ThemePageClient'

export default async function ThemePage() {
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

    return <ThemePageClient studio={studio} />
}
