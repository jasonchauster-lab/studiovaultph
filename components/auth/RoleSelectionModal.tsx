'use client'

import { X, Sparkles, BookOpen, Building2, ArrowRight, Star, Users, Layers } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'

interface RoleSelectionModalProps {
    isOpen: boolean
    onClose: () => void
}

const OPTIONS = [
    {
        role: 'customer',
        title: "Client",
        tagline: "Book & Discover",
        description: "Find top-tier instructors and book your favorite Pilates sessions in just a few taps.",
        icon: <Star className="w-5 h-5" />,
        accentColor: "text-forest",
        accentBg: "bg-forest/8",
        accentBorder: "group-hover:border-forest/40",
        accentTop: "bg-forest",
        buttonColor: "bg-forest text-white hover:brightness-110",
        target: "/login?role=customer&mode=signup"
    },
    {
        role: 'instructor',
        title: "Instructor",
        tagline: "Teach & Grow",
        description: "Manage your schedule, book premium studios, and grow your client base effortlessly.",
        icon: <Users className="w-5 h-5" />,
        accentColor: "text-charcoal",
        accentBg: "bg-charcoal/5",
        accentBorder: "group-hover:border-charcoal/30",
        accentTop: "bg-charcoal",
        buttonColor: "bg-charcoal text-white hover:brightness-125",
        target: "/login?role=instructor&mode=signup"
    },
    {
        role: 'studio',
        title: "Studio",
        tagline: "List & Earn",
        description: "Optimize your space, manage equipment, and connect with the best local instructors.",
        icon: <Building2 className="w-5 h-5" />,
        accentColor: "text-rose-gold-deep",
        accentBg: "bg-[#ebd3cf]/40",
        accentBorder: "group-hover:border-rose-gold/40",
        accentTop: "bg-[#c9a197]",
        buttonColor: "bg-[#c9a197] text-white hover:brightness-110",
        target: "/login?role=studio&mode=signup"
    }
]

export default function RoleSelectionModal({ isOpen, onClose }: RoleSelectionModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-charcoal/75 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl h-auto max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-border-grey will-change-transform">

                {/* Header */}
                <div className="px-6 pt-6 pb-5 flex justify-between items-start border-b border-cream-100">
                    <div className="flex items-center gap-3">
                        <Image src="/logo2.jpg" alt="StudioVault Logo" width={36} height={36} className="w-9 h-9 object-contain rounded-lg" />
                        <div>
                            <h2 className="text-xl font-serif font-bold text-charcoal tracking-tight leading-tight">Join StudioVaultPH</h2>
                            <p className="text-[10px] font-black text-charcoal/35 uppercase tracking-[0.25em] mt-0.5">Choose your role to get started</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Modal"
                        className="p-1.5 text-charcoal/40 hover:text-charcoal hover:bg-cream-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Role Cards */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {OPTIONS.map((opt) => (
                        <Link
                            key={opt.role}
                            href={opt.target}
                            className={`group relative flex flex-col rounded-xl border border-cream-200 bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${opt.accentBorder}`}
                        >
                            {/* Top accent bar */}
                            <div className={`h-1 w-full ${opt.accentTop} opacity-70`} />

                            <div className="p-5 flex flex-col flex-1">
                                {/* Icon + Tagline */}
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className={`w-9 h-9 rounded-xl ${opt.accentBg} flex items-center justify-center shrink-0 ${opt.accentColor} transition-all group-hover:scale-110 duration-300`}>
                                        {opt.icon}
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${opt.accentColor} opacity-70`}>
                                        {opt.tagline}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-serif font-bold text-charcoal leading-tight mb-2">
                                    {opt.title}
                                </h3>

                                {/* Description */}
                                <p className="text-charcoal/55 text-[12.5px] font-medium leading-relaxed flex-1">
                                    {opt.description}
                                </p>

                                {/* Button */}
                                <div className={`mt-5 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] transition-all flex items-center justify-center gap-2 ${opt.buttonColor} shadow-sm`}>
                                    Get Started
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 pt-1 text-center">
                    <p className="text-[11px] font-bold text-charcoal/40 uppercase tracking-[0.15em]">
                        Already have an account?{' '}
                        <Link href="/login" className="text-forest hover:text-charcoal transition-colors border-b border-forest/30 hover:border-charcoal pb-px ml-1">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
