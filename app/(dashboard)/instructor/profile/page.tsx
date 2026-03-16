import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ProfileForm from '@/components/customer/ProfileForm'
import InstructorGallerySection from '@/components/instructor/InstructorGallerySection'
import InstructorCertificationsSection from '@/components/instructor/InstructorCertificationsSection'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'

export default async function InstructorProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const headersList = await headers()
    const origin = `${headersList.get('x-forwarded-proto') ?? 'http'}://${headersList.get('host') ?? 'localhost:3000'}`

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

    const profileWithEmail = {
        ...profile,
        email: user.email,
        new_email: user.new_email
    }

    return (
        <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-0">
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-12">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/40 hover:text-gold uppercase tracking-[0.3em] transition-all mb-6 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-2xl sm:text-4xl font-serif text-charcoal tracking-tighter mb-2">My Profile</h1>
                    <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.4em]">Manage your public instructor profile, gallery, and credentials.</p>
                </div>

                {/* Contact Info & Bio Section */}
                <div className="glass-card p-5 sm:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6 sm:mb-10 border-b border-white/60 pb-5 sm:pb-8">
                            <User className="w-5 h-5 text-gold shrink-0" />
                            <h2 className="text-xl sm:text-3xl font-serif text-charcoal tracking-tighter">Profile Details</h2>
                        </div>
                        <ProfileForm profile={profileWithEmail} />
                    </div>
                </div>

                {/* Photo Gallery Section */}
                <InstructorGallerySection images={profile?.gallery_images || []} />

                {/* Certifications Section */}
                <InstructorCertificationsSection certifications={certifications || []} />

            </div>
        </div>
    )
}
