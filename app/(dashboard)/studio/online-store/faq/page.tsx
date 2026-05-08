import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FaqPageClient from './FaqPageClient'

export default async function FaqPage(props: {
    searchParams: Promise<{ outletId?: string }>
}) {
    const { outletId } = await props.searchParams
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

    if (!studio) notFound()

    const { data: outlets } = await supabase
        .from('outlets')
        .select('id, name, address, website_config')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: true })

    return (
        <FaqPageClient 
            studio={studio} 
            outlets={outlets || []} 
            currentOutletId={outletId}
        />
    )
}
