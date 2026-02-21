'use client'

import { X, Sparkles, User, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'
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
            icon: <Sparkles className="w-6 h-6 text-green-600" />,
            bgColor: "bg-green-50",
            hoverBorder: "hover:border-green-200",
            buttonColor: "bg-green-700 hover:bg-green-800",
            target: "/login?role=customer&mode=signup"
        },
        {
            role: 'instructor',
            title: "I'm an Instructor",
            description: "Grow your freelance practice. Book world-class studios and specialized equipment.",
            icon: <User className="w-6 h-6 text-charcoal-700" />,
            bgColor: "bg-charcoal-50",
            hoverBorder: "hover:border-charcoal-200",
            buttonColor: "bg-charcoal-900 hover:bg-charcoal-800",
            target: "/login?role=instructor&mode=signup"
        },
        {
            role: 'studio',
            title: "I own a Studio",
            description: "Monetize your empty hours. List your equipment for top-tier instructors.",
            icon: <DollarSign className="w-6 h-6 text-charcoal-700" />,
            bgColor: "bg-white",
            hoverBorder: "hover:border-cream-300",
            buttonColor: "bg-white text-charcoal-900 border border-cream-300 hover:bg-cream-50",
            target: "/login?role=studio&mode=signup"
        }
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="p-6 sm:p-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-3xl font-serif text-charcoal-900 mb-2">Join StudioVaultPH</h2>
                            <p className="text-charcoal-500">Choose how you'd like to use the platform.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-charcoal-400 hover:text-charcoal-900 hover:bg-cream-50 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {options.map((opt) => (
                            <Link
                                key={opt.role}
                                href={opt.target}
                                className={`group flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl border border-cream-200 transition-all ${opt.bgColor} ${opt.hoverBorder} hover:shadow-lg hover:-translate-y-0.5`}
                            >
                                <div className="w-14 h-14 shrink-0 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-cream-100">
                                    {opt.icon}
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="text-lg font-bold text-charcoal-900 mb-1 flex items-center justify-center sm:justify-start gap-2">
                                        {opt.title}
                                    </h3>
                                    <p className="text-sm text-charcoal-500 line-clamp-2">
                                        {opt.description}
                                    </p>
                                </div>
                                <div className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${opt.buttonColor === 'bg-white text-charcoal-900 border border-cream-300 hover:bg-cream-50' ? opt.buttonColor : 'text-white ' + opt.buttonColor}`}>
                                    Get Started
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-cream-100 text-center">
                        <p className="text-sm text-charcoal-400">
                            Already have an account? {' '}
                            <Link href="/login" className="text-charcoal-900 font-bold hover:underline">
                                Log In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
