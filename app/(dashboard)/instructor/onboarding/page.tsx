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
                <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4 transition-all animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="max-w-md w-full bg-white p-10 rounded-2xl border border-cream-200 shadow-sm text-center">
                        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-8 h-8 text-yellow-600" />
                        </div>

                        <h1 className="text-3xl font-serif text-charcoal-900 mb-4">Application Under Review</h1>
                        <p className="text-charcoal-600 mb-8 leading-relaxed">
                            Thanks for applying to StudioVaultPH! Our team is currently reviewing your certifications to ensure the highest quality for our studios.
                        </p>

                        <div className="bg-cream-50 rounded-xl p-4 border border-cream-100 mb-8">
                            <div className="flex items-center justify-center gap-2 text-sm text-charcoal-500">
                                Status: <span className="text-yellow-700 font-semibold flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> Pending Verification</span>
                            </div>
                        </div>

                        <p className="text-xs text-charcoal-400">
                            This usually takes 24-48 hours. check back soon!
                        </p>
                    </div>
                </div>
            )
        }
    }

    return (
        <div className="fixed inset-0 bg-white flex flex-col md:flex-row z-[60]">
            {/* Left Side: Image */}
            <div className="hidden md:flex md:w-1/2 relative flex-col justify-end">
                <Image
                    src="/instructor-application-bg.png"
                    alt="Instructor Application"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
                <div className="relative p-16 text-white z-10">
                    <h2 className="text-4xl lg:text-5xl font-serif mb-6 leading-tight">Grow Your Practice</h2>
                    <p className="text-lg text-white/90 font-light max-w-sm leading-relaxed">
                        Access premium studio spaces and manage your freelance business with StudioVault's elite platform.
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 overflow-y-auto bg-white p-8 md:p-12 lg:p-20">
                <div className="max-w-xl mx-auto">
                    <div className="mb-12">
                        <Link href="/" className="flex items-center justify-center gap-0 group mb-8">
                            <Image src="/logo.png" alt="StudioVault Logo" width={80} height={80} className="w-20 h-20 object-contain" />
                            <span className="text-3xl font-serif font-bold text-charcoal-900 tracking-tight -ml-5 whitespace-nowrap">StudioVaultPH</span>
                        </Link>
                        <h2 className="text-charcoal-800 text-sm font-bold uppercase tracking-[0.2em] mb-3">Join the Vault</h2>
                        <h1 className="text-4xl font-serif text-charcoal-900 mb-4 tracking-tight">Instructor Application</h1>
                        <p className="text-charcoal-600">The premium marketplace for Pilates professionals.</p>
                    </div>

                    <InstructorOnboardingForm />

                    <div className="mt-12 pt-8 border-t border-cream-100 text-center text-xs text-charcoal-400">
                        &copy; {new Date().getFullYear()} StudioVaultPH. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    )
}
