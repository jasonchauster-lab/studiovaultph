import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ShieldCheck, FileText, Scale, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PolicyPageProps {
    params: Promise<{
        slug: string
        type: string
    }>
}

const DEFAULT_POLICIES: Record<string, { title: string; content: string }> = {
    terms: {
        title: 'Terms of Service',
        content: `Welcome to our studio. By using our services, you agree to the following terms:
        
1. Use of Services: You agree to use our services for lawful purposes and in accordance with these terms.
2. Booking & Cancellation: Bookings are subject to availability. Please refer to our cancellation policy for details on refunds and rescheduling.
3. Health & Safety: You are responsible for ensuring you are physically fit to participate in classes. Please inform instructors of any injuries or health conditions.
4. Privacy: Your use of our services is also governed by our Privacy Policy.
5. Liability: The studio is not liable for any personal injury or loss of property occurring on the premises.`
    },
    privacy: {
        title: 'Privacy Policy',
        content: `Your privacy is important to us. This policy outlines how we collect, use, and protect your information:

1. Data Collection: We collect information you provide during registration, such as your name, email, and contact details.
2. Use of Information: We use your data to manage bookings, process payments, and communicate studio updates.
3. Data Sharing: We do not sell your personal information. We may share data with trusted third-party providers (e.g., payment processors) necessary to provide our services.
4. Security: We implement industry-standard security measures to protect your data.
5. Your Rights: You have the right to access, update, or request deletion of your personal information at any time.`
    },
    refund: {
        title: 'Refund Policy',
        content: `Our refund policy ensures fair treatment for both the studio and our clients:

1. Package Refunds: Unused packages may be eligible for a partial refund within 7 days of purchase, subject to a processing fee.
2. Class Cancellations: Cancellations made outside the late-cancellation window (usually 12-24 hours) will result in a credit return. Late cancellations are non-refundable.
3. Membership Cancellations: Memberships can be cancelled with a notice period as specified in your agreement.
4. Exceptional Circumstances: We may offer refunds or credits for medical reasons with a valid doctor's note.`
    }
}

export default async function StudioPolicyPage({ params }: PolicyPageProps) {
    const { slug, type } = await params
    const policyType = type.toLowerCase()

    if (!['terms', 'privacy', 'refund'].includes(policyType)) {
        notFound()
    }

    const supabase = await createClient()

    // 1. Get Studio ID by Slug
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('slug', slug)
        .single()

    if (!studio) notFound()

    // 2. Fetch the specific policy
    const { data: policy } = await supabase
        .from('studio_policies')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('type', policyType)
        .eq('status', 'Active')
        .maybeSingle()

    const title = policy?.title || DEFAULT_POLICIES[policyType].title
    const content = policy?.content || DEFAULT_POLICIES[policyType].content

    const icons = {
        terms: Scale,
        privacy: ShieldCheck,
        refund: FileText
    }
    const Icon = (icons as any)[policyType] || FileText

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="border-b border-zinc-100 bg-zinc-50/30">
                <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
                    <Link 
                        href={`/s/${slug}`}
                        className="inline-flex items-center gap-2 text-[10px] font-black text-zinc-400 hover:text-[#2D3282] uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Studio
                    </Link>
                    
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-[2rem] border border-zinc-100 shadow-sm flex items-center justify-center text-[#2D3282]">
                            <Icon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tightest leading-none mb-2">
                                {title}
                            </h1>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                                {studio.name} &bull; Legal Center
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
                <div className="prose prose-zinc prose-sm md:prose-base max-w-none">
                    <div className="whitespace-pre-wrap font-medium text-zinc-600 leading-relaxed text-sm md:text-base">
                        {content}
                    </div>
                </div>
                
                {!policy && (
                    <div className="mt-16 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-4">
                        <div className="p-2 bg-white rounded-xl text-[#2D3282] shadow-sm">
                            <Scale className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-[#2D3282] uppercase tracking-widest">Platform Note</p>
                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                This is a standardized policy provided by StudioVault. Your studio may have specific terms not listed here.
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-24 pt-12 border-t border-zinc-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                        Last Updated: {policy?.updated_at ? new Date(policy.updated_at).toLocaleDateString() : 'Initial Release'}
                    </p>
                    <Link 
                        href={`/s/${slug}`}
                        className="px-8 py-3 bg-[#2D3282] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-900 transition-all shadow-lg text-center"
                    >
                        Return to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
