'use client'

import { X, Sparkles, User, DollarSign, ArrowRight } from 'lucide-react'
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
        description: "Find top-tier instructors and book your favorite Pilates sessions in just a few taps.",
        icon: <Sparkles className="w-6 h-6 text-forest" />,
        bgColor: "bg-off-white",
        hoverBorder: "hover:border-forest/30",
        buttonColor: "bg-forest text-white hover:brightness-110",
        target: "/login?role=customer&mode=signup"
    },
    {
        role: 'instructor',
        title: "Instructor",
        description: "Manage your schedule, book premium studios, and grow your client base effortlessly.",
        icon: <User className="w-6 h-6 text-charcoal" />,
        bgColor: "bg-off-white",
        hoverBorder: "hover:border-forest/30",
        buttonColor: "bg-charcoal text-white hover:brightness-110",
        target: "/login?role=instructor&mode=signup"
    },
    {
        role: 'studio',
        title: "Studio",
        description: "Optimize your space, manage equipment, and connect with the best local instructors.",
        icon: <DollarSign className="w-6 h-6 text-forest" />,
        bgColor: "bg-white",
        hoverBorder: "hover:border-forest/30",
        buttonColor: "bg-white text-charcoal border border-border-grey hover:bg-off-white",
        target: "/login?role=studio&mode=signup"
    }
]

export default function RoleSelectionModal({ isOpen, onClose }: RoleSelectionModalProps) {
    // Prevent scrolling when modal is open
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop - Removed blur for performance */}
            <div
                className="absolute inset-0 bg-charcoal/60 animate-in fade-in duration-200 cursor-pointer"
                onClick={onClose}
            />

            {/* Modal Content - Added will-change and reduced durations */}
            <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-white rounded-xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 border border-border-grey overflow-x-hidden will-change-transform">
                <div className="p-8 sm:p-12">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Image src="/logo2.jpg" alt="StudioVault Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                                <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Join StudioVaultPH</h2>
                            </div>
                            <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em]">Establish your professional presence</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close Modal"
                            className="p-2 text-slate-600 hover:text-charcoal hover:bg-off-white rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                        {OPTIONS.map((opt) => (
                            <Link
                                key={opt.role}
                                href={opt.target}
                                className={`group flex flex-col items-center text-center p-8 rounded-xl border border-border-grey transition-all h-full ${opt.bgColor} ${opt.hoverBorder} hover:shadow-card hover:-translate-y-1`}
                            >
                                <div className="w-16 h-16 shrink-0 rounded-2xl bg-white shadow-tight flex items-center justify-center border border-border-grey group-hover:border-forest/20 transition-all mb-6">
                                    {opt.icon}
                                </div>
                                <div className="flex-1 flex flex-col items-center space-y-4 h-full">
                                    <h3 className="text-2xl font-serif font-bold text-charcoal leading-tight">
                                        {opt.title}
                                    </h3>
                                    <p className="text-charcoal/70 text-[14px] font-medium leading-[1.6] md:min-h-[80px]">
                                        {opt.description}
                                    </p>
                                    <div className="pt-4 mt-auto w-full">
                                        <div className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${opt.buttonColor}`}>
                                            Get Started
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-12 pt-10 border-t border-border-grey text-center">
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                            Already have an account? {' '}
                            <Link href="/login" className="text-forest hover:text-charcoal transition-all border-b border-forest/20 hover:border-charcoal pb-0.5 ml-2">
                                Authenticate
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
