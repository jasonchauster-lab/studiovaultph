import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/customer/ProfileForm'

export default async function CustomerProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Profile</h1>
                    <p className="text-charcoal-600">Manage your personal information.</p>
                </div>

                {/* Contact Info Section */}
                <div className="bg-white p-8 rounded-2xl border border-cream-200 shadow-sm">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6">Contact Information</h2>
                    <ProfileForm profile={profile} />
                </div>
            </div>
        </div>
    )
}
