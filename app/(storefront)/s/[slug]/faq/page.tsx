import { getStudioBySlug, getOutletsForStudio } from '@/lib/studio/website'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function FaqRedirector(props: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { slug } = await props.params
    const searchParams = await props.searchParams
    const studio = await getStudioBySlug(slug)
    if (!studio) notFound()

    const outlets = await getOutletsForStudio(studio.id)

    if (outlets.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-zinc-500 font-medium tracking-tight">FAQ currently unavailable.</p>
            </div>
        )
    }

    // 1. Resolve search params string to preserve it
    const queryString = Object.keys(searchParams).length > 0 
        ? `?${new URLSearchParams(searchParams as any).toString()}`
        : ''

    // 2. Check for preferred branch cookie
    const cookieStore = await cookies()
    const preferredOutletSlug = cookieStore.get(`preferred_outlet_${slug}`)?.value

    if (preferredOutletSlug) {
        const preferred = outlets.find(o => o.slug === preferredOutletSlug)
        if (preferred) {
            redirect(`/s/${slug}/${preferred.slug}/faq${queryString}`)
        }
    }

    // 3. Default to first branch
    redirect(`/s/${slug}/${outlets[0].slug}/faq${queryString}`)
}
