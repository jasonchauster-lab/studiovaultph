'use client'

import { useState } from 'react'
import { Layout, Rocket, Globe, Palette, ArrowRight, Loader2 } from 'lucide-react'
import { enableCma } from '@/app/(dashboard)/studio/studio-actions'
import { useRouter } from 'next/navigation'

export default function StudioCmaOptIn({ studioId }: { studioId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleEnable = async () => {
        setLoading(true)
        const res = await enableCma(studioId)
        if (res.success) {
            router.refresh()
        } else {
            alert(res.error || 'Failed to enable Website Builder')
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="atelier-card overflow-hidden bg-forest text-white relative">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-burgundy/10 rounded-full -ml-32 -mb-32 blur-2xl" />

                <div className="relative p-12 space-y-10 text-center">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                            <Rocket className="w-3.5 h-3.5 text-white" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">New Feature</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-serif leading-tight">
                            Elevate Your Studio with a <br/>
                            <span className="text-stone-300">Premium Website</span>
                        </h1>
                        <p className="text-white/60 text-lg max-w-2xl mx-auto font-medium">
                            Join the Studio Vault Ecosystem. Launch a private, branded website for your clients to book directly, view your schedule, and more.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {[
                            { 
                                icon: Globe, 
                                title: "Custom Domains", 
                                desc: "Connect your own .com or .studio domain for ultimate branding." 
                            },
                            { 
                                icon: Palette, 
                                title: "Visual Editor", 
                                desc: "Zero-code builder to customize your theme, colors, and layout." 
                            },
                            { 
                                icon: Layout, 
                                title: "Unified Schedule", 
                                desc: "Synced directly with your Studio Vault slots and instructor availability." 
                            }
                        ].map((item, i) => (
                            <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm space-y-3">
                                <item.icon className="w-6 h-6 text-stone-300" />
                                <h3 className="font-serif text-lg">{item.title}</h3>
                                <p className="text-white/40 text-xs leading-relaxed font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6">
                        <button 
                            onClick={handleEnable}
                            disabled={loading}
                            className="bg-white text-forest px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-stone-100 hover:scale-[1.02] transition-all flex items-center gap-3 mx-auto shadow-xl disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Register for Website Builder
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em]">
                    Integrated with Studio Vault PH Marketplace
                </p>
            </div>
        </div>
    )
}
