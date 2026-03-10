'use client'

import { X, Sparkles, User, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect } from 'react'

interface RoleSelectionModalProps {
    isOpen: boolean
    onClose: () => void
}

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

    const options = [
        {
            role: 'customer',
            title: "I'm a Client",
            description: "Discover top instructors and book premium studio space at off-peak rates.",
            icon: <Sparkles className="w-6 h-6 text-forest" />,
            bgColor: "bg-off-white",
            hoverBorder: "hover:border-forest/30",
            buttonColor: "bg-forest text-white hover:brightness-110",
            target: "/login?role=customer&mode=signup"
        },
        {
            role: 'instructor',
            title: "I'm an Instructor",
            description: "Grow your freelance practice. Book world-class studios and specialized equipment.",
            icon: <User className="w-6 h-6 text-charcoal" />,
            bgColor: "bg-off-white",
            hoverBorder: "hover:border-forest/30",
            buttonColor: "bg-charcoal text-white hover:brightness-110",
            target: "/login?role=instructor&mode=signup"
        },
        {
            role: 'studio',
            title: "I own a Studio",
            description: "Monetize your empty hours. List your equipment for top-tier instructors.",
            icon: <DollarSign className="w-6 h-6 text-forest" />,
            bgColor: "bg-white",
            hoverBorder: "hover:border-forest/30",
            buttonColor: "bg-white text-charcoal border border-border-grey hover:bg-off-white",
            target: "/login?role=studio&mode=signup"
        }
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-border-grey">
                <div className="p-8 sm:p-12">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Image src="/logo.png" alt="StudioVault Logo" width={40} height={40} className="w-10 h-10 object-contain" />
                                <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Join StudioVaultPH</h2>
                            </div>
                            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em]">Establish your professional presence</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate hover:text-charcoal hover:bg-off-white rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid gap-6">
                        {options.map((opt) => (
                            <Link
                                key={opt.role}
                                href={opt.target}
                                className={`group flex flex-col sm:flex-row items-center gap-6 p-6 rounded-lg border border-border-grey transition-all ${opt.bgColor} ${opt.hoverBorder} hover:shadow-card hover:-translate-y-0.5`}
                            >
                                <div className="w-16 h-16 shrink-0 rounded-lg bg-white shadow-tight flex items-center justify-center border border-border-grey group-hover:border-forest/20 transition-all">
                                    {opt.icon}
                                </div>
                                <div className="flex-1 text-center sm:text-left space-y-2">
                                    <h3 className="text-xl font-serif font-bold text-charcoal">
                                        {opt.title}
                                    </h3>
                                    <p className="text-slate text-[13px] font-medium leading-relaxed line-clamp-2">
                                        {opt.description}
                                    </p>
                                </div>
                                <div className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${opt.buttonColor.includes('bg-white') ? opt.buttonColor : opt.buttonColor}`}>
                                    Get Started
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-12 pt-10 border-t border-border-grey text-center">
                        <p className="text-[11px] font-bold text-slate uppercase tracking-[0.2em]">
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
