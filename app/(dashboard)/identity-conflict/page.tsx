'use client'

import { AlertOctagon, LogOut, ArrowRight, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function IdentityConflictPage() {
    const supabase = createClient()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-off-white flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="max-w-xl w-full">
                {/* Visual Header */}
                <div className="bg-white rounded-[2.5rem] p-10 sm:p-16 border-2 border-border-grey shadow-tight flex flex-col items-center text-center relative overflow-hidden">
                    {/* Background Decorative Element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-burgundy/5 rounded-bl-full -mr-16 -mt-16" />
                    
                    <div className="w-20 h-20 bg-burgundy/10 rounded-3xl flex items-center justify-center mb-8">
                        <ShieldAlert className="w-10 h-10 text-burgundy" />
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-serif text-burgundy mb-6 leading-tight">
                        Identity Conflict Detected
                    </h1>

                    <div className="space-y-4 text-muted-burgundy leading-relaxed text-sm sm:text-base">
                        <p>
                            We&apos;ve detected that this account is already registered as a <span className="font-bold text-burgundy">Customer or Instructor</span> on the Studio Vault Marketplace.
                        </p>
                        <p>
                            To maintain professional and financial separation, your business profile must use a <span className="font-bold text-burgundy tracking-wide italic">different email address</span> from your consumer account.
                        </p>
                    </div>

                    <div className="mt-10 w-full flex flex-col gap-3">
                        <button 
                            onClick={handleSignOut}
                            className="w-full h-14 bg-burgundy text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-burgundy/90 transition-all active:scale-[0.98] shadow-lg shadow-burgundy/20"
                        >
                            Log Out & Use Different Account
                            <LogOut className="w-5 h-5" />
                        </button>
                        
                        <a 
                            href="https://studiovaultph.com" 
                            className="w-full h-14 bg-white text-burgundy border-2 border-border-grey rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-off-white transition-all active:scale-[0.98]"
                        >
                            Return to Marketplace
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                {/* Footer Help */}
                <div className="mt-8 text-center">
                    <p className="text-xs font-bold text-muted-burgundy opacity-40 uppercase tracking-widest">
                        Need Help? Contact support@studiovault.co
                    </p>
                </div>
            </div>
        </div>
    )
}
