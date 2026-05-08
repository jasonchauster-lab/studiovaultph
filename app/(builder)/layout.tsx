import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BuilderLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-white overflow-hidden">
            {children}
        </div>
    )
}
