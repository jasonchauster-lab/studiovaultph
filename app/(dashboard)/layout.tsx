import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, avatar_url, full_name, id')
        .eq('id', user.id)
        .maybeSingle()

    let studioData = null
    if (profile?.role === 'studio') {
        const { data: sData } = await supabase
            .from('studios')
            .select('logo_url, name')
            .eq('owner_id', user.id)
            .maybeSingle()
        studioData = sData
    }

    const avatarUrl = profile?.role === 'studio'
        ? (studioData?.logo_url || "/default-avatar.svg")
        : (profile?.avatar_url || "/default-avatar.svg");

    return (
        <DashboardLayoutClient 
            user={user}
            profile={profile}
            studioData={studioData}
            avatarUrl={avatarUrl}
        >
            {children}
        </DashboardLayoutClient>
    )
}
