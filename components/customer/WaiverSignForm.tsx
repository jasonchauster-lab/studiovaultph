'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { signWaiverAction } from '@/app/(storefront)/s/[slug]/onboarding/waiver/actions'

interface WaiverSignFormProps {
    studio: any
    template: {
        id: string
        title: string
        content: string
    } | null
    profile: any
}

export default function WaiverSignForm({ studio, template, profile }: WaiverSignFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSigned, setIsSigned] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const router = useRouter()

    const waiverTitle = template?.title || 'Waiver and Indemnification Form'
    const waiverContent = template?.content || `
        <h3>Acknowledgment of Risk</h3>
        <p>By participating in any session, class, or program offered by <strong>${studio.name}</strong>, the client acknowledges the <strong>inherent risks</strong> associated with physical activity, including but not limited to:</p>
        <ul>
            <li>Slipping or falling</li>
            <li>Muscle strain, sprains, or fatigue</li>
            <li>Pre-existing medical conditions</li>
            <li>Complications from movement (including in rare cases, serious injury, paralysis, or death)</li>
        </ul>
        <p>With full awareness of these risks, the client voluntarily <strong>chooses to participate</strong> and <strong>assumes full responsibility</strong> for any injury, loss, or damage incurred.</p>

        <h3>Waiver of Liability</h3>
        <p>The client hereby <strong>fully and forever RELEASES, WAIVES, AND DISCHARGES</strong> ${studio.name}, its owners, instructors, employees, affiliates, and agents (collectively, "Released Parties") from any and all liability, claims, demands, or causes of action—whether known or unknown—arising from or relating to participation in any of the studio's services, programs, or use of its facilities and equipment. This includes claims of <strong>passive or active negligence</strong> on the part of the Released Parties.</p>

        <h3>Studio Policies and Booking Terms</h3>
        <p>By proceeding with a booking, the client further agrees to the following:</p>
        <ul>
            <li><strong>Grip Socks Requirement:</strong> Grip socks are mandatory for hygiene and safety. Available for purchase in-studio if needed.</li>
            <li><strong>Arrival Time:</strong> Clients are encouraged to arrive <strong>5–10 minutes early</strong> to prepare for class.</li>
            <li><strong>Late Cancellation Policy:</strong> Cancellations and rescheduling must be made <strong>at least 8 hours in advance</strong>. Failure to do so may result in a fee or forfeiture of a session credit.</li>
            <li><strong>Medical Clearance:</strong> Clients with injuries, medical conditions, or who are pregnant are encouraged to consult with a healthcare professional before joining classes. Participation is voluntary and done at one's own discretion.</li>
        </ul>

        <h3>Acceptance of Terms</h3>
        <p>By booking a class, session, or program with ${studio.name}—either directly or through an authorized representative—the client:</p>
        <ul>
            <li>Acknowledges that they have <strong>read, understood, and agreed</strong> to all terms of this waiver and studio policy.</li>
            <li>Agrees that their booking serves as <strong>confirmation of their acceptance</strong> of this release, whether or not a physical signature is collected.</li>
            <li>Understands that no oral or written representations not included in this document will alter the terms of this waiver.</li>
        </ul>
    `

    // Canvas Logic
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set high DPI support
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        ctx.scale(dpr, dpr)
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.strokeStyle = '#27272a' // Zinc-800
    }, [])

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true)
        setIsSigned(true)
        draw(e)
    }

    const endDrawing = () => {
        setIsDrawing(false)
        const ctx = canvasRef.current?.getContext('2d')
        ctx?.beginPath() // Reset path
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const rect = canvas.getBoundingClientRect()
        let x, y
        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left
            y = e.touches[0].clientY - rect.top
        } else {
            x = e.clientX - rect.left
            y = e.clientY - rect.top
        }

        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            setIsSigned(false)
        }
    }

    const handleSubmit = async () => {
        if (!isSigned) {
            setError("Please provide your signature to proceed.")
            return
        }

        setIsLoading(true)
        setError(null)

        const signatureData = canvasRef.current?.toDataURL('image/png')

        try {
            const result = await signWaiverAction({
                studioId: studio.id,
                signatureData: signatureData || '',
                waiverTitle: waiverTitle,
                waiverContent: waiverContent
            })

            if (result.success) {
                const nextPath = studio?.slug && studio.slug !== 'marketplace' 
                    ? `/s/${studio.slug}/dashboard` 
                    : '/customer'
                router.push(nextPath)
                router.refresh()
            } else {
                setError(result.error || "Failed to save waiver.")
                setIsLoading(false)
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.")
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 pb-20">
            {/* Elegant Header Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-off-white/50 border border-zinc-100 rounded-[2.5rem] p-8 md:p-12 shadow-tight text-center space-y-4"
            >
                <h1 className="text-3xl md:text-4xl font-serif font-black text-charcoal-900 leading-tight">
                    Welcome to {studio.name} 👋
                </h1>
                <p className="text-xs md:text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">
                    You are required to read and submit the waiver form below. <br />
                    <span className="text-burgundy">All fields are mandatory.</span>
                </p>
            </motion.div>

            {/* Waiver Document Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-xl overflow-hidden"
            >
                <div className="p-8 md:p-16 space-y-12">
                    <div className="space-y-4">
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-charcoal-900 border-b border-zinc-100 pb-6">
                            {waiverTitle}
                        </h2>
                        <div 
                            className="prose prose-sm prose-zinc max-w-none text-zinc-600 leading-relaxed font-medium space-y-6"
                            dangerouslySetInnerHTML={{ __html: waiverContent }}
                        />
                    </div>

                    {/* Signature Area */}
                    <div className="space-y-6 pt-12 border-t border-zinc-100">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                                Signature
                            </label>
                            <button 
                                onClick={clearSignature}
                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-burgundy transition-colors"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Clear
                            </button>
                        </div>

                        <div className="relative group/canvas">
                            <div className="absolute inset-0 bg-off-white rounded-3xl -z-10 transition-colors group-hover/canvas:bg-zinc-50" />
                            <canvas 
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={endDrawing}
                                onMouseOut={endDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={endDrawing}
                                className="w-full h-48 md:h-64 cursor-crosshair touch-none rounded-3xl border border-zinc-100"
                            />
                            {!isSigned && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                    <p className="text-xs font-serif italic text-zinc-400">Sign here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex flex-col items-center gap-6 text-center">
                    {error && (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-burgundy animate-in slide-in-from-top-2">
                            {error}
                        </p>
                    )}
                    
                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full max-w-md h-16 bg-charcoal-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-charcoal group active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <Check className={clsx("w-5 h-5 transition-all", isSigned ? "scale-100" : "scale-0 w-0")} />
                                Submit Waiver
                            </div>
                        )}
                    </button>
                    
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        By clicking submit, you legally acknowledge that you have read and agreed to the waiver above.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
