import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InstructorOnboardingForm from '@/components/forms/InstructorOnboardingForm'
import { Clock, CheckCircle2 } from 'lucide-react'

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
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-4xl mb-8 text-center">
                <h1 className="text-4xl font-serif text-charcoal-900 mb-2 tracking-tight">
                    StudioVaultPH
                </h1>
                <p className="text-charcoal-600">The premium marketplace for Pilates professionals.</p>
            </div>

            <InstructorOnboardingForm />

            <div className="mt-8 text-center text-xs text-charcoal-400">
                &copy; {new Date().getFullYear()} StudioVaultPH. All rights reserved.
            </div>
        </div>
    )
}
