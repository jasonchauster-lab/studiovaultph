import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ServicesPageClient from './ServicesPageClient'
import { getCachedStudio } from '@/lib/studio/data'

export default async function ServicesPage() {
    const studio = await getCachedStudio()
    if (!studio) notFound()

    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) redirect('/login')

    // Fetch existing services from the new services table
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

    // Fetch memberships and packages for plan assignment
    const { data: memberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_deleted', false)

    const { data: packages } = await supabase
        .from('packages')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_deleted', false)

    // Fetch categories
    const { data: categories } = await supabase
        .from('service_categories')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true })

    return (
        <ServicesPageClient 
            studioId={studio.id}
            services={services || []} 
            memberships={memberships || []}
            packages={packages || []}
            categories={categories || []}
        />
    )
}
