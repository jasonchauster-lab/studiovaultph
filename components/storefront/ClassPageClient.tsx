'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
    Calendar, 
    Clock, 
    MapPin, 
    User, 
    ChevronRight, 
    Ticket, 
    AlertCircle, 
    Loader2,
    CheckCircle,
    Navigation,
    ShieldAlert,
    Info
} from 'lucide-react'
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface ClassPageClientProps {
    slot: any
    slug: string
    branchSlug: string
    userPlans: any[]
    isLoggedIn: boolean
    studioBranding: any
    refundPolicy: any
}

export default function ClassPageClient({
    slot,
    slug,
    branchSlug,
    userPlans,
    isLoggedIn,
    studioBranding,
    refundPolicy
}: ClassPageClientProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
        userPlans.length > 0 ? userPlans[0].id : null
    )
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const mounted = useRef(true)

    useEffect(() => {
        return () => {
            mounted.current = false
        }
    }, [])

    const service = slot.service
    const instructor = slot.instructor
    const outlet = slot.outlet
    const studio = slot.studio

    const startTime = formatTo12Hour(slot.start_time)
    const dateStr = formatManilaDateStr(slot.date)
    const slotsLeft = (slot.pax_capacity || 0) - (slot.bookings_count?.[0]?.count || 0)

    const primaryColor = studioBranding?.primaryColor || '#1a1f2c'

    const handleBook = async () => {
        if (!isLoggedIn) {
            router.push(`/login?studio=${slug}&redirect=/s/${slug}/${branchSlug}/class/${slot.id}`)
            return
        }

        if (!selectedPlanId && userPlans.length > 0) {
            setError('Please select a package to use.')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const result = await requestBooking(
                slot.id,
                slot.instructor_id,
                1,
                Object.keys(slot.equipment || {})[0] || 'MAT',
                undefined,
                undefined,
                'studio',
                undefined,
                null,
                null,
                true,
                'credit',
                selectedPlanId || undefined
            )

            if (result.error) {
                if (mounted.current) setError(result.error)
            } else {
                if (mounted.current) setSuccess(true)
            }
        } catch (err: any) {
            if (mounted.current) setError('Something went wrong. Please try again.')
        } finally {
            if (mounted.current) setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-700 max-w-2xl mx-auto">
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative w-32 h-32 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 transform hover:scale-110 transition-transform duration-500">
                        <CheckCircle className="w-16 h-16" />
                    </div>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-serif font-black text-charcoal-900 mb-6 tracking-tightest leading-none">
                    You're Booked!
                </h1>
                <p className="text-lg text-charcoal-500 font-medium max-w-md mx-auto leading-relaxed mb-12">
                    Your spot in <span className="text-charcoal-900 font-bold">{service?.name}</span> with <span className="text-charcoal-900 font-bold">{instructor?.full_name}</span> is confirmed. 
                    We've sent a confirmation email to your inbox.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                    <Link 
                        href={`/s/${slug}/${branchSlug}/dashboard?tab=bookings`}
                        className="px-8 py-5 bg-charcoal-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-charcoal-800 transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                        View My Bookings
                    </Link>
                    <Link 
                        href={`/s/${slug}/${branchSlug}/schedule`}
                        className="px-8 py-5 bg-white border-2 border-charcoal-900 text-charcoal-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-50 transition-all flex items-center justify-center"
                    >
                        Back to Schedule
                    </Link>
                </div>
            </div>
        )
    }

    const lateCancelHours = slot.studio?.late_cancel_hours || 12
    const policyContent = refundPolicy?.content || `Cancellations must be made at least ${lateCancelHours} hours before your scheduled class to avoid penalties. Late cancellations (within ${lateCancelHours} hours) will be charged a rescheduling fee or credit deduction.`

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20 font-atelier">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-charcoal-400 mb-8 overflow-x-auto whitespace-nowrap">
                <Link href={`/s/${slug}/${branchSlug}/schedule`} className="hover:text-charcoal-900 transition-colors">Schedules</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-charcoal-900">{service?.name} with {instructor?.full_name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
                {/* Left Column: Details & Selection */}
                <div className="lg:col-span-7 space-y-16">
                    <section>
                        <h1 className="text-4xl md:text-5xl font-serif font-black text-charcoal-900 mb-12 tracking-tightest">Book this class</h1>
                        
                        <div className="space-y-6">
                            {isLoggedIn ? (
                                userPlans.length > 0 ? (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-charcoal-400 block ml-1">Use a package credit</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {userPlans.map((plan: any) => (
                                                <button
                                                    key={plan.id}
                                                    onClick={() => setSelectedPlanId(plan.id)}
                                                    className={clsx(
                                                        "p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between text-left group",
                                                        selectedPlanId === plan.id 
                                                            ? "bg-white border-charcoal-900 shadow-xl scale-[1.01]" 
                                                            : "bg-zinc-50 border-transparent hover:border-zinc-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className={clsx(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                                            selectedPlanId === plan.id ? "bg-charcoal-900 text-white" : "bg-white text-charcoal-400"
                                                        )}>
                                                            <Ticket className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-charcoal-900">{plan.packages?.name || plan.memberships?.name}</h3>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-400 mt-1">
                                                                {plan.remaining_credits} Credits Remaining
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={clsx(
                                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                        selectedPlanId === plan.id ? "bg-charcoal-900 border-charcoal-900" : "border-zinc-300"
                                                    )}>
                                                        {selectedPlanId === plan.id && <CheckCircle className="w-4 h-4 text-white" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <Link 
                                            href={`/s/${slug}/${branchSlug}/packages`}
                                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-charcoal-400 hover:text-charcoal-900 transition-all mt-4 ml-1"
                                        >
                                            Buy another package <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="p-8 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2.5rem] text-center space-y-6">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-tight mx-auto flex items-center justify-center text-charcoal-300">
                                            <Ticket className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-serif font-black text-charcoal-900 mb-2">No active packages</h3>
                                            <p className="text-xs text-charcoal-500 font-medium max-w-xs mx-auto leading-relaxed">You need an active package or membership to book this class.</p>
                                        </div>
                                        <Link 
                                            href={`/s/${slug}/${branchSlug}/packages`}
                                            className="inline-flex px-8 py-4 bg-charcoal-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-charcoal-800 transition-all shadow-xl"
                                        >
                                            Buy a package
                                        </Link>
                                    </div>
                                )
                            ) : (
                                <div className="p-8 bg-zinc-50 border-2 border-zinc-100 rounded-[2.5rem] text-center space-y-6">
                                    <h3 className="text-xl font-serif font-black text-charcoal-900 mb-2">Login to book</h3>
                                    <p className="text-xs text-charcoal-500 font-medium max-w-xs mx-auto leading-relaxed">Sign in to use your package credits or purchase a new one.</p>
                                    <Link 
                                        href={`/login?studio=${slug}&redirect=/s/${slug}/${branchSlug}/class/${slot.id}`}
                                        className="inline-flex px-8 py-4 bg-charcoal-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-charcoal-800 transition-all shadow-xl"
                                    >
                                        Sign In
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Info Sections */}
                    <div className="space-y-16 border-t border-zinc-100 pt-16">
                        <section>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-charcoal-400 mb-8 flex items-center gap-3">
                                <MapPin className="w-4 h-4" /> Getting there
                            </h2>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-zinc-50 rounded-[2rem] border border-zinc-100">
                                <div>
                                    <p className="font-bold text-charcoal-900 mb-1">{outlet?.name}</p>
                                    <p className="text-xs text-charcoal-500 leading-relaxed max-w-sm">{outlet?.address || studio?.address}</p>
                                </div>
                                <button className="shrink-0 flex items-center gap-2 px-6 py-3 bg-white border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-charcoal-900 transition-all shadow-tight">
                                    <Navigation className="w-3 h-3" /> Get Directions
                                </button>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-charcoal-400 mb-8 flex items-center gap-3">
                                <ShieldAlert className="w-4 h-4" /> Cancellation policy
                            </h2>
                            <div className="p-8 bg-burgundy/5 rounded-[2rem] border border-burgundy/10">
                                <p className="text-xs text-burgundy/80 leading-relaxed font-medium whitespace-pre-wrap">
                                    {policyContent}
                                </p>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Right Column: Sticky Summary Card */}
                <div className="lg:col-span-5">
                    <div className="sticky top-32">
                        <div className="bg-white rounded-[3rem] shadow-ambient border border-zinc-100 overflow-hidden transform hover:scale-[1.01] transition-all duration-500">
                            {/* Class Image */}
                            <div className="h-64 relative bg-zinc-100">
                                <Image 
                                    src={service?.image_url || '/placeholder-class.jpg'} 
                                    alt={service?.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute top-6 left-6">
                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-charcoal-900 shadow-xl">
                                        {service?.difficulty || 'All Levels'}
                                    </span>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-10 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-serif font-black text-charcoal-900 mb-6 tracking-tightest">{service?.name}</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 text-charcoal-600">
                                            <Calendar className="w-5 h-5 opacity-40" />
                                            <span className="text-xs font-bold">{dateStr}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-charcoal-600">
                                            <Clock className="w-5 h-5 opacity-40" />
                                            <div>
                                                <p className="text-xs font-bold">{startTime}, 60 mins</p>
                                                <p className="text-[10px] font-medium opacity-40">Check-in anytime before class begins</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-charcoal-600">
                                            <MapPin className="w-5 h-5 opacity-40" />
                                            <div>
                                                <p className="text-xs font-bold">{outlet?.name}</p>
                                                <p className="text-[10px] font-medium opacity-40">{outlet?.address || studio?.address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-charcoal-600">
                                            <User className="w-5 h-5 opacity-40" />
                                            <span className="text-xs font-bold">{instructor?.full_name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-zinc-100 space-y-4">
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-medium border border-red-100"
                                        >
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <button
                                        onClick={handleBook}
                                        disabled={isSubmitting || (isLoggedIn && userPlans.length === 0)}
                                        className={clsx(
                                            "w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 shadow-xl transform active:scale-95",
                                            isSubmitting ? "bg-charcoal-800" : "bg-charcoal-900 hover:bg-charcoal-800",
                                            "text-white text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                        )}
                                        style={{ backgroundColor: !isSubmitting ? primaryColor : undefined }}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Confirm Booking</>
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-300">
                                            {slotsLeft} slots left
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
