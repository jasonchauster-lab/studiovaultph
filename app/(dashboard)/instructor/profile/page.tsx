import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/customer/ProfileForm'
import InstructorGallerySection from '@/components/instructor/InstructorGallerySection'
import InstructorCertificationsSection from '@/components/instructor/InstructorCertificationsSection'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function InstructorProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    const { data: certifications } = await supabase
        .from('certifications')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="border-b border-cream-200 pb-4">
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Profile</h1>
                    <p className="text-charcoal-600 font-medium">Manage your public instructor profile, gallery, and credentials.</p>
                </div>


                {/* Contact Info & Bio Section */}
                <div className="bg-white p-8 rounded-2xl border border-cream-200 shadow-sm">
                    <h2 className="text-xl font-serif text-charcoal-900 mb-6 border-b border-cream-100 pb-2">Profile Details</h2>
                    <ProfileForm profile={profile} />
                </div>

                {/* Photo Gallery Section */}
                <InstructorGallerySection images={profile?.gallery_images || []} />

                {/* Certifications Section */}
                <InstructorCertificationsSection certifications={certifications || []} />
            </div>
        </div>
    )
}

