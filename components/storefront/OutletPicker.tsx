'use client'

import { MapPin, ChevronRight, Navigation } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface Outlet {
    id: string
    name: string
    address: string
}

interface OutletPickerProps {
    studioName: string
    outlets: Outlet[]
}

export default function OutletPicker({ studioName, outlets }: OutletPickerProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    return (
        <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-4 mb-20">
                <h2 className="text-4xl md:text-7xl font-serif text-charcoal tracking-tightest leading-tight">
                    Select your <span className="italic">branch</span>
                </h2>
                <p className="text-[11px] font-black text-charcoal/40 uppercase tracking-[0.4em]">
                    WHERE WOULD YOU LIKE TO PRACTICE TODAY?
                </p>
            </div>

            <div className="grid gap-6">
                {outlets.map((outlet) => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('outlet', outlet.id)
                    
                    return (
                        <Link
                            key={outlet.id}
                            href={`${pathname}?${params.toString()}`}
                            className="group bg-white p-10 rounded-[3rem] border border-border-grey shadow-tight hover:shadow-ambient hover:border-forest/20 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-8"
                        >
                            <div className="space-y-3">
                                <h3 className="text-3xl font-serif text-charcoal tracking-tight group-hover:text-forest transition-colors">
                                    {outlet.name}
                                </h3>
                                <div className="flex items-center gap-3 text-charcoal/40">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm font-bold">{outlet.address}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-charcoal/30 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                    View Schedule
                                </span>
                                <div className="w-16 h-16 bg-off-white rounded-full flex items-center justify-center text-charcoal group-hover:bg-forest group-hover:text-white transition-all shadow-inner group-hover:shadow-card">
                                    <ChevronRight className="w-6 h-6 transform group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            <div className="mt-20 pt-10 border-t border-border-grey/50 flex flex-col items-center gap-6">
                <div className="flex items-center gap-2 text-charcoal/20">
                    <Navigation className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Powered by Studio Vault</span>
                </div>
            </div>
        </div>
    )
}
