import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InstructorOnboardingForm from '@/components/forms/InstructorOnboardingForm'
import { Clock, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

export default async function InstructorOnboardingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if certification exists
    const { data: certs } = await supabase
        .from('certifications')
        .select('verified')
        .eq('instructor_id', user.id)
        .limit(1)

    const cert = (certs && certs.length > 0) ? certs[0] : null

    // Logic:
    // 1. If certified & verified -> Go to Dashboard
    // 2. If certified & !verified -> Show Pending Screen
    // 3. If !certified -> Show Onboarding Form

    if (cert) {
        if (cert.verified) {
            redirect('/instructor')
        } else {
            return (
                <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-4 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="atelier-card max-w-md w-full bg-white p-12 text-center shadow-tight">
                        <div className="w-20 h-20 bg-forest/5 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Clock className="w-10 h-10 text-forest" />
                        </div>

                        <h1 className="text-3xl font-serif text-burgundy mb-4 tracking-tight">Application Under Review</h1>
                        <p className="text-charcoal/60 mb-8 leading-relaxed">
                            Thanks for applying to StudioVault! Our team is currently reviewing your certifications to ensure the highest quality for our partner studios.
                        </p>

                        <div className="bg-forest/5 rounded-2xl p-6 border border-forest/10 mb-8">
                            <div className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest text-forest">
                                <span className="w-2 h-2 bg-forest rounded-full animate-pulse"></span>
                                Status: Pending Verification
                            </div>
                        </div>

                        <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-[0.2em]">
                            This usually takes 24-48 hours. check back soon!
                        </p>
                    </div>
                </div>
            )
        }
    }

    return (
        <div className="fixed inset-0 bg-off-white flex flex-col md:flex-row z-[60]">
            {/* Left Side: Brand Narrative */}
            <div className="hidden md:flex md:w-[45%] relative flex-col justify-end p-20">
                <Image
                    src="/instructor-application-bg.png"
                    alt="Instructor Application"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-burgundy/90 via-burgundy/20 to-transparent" />
                
                <div className="relative z-10">
                    <Image src="/logo4.png" alt="StudioVault" width={160} height={48} className="h-12 w-auto object-contain brightness-0 invert mb-12" />
                    <h2 className="text-5xl lg:text-6xl font-serif text-white mb-6 leading-tight max-w-md">Grow Your Practice.</h2>
                    <p className="text-xl text-white/80 font-light max-w-sm leading-relaxed">
                        Access premium studio spaces and manage your freelance business with StudioVault's elite platform.
                    </p>
                </div>
            </div>

            {/* Right Side: Onboarding Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-24 flex flex-col items-center">
                <div className="max-w-xl w-full">
                    <div className="mb-16">
                        <h2 className="text-charcoal/40 text-xs font-bold uppercase tracking-[0.3em] mb-4">Partner Onboarding</h2>
                        <h1 className="text-4xl sm:text-5xl font-serif text-burgundy mb-6 tracking-tight">Instructor Registration</h1>
                        <p className="text-charcoal/60 text-lg leading-relaxed">Join the curated marketplace for elite Pilates professionals.</p>
                    </div>

                    <InstructorOnboardingForm />

                    <div className="mt-20 pt-10 border-t border-border-grey text-center text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em]">
                        &copy; 2026 STUDIO VAULT. ALL RIGHTS RESERVED.
                    </div>
                </div>
            </div>
        </div>
    )
}
