import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from '@/components/customer/ProfileForm'
import InstructorGallerySection from '@/components/instructor/InstructorGallerySection'
import InstructorCertificationsSection from '@/components/instructor/InstructorCertificationsSection'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'

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
        <div className="min-h-screen p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-16">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/20 hover:text-gold uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    <h1 className="text-2xl sm:text-5xl font-serif text-charcoal tracking-tighter mb-4">My Profile</h1>
                    <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em]">Manage your public instructor profile, gallery, and credentials.</p>
                </div>

                {/* Contact Info & Bio Section */}
                <div className="glass-card p-12 relative overflow-hidden">
                    {/* Soft Bloom */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-10 border-b border-white/60 pb-8">
                            <User className="w-6 h-6 text-gold" />
                            <h2 className="text-3xl font-serif text-charcoal tracking-tighter">Profile Details</h2>
                        </div>
                        <ProfileForm profile={profile} />
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

