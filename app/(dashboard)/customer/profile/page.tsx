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

    // Generate Signed URL for waiver if it's a path
    if (profile?.waiver_url && !profile.waiver_url.startsWith('http')) {
        const { data: signedData } = await supabase.storage
            .from('waivers')
            .createSignedUrl(profile.waiver_url, 3600)
        if (signedData) {
            profile.waiver_url = signedData.signedUrl
        }
    }

    // Merge user email info from auth
    const profileWithEmail = {
        ...profile,
        email: user.email,
        new_email: user.new_email
    }

    return (
        <div className="min-h-screen bg-cream-50 py-6 sm:py-10">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-serif font-bold text-charcoal-900 mb-2 tracking-tight">My Profile</h1>
                    <p className="text-charcoal-500 text-sm font-medium">Manage your personal information and preferences.</p>
                </div>

                {/* Contact Info Section */}
                <div className="bg-white p-6 sm:p-10 rounded-3xl border border-cream-200 shadow-sm shadow-cream-100/50">
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 mb-8 border-b border-cream-100 pb-4">Contact Information</h2>
                    <ProfileForm profile={profileWithEmail} />
                </div>
            </div>
        </div>
    )
}
