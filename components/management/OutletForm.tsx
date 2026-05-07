'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, MapPin, Phone, Mail, Globe, Check } from 'lucide-react'
import { createOutlet, updateOutlet } from '@/app/(dashboard)/studio/management/actions'
import { clsx } from 'clsx'

interface OutletFormProps {
    isOpen: boolean
    onClose: () => void
    studioId: string
    outlet?: any // If editing
}

export default function OutletForm({ isOpen, onClose, studioId, outlet }: OutletFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        formData.append('studioId', studioId)
        if (outlet) formData.append('outletId', outlet.id)

        try {
            const result = outlet 
                ? await updateOutlet(formData)
                : await createOutlet(formData)

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
            <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 sm:p-12">
                    <div className="flex items-center justify-between mb-10">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tightest font-atelier">
                                {outlet ? 'Edit Branch' : 'Add New Branch'}
                            </h2>
                            <p className="text-sm text-zinc-400 font-medium">Configure your branch details.</p>
                        </div>
                        <button onClick={onClose} className="p-3 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-2xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Branch Name</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-[#2D3282] transition-colors" />
                                    <input 
                                        name="name"
                                        defaultValue={outlet?.name}
                                        required
                                        placeholder="e.g. BGC High Street"
                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Full Address</label>
                                <div className="relative group">
                                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-[#2D3282] transition-colors" />
                                    <input 
                                        name="address"
                                        defaultValue={outlet?.address}
                                        required
                                        placeholder="Full address for Google Maps"
                                        className="w-full pl-12 pr-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Phone */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Contact Phone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-[#2D3282] transition-colors" />
                                        <input 
                                            name="phone"
                                            defaultValue={outlet?.phone}
                                            placeholder="+63 ..."
                                            className="w-full pl-12 pr-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Branch Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-[#2D3282] transition-colors" />
                                        <input 
                                            name="email"
                                            type="email"
                                            defaultValue={outlet?.email}
                                            placeholder="branch@studio.com"
                                            className="w-full pl-12 pr-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Publication Status</label>
                                    <select 
                                        name="status"
                                        defaultValue={outlet?.status || 'published'}
                                        className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none appearance-none"
                                    >
                                        <option value="published">Published (Live)</option>
                                        <option value="draft">Draft (Hidden)</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Storefront SEO (Slug) */}
                            <div className="space-y-4 pt-6 mt-6 border-t border-zinc-100">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2D3282] ml-4">Storefront Details</h3>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">URL Slug (e.g. /s/studio/slug)</label>
                                    <div className="relative group">
                                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-[#2D3282] transition-colors" />
                                        <input 
                                            name="slug"
                                            defaultValue={outlet?.slug}
                                            required
                                            placeholder="makati-central"
                                            className="w-full pl-12 pr-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-medium ml-4 uppercase tracking-widest">Only lowercase, numbers, and hyphens.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Hero Image URL</label>
                                        <input 
                                            name="hero_image_url"
                                            defaultValue={outlet?.hero_image_url}
                                            placeholder="https://..."
                                            className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Small Banner URL</label>
                                        <input 
                                            name="banner_url"
                                            defaultValue={outlet?.banner_url}
                                            placeholder="https://..."
                                            className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-[#2D3282]/5 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-8 py-5 bg-zinc-100 text-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all font-sans"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-[2] px-8 py-5 bg-[#2D3282] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-[#2D3282]/20 flex items-center justify-center gap-3 font-sans"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {outlet ? 'Update Branch' : 'Register Branch'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
