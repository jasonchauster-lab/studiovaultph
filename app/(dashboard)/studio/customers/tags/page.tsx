import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import TagsClient from './TagsClient'

export default async function TagsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!studio) notFound()

    // Fetch tags with customer count
    const { data: tags } = await supabase
        .from('tags')
        .select(`
            *,
            profile_tags:profile_tags(count)
        `)
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: false })

    // Map tags to include a clean count
    const formattedTags = tags?.map(tag => ({
        ...tag,
        customerCount: tag.profile_tags?.[0]?.count || 0
    })) || []

    return (
        <StudioDashboardShell 
            title="Tags"
            breadcrumbs={[{ label: 'Directory' }, { label: 'Tags' }]}
        >
            <TagsClient studioId={studio.id} initialTags={formattedTags} />
        </StudioDashboardShell>
    )
}
