import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Shield, Star } from 'lucide-react'
import Link from 'next/link'
import Avatar from '@/components/shared/Avatar'
import StaffManagementClient from '@/components/studio/StaffManagementClient'
import { getCachedStudio, getCachedUser } from '@/lib/studio/data'

export default async function StudioStaffPage() {
    const user = await getCachedUser()
    if (!user) redirect('/login')

    const supabase = await createClient()
    const studio = await getCachedStudio()

    if (!studio) {
        return <div className="p-8 text-zinc-400">Studio not found.</div>
    }

    // Fetch Members
    const { data: members } = await supabase
        .from('studio_members')
        .select(`
            id,
            role,
            created_at,
            profile:profiles(id, full_name, email, avatar_url)
        `)
        .eq('studio_id', studio.id)
        .eq('is_deleted', false)

    const isPro = studio.subscription_tier === 'pro'

    return (
        <div className="pt-20 md:pt-12 space-y-12 pb-20 max-w-5xl mx-auto px-6 font-sans bg-zinc-50/30 min-h-screen">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tightest leading-tight">
                    Team & <span className="text-zinc-300">Staff</span>
                </h1>
                <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                    Manage your studio's instructors and administrators
                </p>
            </div>

            {!isPro && (
                <div className="p-8 bg-white border border-zinc-100 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-center md:text-left relative z-10">
                        <h3 className="text-xl font-black text-zinc-900 mb-2">Solo Operator Mode</h3>
                        <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                            The Starter tier is designed for solo owners. To grant dashboard access to your staff or instructors, please upgrade to the <span className="text-indigo-600 font-black">Pro Tier</span>.
                        </p>
                    </div>
                    <Link 
                        href="/studio/settings/billing"
                        className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg whitespace-nowrap relative z-10"
                    >
                        View Pro Features
                    </Link>
                </div>
            )}

            {/* Staff List */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 text-zinc-200">
                    <Users className="w-5 h-5" />
                    <div className="h-px flex-1 bg-current opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Direct Members</span>
                    <div className="h-px flex-1 bg-current opacity-20" />
                </div>

                <div className="space-y-4">
                    {/* Owner Card */}
                    <div className="p-8 bg-white border border-zinc-100 rounded-[2rem] shadow-sm flex items-center gap-8 group hover:border-indigo-600/20 transition-all duration-500">
                        <Avatar 
                            src={user.user_metadata?.avatar_url}
                            fallbackName={user.user_metadata?.full_name || 'Owner'}
                            size={64}
                            className="border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-black text-zinc-900 tracking-tight">{user.user_metadata?.full_name || 'Studio Owner'}</h3>
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                    Owner / Admin
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{user.email}</p>
                        </div>
                    </div>

                    <StaffManagementClient 
                        studioId={studio.id}
                        initialMembers={members as any || []}
                        isPro={isPro}
                    />
                </div>
            </div>
        </div>
    )
}
