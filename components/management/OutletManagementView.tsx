'use client'

import { useState } from 'react'
import { Plus, MapPin, Phone, Mail, Trash2, Edit2, Loader2, Search, Building2, Globe } from 'lucide-react'
import OutletForm from './OutletForm'
import { deleteOutlet } from '@/app/(dashboard)/studio/management/actions'
import { clsx } from 'clsx'

interface Outlet {
    id: string
    name: string
    address: string
    phone: string | null
    email: string | null
    is_active: boolean
    created_at: string
}

interface OutletManagementViewProps {
    studioId: string
    initialOutlets: Outlet[]
}

export default function OutletManagementView({ studioId, initialOutlets }: OutletManagementViewProps) {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | undefined>(undefined)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const filteredOutlets = initialOutlets.filter(o => 
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.address.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleEdit = (outlet: Outlet) => {
        setSelectedOutlet(outlet)
        setIsFormOpen(true)
    }

    const handleAdd = () => {
        setSelectedOutlet(undefined)
        setIsFormOpen(true)
    }

    const handleDelete = async (outletId: string) => {
        if (!confirm('Are you sure you want to delete this branch? This will affect all schedules associated with it.')) return
        
        setIsDeleting(outletId)
        try {
            const result = await deleteOutlet(outletId)
            if (result.error) alert(result.error)
        } catch (err) {
            console.error('Error deleting outlet:', err)
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier text-6xl">Studio Branches</h1>
                    <p className="text-sm text-zinc-500 font-medium tracking-tight">Manage your branches, addresses, and contact details.</p>
                </div>
                <button 
                    onClick={handleAdd}
                    className="px-8 py-4 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#2D3282]/20 flex items-center gap-3"
                >
                    <Plus className="w-4 h-4" />
                    Register New Branch
                </button>
            </div>

            {/* Filter & Stats */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search locations by name or address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-zinc-100 rounded-2xl text-[13px] font-medium focus:ring-4 focus:ring-zinc-100/50 focus:border-zinc-200 transition-all shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-3 px-6 py-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Total Branches</span>
                    <span className="text-lg font-black text-zinc-900 leading-none">{initialOutlets.length}</span>
                </div>
            </div>

            {/* Outlets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredOutlets.map((outlet) => (
                    <div key={outlet.id} className="group relative bg-white p-10 border border-zinc-100 rounded-[3rem] shadow-sm hover:shadow-2xl hover:shadow-zinc-200/40 transition-all duration-500 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-6 mb-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-zinc-50 rounded-[1.5rem] flex items-center justify-center border border-zinc-100 group-hover:bg-[#2D3282] group-hover:text-white transition-all duration-500">
                                    <MapPin className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier leading-tight">{outlet.name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full",
                                            outlet.is_active ? "bg-forest animate-pulse" : "bg-zinc-300"
                                        )} />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                                            {outlet.is_active ? 'Live & Accepting' : 'Paused / Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleEdit(outlet)}
                                    className="p-3 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50 rounded-xl transition-all"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(outlet.id)}
                                    disabled={isDeleting === outlet.id}
                                    className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    {isDeleting === outlet.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4 pt-4 border-t border-zinc-50">
                            <div className="flex items-start gap-4">
                                <Globe className="w-4 h-4 text-zinc-300 mt-1 shrink-0" />
                                <p className="text-sm text-zinc-500 font-medium leading-relaxed">{outlet.address}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {outlet.phone && (
                                    <div className="flex items-center gap-3 text-zinc-400">
                                        <Phone className="w-3.5 h-3.5 opacity-60" />
                                        <span className="text-[11px] font-bold tracking-tight">{outlet.phone}</span>
                                    </div>
                                )}
                                {outlet.email && (
                                    <div className="flex items-center gap-3 text-zinc-400">
                                        <Mail className="w-3.5 h-3.5 opacity-60" />
                                        <span className="text-[11px] font-bold tracking-tight truncate">{outlet.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8">
                            <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-[0.2em]">Created {new Date(outlet.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}

                {initialOutlets.length === 0 && (
                    <div className="md:col-span-2 py-32 flex flex-col items-center justify-center bg-zinc-50/50 rounded-[3rem] border border-dashed border-zinc-200 text-center">
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl mb-8 border border-zinc-100">
                            <Building2 className="w-8 h-8 text-zinc-200" />
                        </div>
                        <h3 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">No locations registered</h3>
                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] mt-4 mb-10 leading-relaxed">Ready to expand? Register your first <br /> branch to start managing schedules there.</p>
                        <button 
                            onClick={handleAdd}
                            className="px-10 py-4 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-[#2D3282]/20"
                        >
                            Register First Location
                        </button>
                    </div>
                )}
            </div>

            <OutletForm 
                studioId={studioId}
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                outlet={selectedOutlet}
            />
        </div>
    )
}
