import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import CustomerOnboardingForm from '@/components/customer/CustomerOnboardingForm'

export default async function CustomerOnboardingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // If profile is already complete, redirect to dashboard
    if (profile?.date_of_birth && profile?.contact_number) {
        redirect('/customer')
    }

    return (
        <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-8 md:p-12 lg:p-24 relative selection:bg-forest/10">
            {/* Logo Header */}
            <div className="w-full max-w-md mb-16 text-center">
                <Link href="/" className="inline-flex items-center gap-1 group">
                    <div className="bg-white p-2 rounded-lg shadow-tight group-hover:rotate-2 transition-transform border border-border-grey">
                        <Image src="/logo2.jpg" alt="StudioVault Logo" width={40} height={40} className="w-10 h-10 object-contain mix-blend-multiply" />
                    </div>
                    <span className="text-xl font-serif font-bold text-charcoal tracking-tight ml-2">StudioVaultPH</span>
                </Link>
            </div>

            <main className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-4 mb-10 text-center">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                        Complete Your <span className="text-burgundy italic">Profile.</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] max-w-xs mx-auto leading-relaxed">
                        To provide the best experience and ensure your safety, we need a few more details.
                    </p>
                </div>

                <div className="earth-card p-1 bg-white rounded-2xl shadow-tight mb-10 overflow-hidden border border-border-grey">
                    <div className="p-10">
                         <CustomerOnboardingForm profile={profile} />
                    </div>
                </div>

                <div className="text-center pt-8 border-t border-border-grey">
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
                        Your information is securely stored and only used to enhance your experience within the StudioVaultPH ecosystem.
                    </p>
                </div>
            </main>
        </div>
    )
}
