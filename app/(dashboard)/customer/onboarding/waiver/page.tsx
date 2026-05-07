import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WaiverSignForm from '@/components/customer/WaiverSignForm'
import { headers, cookies } from 'next/headers'
import { getStudioBySlug } from '@/lib/studio/website'

export default async function GlobalWaiverPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const cookieStore = await cookies()
    const lastStudioSlug = cookieStore.get('last_studio_slug')?.value

    // If we have a studio context, redirect to the studio-specific waiver page
    if (lastStudioSlug && lastStudioSlug !== 'marketplace') {
        redirect(`/s/${lastStudioSlug}/onboarding/waiver`)
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // If already signed, go to dashboard
    if (profile?.waiver_signed_at) {
        redirect('/customer')
    }

    // For Global Waiver, we use a placeholder or null studio
    const platformStudio = {
        id: null,
        name: 'StudioVault Marketplace',
        slug: 'marketplace'
    }

    return (
        <div className="min-h-screen bg-off-white flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-4xl">
                <WaiverSignForm 
                    studio={platformStudio} 
                    template={null} // Will use default platform text
                    profile={profile} 
                />
            </div>
        </div>
    )
}
