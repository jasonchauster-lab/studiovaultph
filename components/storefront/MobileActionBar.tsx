'use client'

import React, { memo } from 'react'
import { Calendar, CheckCircle2, Ticket } from 'lucide-react'
import clsx from 'clsx'

interface MobileActionBarProps {
    onBookNow?: () => void
    onMyBookings?: () => void
    onPackages?: () => void
    forceShow?: boolean
}

function MobileActionBar({ onBookNow, onMyBookings, onPackages, forceShow = false }: MobileActionBarProps) {
    return (
        <div 
            className={clsx(
                "fixed bottom-0 left-0 right-0 bg-charcoal-900 border-t border-white/10 z-[110] animate-in slide-in-from-bottom duration-500",
                !forceShow && "lg:hidden"
            )}
            style={{ 
                paddingBottom: 'env(safe-area-inset-bottom, 0px)' 
            }}
        >
            <div className="flex items-center justify-around h-20 px-4">
                <button 
                    onClick={onMyBookings || (() => window.location.href = '/customer/dashboard')}
                    className="flex flex-col items-center gap-1.5 group"
                >
                    <div className="p-1 rounded-lg group-active:scale-90 transition-transform">
                        <Calendar className="w-5 h-5 text-white/40 group-hover:text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">My Bookings</span>
                </button>

                <button 
                    onClick={onBookNow || (() => {
                        const el = document.getElementById('booking')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                    })}
                    className="flex flex-col items-center gap-1.5 group relative -top-4"
                >
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,255,255,0.2)] group-active:scale-95 transition-all">
                        <CheckCircle2 className="w-6 h-6 text-charcoal-900" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white mt-1">Book now</span>
                </button>

                <button 
                    onClick={onPackages || (() => {
                        const el = document.getElementById('pricing')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                    })}
                    className="flex flex-col items-center gap-1.5 group"
                >
                    <div className="p-1 rounded-lg group-active:scale-90 transition-transform">
                        <Ticket className="w-5 h-5 text-white/40 group-hover:text-white" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white">Packages</span>
                </button>
            </div>
        </div>
    )
}

export default memo(MobileActionBar)
