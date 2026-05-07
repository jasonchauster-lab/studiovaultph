'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, MapPin, Check } from 'lucide-react'
import { updateMemberOutlets } from '@/app/(dashboard)/studio/management/actions'
import { clsx } from 'clsx'

interface AssignOutletModalProps {
    isOpen: boolean
    onClose: () => void
    member: any
    outlets: any[]
}

export default function AssignOutletModal({ isOpen, onClose, member, outlets }: AssignOutletModalProps) {
    const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (member?.outlet_members) {
            setSelectedOutlets(member.outlet_members.map((om: any) => om.outlet_id))
        } else {
            setSelectedOutlets([])
        }
    }, [member])

    if (!isOpen || !member) return null

    const toggleOutlet = (id: string) => {
        setSelectedOutlets(prev => 
            prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
        )
    }

    const handleSave = async () => {
        setIsSubmitting(true)
        setError(null)
        try {
            const result = await updateMemberOutlets(member.id, selectedOutlets)
            if (result.error) {
                setError(result.error)
            } else {
                onClose()
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-zinc-900/60 animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 sm:p-10 text-center">
                    <div className="flex items-center justify-between mb-8">
                        <div className="text-left space-y-1">
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Assign Branches</h2>
                            <p className="text-xs text-zinc-500 font-medium">Where can {member.profile?.full_name} work?</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-hide mb-8">
                        {outlets.map((outlet) => {
                            const isSelected = selectedOutlets.includes(outlet.id)
                            return (
                                <button
                                    key={outlet.id}
                                    onClick={() => toggleOutlet(outlet.id)}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                                        isSelected 
                                            ? "bg-[#2D3282]/5 border-[#2D3282] text-[#2D3282]" 
                                            : "bg-zinc-50 border-transparent text-zinc-500 hover:bg-zinc-100"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            isSelected ? "bg-[#2D3282] text-white" : "bg-white text-zinc-300 shadow-sm"
                                        )}>
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="text-left font-bold text-sm tracking-tight">{outlet.name}</div>
                                    </div>
                                    {isSelected && <Check className="w-5 h-5" />}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-zinc-100 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="flex-[2] px-6 py-4 bg-[#2D3282] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-[#2D3282]/20 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {isSubmitting ? 'Saving...' : 'Confirm Assignments'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
