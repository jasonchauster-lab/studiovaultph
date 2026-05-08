import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OutletManagementView from '@/components/management/OutletManagementView'

type Params = Promise<{ outletId: string }>

export default async function OutletsManagementPage(props: {
    params: Params
}) {
    const params = await props.params
    const outletId = params.outletId
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Studio (required for studio_id)
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (studioError || !studio) {
        return <div className="p-8 text-charcoal/60">Studio not found.</div>
    }

    // 2. Fetch ALL Outlets for this studio (not just the one in the URL)
    const { data: outlets } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: true })

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <OutletManagementView 
                studioId={studio.id}
                initialOutlets={outlets || []}
            />
        </div>
    )
}
