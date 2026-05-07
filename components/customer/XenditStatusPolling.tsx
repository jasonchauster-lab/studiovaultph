'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react'

interface XenditStatusPollingProps {
    bookingId?: string
    planId?: string
    checkoutUrl: string
    disabled?: boolean
    disabledMessage?: string
}

export default function XenditStatusPolling({ bookingId, planId, checkoutUrl, disabled, disabledMessage }: XenditStatusPollingProps) {
    const router = useRouter()
    const supabase = createClient()
    const [status, setStatus] = useState<'pending' | 'paid'>('pending')
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        const table = bookingId ? 'bookings' : 'customer_plans'
        const id = bookingId || planId

        if (!id) return

        const channel = supabase
            .channel(`public:${table}:id=eq.${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: table,
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    const newStatus = payload.new.status
                    if (newStatus === 'approved' || newStatus === 'active' || (payload.new.payment_status === 'paid')) {
                        setStatus('paid')
                        setTimeout(() => {
                            router.refresh()
                        }, 2000)
                    }
                }
            )
            .subscribe()

        // Fallback polling every 10 seconds
        const interval = setInterval(() => {
            setSeconds(s => s + 10)
            router.refresh()
        }, 10000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(interval)
        }
    }, [bookingId, planId, router, supabase])

    if (status === 'paid') {
        return (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-green-900 mb-1">Payment Received!</h3>
                <p className="text-sm text-green-700">Your {bookingId ? 'booking' : 'plan'} is now being activated...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-charcoal-100 rounded-2xl p-8 text-center shadow-tight">
                <Loader2 className="w-10 h-10 text-charcoal-900 animate-spin mx-auto mb-6" />
                <h3 className="text-xl font-serif font-black text-charcoal-900 mb-2">Waiting for Payment</h3>
                <p className="text-sm text-charcoal-500 mb-8 max-w-xs mx-auto">
                    We're waiting for Xendit to confirm your transaction. This usually takes a few seconds after payment.
                </p>
                
                {disabled ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                            {disabledMessage || "Please complete the required documents below to enable payment."}
                        </div>
                        <div className="w-full py-4 bg-charcoal-200 text-charcoal-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2">
                            Open Payment Page
                            <ExternalLink className="w-4 h-4" />
                        </div>
                    </div>
                ) : (
                    <a 
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-4 bg-charcoal-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-[0.98]"
                    >
                        Open Payment Page
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
            </div>
            
            <p className="text-[10px] text-center text-charcoal-400 uppercase tracking-widest">
                Updates automatically. Polled {seconds}s ago.
            </p>
        </div>
    )
}
