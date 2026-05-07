import { getStudioBySlug, getOutletsForStudio, getAllStudioSlugs } from '@/lib/studio/website'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import OutletPickerSplash from '@/components/storefront/OutletPickerSplash'

export const revalidate = 3600 // Revalidate every hour

export async function generateStaticParams() {
    const slugs = await getAllStudioSlugs()
    return slugs.map(slug => ({ slug }))
}

export default async function StorefrontEntrance(props: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ select?: string }>
}) {
    const { slug } = await props.params
    const { select } = await props.searchParams
    const studio = await getStudioBySlug(slug)
    if (!studio) notFound()

    // 1. Outlets are already fetched as part of the studio object in getStudioBySlug
    const outlets = (studio.outlets || []) as any[]

    // Fallback: If no outlets exist (shouldn't happen with our migration), 
    // we show a simple error or a legacy view. For now, assume outlets exists.
    if (outlets.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-zinc-500 font-medium">This studio hasn't set up any published branches yet.</p>
            </div>
        )
    }

    // 2. Sticky Selection Check (Cookie) - Bypass if ?select=true
    if (select !== 'true') {
        const cookieStore = await cookies()
        const preferredOutletSlug = cookieStore.get(`preferred_outlet_${slug}`)?.value

        if (preferredOutletSlug) {
            const preferred = outlets.find(o => o.slug === preferredOutletSlug)
            if (preferred) {
                redirect(`/s/${slug}/${preferred.slug}`)
            }
        }

        // 3. Auto-Redirect if only 1 branch exists - Bypass if ?select=true
        if (outlets.length === 1) {
            redirect(`/s/${slug}/${outlets[0].slug}`)
        }
    }

    // 4. Show Outlet Picker Splash (Multiple branches & No preference)
    return (
        <OutletPickerSplash 
            studio={studio}
            outlets={outlets}
            theme={studio.website_config?.theme}
            tagline={studio.website_config?.footer?.tagline}
        />
    )
}
