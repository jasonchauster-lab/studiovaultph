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
                <div className="relative">
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/30 hover:text-gold uppercase tracking-[0.4em] transition-all mb-10 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-2" />
                        BACK TO DASHBOARD
                    </Link>
                    <div className="flex flex-col gap-4">
                        <h1 className="text-4xl sm:text-6xl font-serif text-charcoal tracking-tighter leading-tight">My Profile</h1>
                        <p className="text-[10px] sm:text-[11px] font-black text-charcoal/40 uppercase tracking-[0.5em] leading-relaxed max-w-2xl">
                            Curate your professional presence, showcase your unique teaching philosophy, and manage verified expertise.
                        </p>
                    </div>
                </div>

                {/* Contact Info & Bio Section */}
                <div className="glass-card p-8 sm:p-16 relative overflow-hidden group/details">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[120px] pointer-events-none group-hover:bg-gold/10 transition-colors duration-1000" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-5 mb-12 sm:mb-16 border-b border-white/60 pb-8 sm:pb-12">
                            <div className="p-4 bg-white/60 rounded-2xl border border-white/60 shadow-sm transition-transform duration-700 group-hover/details:rotate-3">
                                <User className="w-6 h-6 text-gold shrink-0" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-4xl font-serif text-charcoal tracking-tighter">Profile Details</h2>
                                <p className="text-[10px] font-black text-charcoal/30 uppercase tracking-[0.3em] mt-2">Core Identity & Professional Information</p>
                            </div>
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
