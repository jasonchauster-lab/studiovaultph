import { redirect } from 'next/navigation'

export default async function BranchDashboardRedirect(props: {
    params: Promise<{ slug: string, branchSlug: string }>
}) {
    const { slug } = await props.params
    // Redirect all branch-specific dashboard requests to the unified studio dashboard
    redirect(`/s/${slug}/dashboard`)
}
