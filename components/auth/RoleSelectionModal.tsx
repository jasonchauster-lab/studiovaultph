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
        target: "/login?role=customer&mode=signup"
    },
    {
        role: 'instructor',
        title: "Instructor",
        tagline: "Teach & Grow",
        description: "Manage your schedule, book premium studios, and grow your client base effortlessly.",
        icon: <Users className="w-5 h-5" />,
        target: "/login?role=instructor&mode=signup"
    },
    {
        role: 'studio',
        title: "Studio",
        tagline: "List & Earn",
        description: "Optimize your space, manage equipment, and connect with the best local instructors.",
        icon: <Building2 className="w-5 h-5" />,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            {/* Backdrop — High-End Glass */}
            <div
                className="absolute inset-0 bg-primary/20 backdrop-blur-xl animate-in fade-in duration-500 cursor-pointer"
                onClick={onClose}
            />

            {/* Modal — Ambient Tonal Layering */}
            <div className="relative w-full max-w-2xl h-auto max-h-[90vh] overflow-y-auto bg-surface rounded-3xl shadow-ambient animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 will-change-transform">

                {/* Header — Editorial Breathing Room */}
                <div className="px-8 pt-10 pb-8 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-ambient flex items-center justify-center">
                            <Image src="/logo2.jpg" alt="StudioVault Logo" width={32} height={32} className="w-8 h-8 object-contain" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-primary tracking-tight leading-none">Join Studio Vault PH</h2>
                            <p className="label-atelier mt-2 opacity-60">Choose your role to get started</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close Modal"
                        className="p-2 text-primary/30 hover:text-primary transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Role Cards — Asymmetric Grid */}
                <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {OPTIONS.map((opt) => (
                        <Link
                            key={opt.role}
                            href={opt.target}
                            className="atelier-card !p-6 flex flex-col group relative overflow-hidden"
                        >
                            {/* Icon + Tagline */}
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-primary shadow-sm transition-transform group-hover:scale-110 duration-500">
                                    {opt.icon}
                                </div>
                                <span className="label-atelier text-[8px] opacity-70">
                                    {opt.tagline}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-serif font-bold text-primary leading-tight mb-3">
                                {opt.title}
                            </h3>

                            {/* Description */}
                            <p className="text-muted-surface text-sm leading-relaxed flex-1">
                                {opt.description}
                            </p>

                            {/* Button - Tonal Shift or Gradient */}
                            <div className="mt-8 w-full btn-primary-atelier !py-3 !px-4 !text-[8px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Get Started
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer — Subtle Engagement */}
                <div className="px-8 pb-10 pt-2 text-center">
                    <p className="label-atelier text-[10px] opacity-50 lowercase tracking-widest">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:opacity-100 opacity-80 transition-opacity border-b border-primary/20 pb-0.5 ml-2 font-bold capitalize tracking-tight">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
