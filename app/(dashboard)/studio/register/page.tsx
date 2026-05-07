import StudioApplicationForm from '@/components/studio/StudioApplicationForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudioRegisterPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if they already have a studio
    const { data: studio } = await supabase
        .from('studios')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

    if (studio) {
        redirect('/studio')
    }

    return (
        <div className="pt-12 pb-24 px-4 md:px-10 max-w-5xl mx-auto space-y-12">
            <div className="space-y-4 text-center">
                <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-none font-atelier">
                    Launch your studio.
                </h1>
                <p className="text-xl text-zinc-500 font-medium max-w-2xl mx-auto">
                    Complete your profile to start listing your space and managing your business.
                </p>
            </div>

            <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-2xl p-8 md:p-16">
                <StudioApplicationForm originPortal="cms" />
            </div>
        </div>
    )
}
