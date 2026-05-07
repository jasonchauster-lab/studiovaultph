import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import CustomerOnboardingForm from '@/components/customer/CustomerOnboardingForm'
import { headers, cookies } from 'next/headers'
import { getStudioBySlug } from '@/lib/studio/website'
import { clsx } from 'clsx'

export default async function CustomerOnboardingPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
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

    // Determine portal type for design consistency
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const isStudioPortal = host.includes('studiovault.co') || host.includes('studiovault.local')

    // If profile is already complete, redirect to dashboard
    if (profile?.date_of_birth && profile?.contact_number && profile?.first_name) {
        redirect('/customer')
    }

    const searchParams = await props.searchParams
    const requestedSlug = searchParams?.slug as string
    
    // Try to find if user is onboarding from a specific studio context
    const cookieStore = await cookies()
    const lastSlug = cookieStore.get('last_studio_slug')?.value
    const studioSlug = requestedSlug || lastSlug || (host.includes('.') ? host.split('.')[0] : null)
    
    let currentStudio = null
    if (studioSlug && studioSlug !== 'studiovault' && studioSlug !== 'studiovaultph') {
        currentStudio = await getStudioBySlug(studioSlug)
    }

    return (
        <div className={clsx(
            "min-h-screen flex flex-col items-center py-12 md:py-20 px-6 relative selection:bg-forest/10 transition-colors duration-1000",
            isStudioPortal ? "bg-white" : "bg-off-white"
        )}>
            {/* Logo Header */}
            <div className="w-full max-w-xl mb-16 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
                <Link href={currentStudio ? `/s/${currentStudio.slug}` : "/"} className="inline-flex flex-col items-center gap-4 group">
                    <div className="bg-white p-4 rounded-3xl shadow-ambient group-hover:rotate-2 transition-transform border border-border-grey/50">
                        {currentStudio?.logo_url ? (
                             <Image src={currentStudio.logo_url} alt={currentStudio.name} width={120} height={60} className="h-12 w-auto object-contain" />
                        ) : (
                             <Image src="/logo2.jpg" alt="StudioVault Logo" width={48} height={48} className="w-12 h-12 object-contain" />
                        )}
                    </div>
                </Link>
            </div>

            <main className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="space-y-4 mb-14 text-center">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                        {currentStudio ? (
                            <>Welcome to <span className="text-[var(--primary-brand)]">{currentStudio.name}.</span></>
                        ) : (
                            <>Complete your <span className="text-burgundy italic">profile.</span></>
                        )}
                    </h1>
                </div>

                <div className={clsx(
                    "w-full transition-all duration-1000",
                    isStudioPortal ? "" : "bg-white rounded-[2.5rem] shadow-ambient border border-border-grey/50 p-8 md:p-14"
                )}>
                     <CustomerOnboardingForm profile={profile} studio={currentStudio} />
                </div>

                <div className="text-center pt-16 border-t border-border-grey/30 mt-12">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] leading-relaxed max-w-xs mx-auto opacity-60">
                        Your information is securely stored within the StudioVaultPH ecosystem.
                    </p>
                </div>
            </main>
        </div>
    )
}
