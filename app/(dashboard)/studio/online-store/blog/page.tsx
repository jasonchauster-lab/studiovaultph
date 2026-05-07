import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import BlogPageClient from './BlogPageClient'

export default async function BlogPage() {
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

    return <BlogPageClient studio={studio} />
}
